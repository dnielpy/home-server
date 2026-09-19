"use client";

import { Pause, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const PHASE_DURATION_MS = 8_000;
const PARALLEL_TRANSFERS = 4;
const UPLOAD_BYTES = 16 * 1024 * 1024;
const UPLOAD_BODY = new Blob([new Uint8Array(UPLOAD_BYTES).fill(0xa5)], {
  type: "application/octet-stream",
});

type Phase = "idle" | "baseline" | "download" | "upload" | "complete" | "paused" | "error";
type Results = {
  download: number;
  upload: number;
  baselinePing: number | null;
  downloadPing: number | null;
  uploadPing: number | null;
};

const initialResults: Results = {
  download: 0,
  upload: 0,
  baselinePing: null,
  downloadPing: null,
  uploadPing: null,
};

const median = (samples: number[]) => {
  if (!samples.length) return null;
  const ordered = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

const formatSpeed = (value: number) => (Number.isFinite(value) ? value.toFixed(value >= 100 ? 0 : 1) : "0");
const formatPing = (value: number | null) => (value === null ? null : Math.round(value));

const abortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export const FastView = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [speed, setSpeed] = useState(0);
  const [results, setResults] = useState<Results>(initialResults);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string | null>(null);

  const releaseSession = useCallback(async (sessionId: string) => {
    await fetch(`/api/fast/sessions?session=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const ping = useCallback(async (sessionId: string, signal: AbortSignal) => {
    const startedAt = performance.now();
    const response = await fetch(`/api/fast/ping?session=${encodeURIComponent(sessionId)}`, {
      method: "HEAD",
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("El servidor no respondió a la prueba de latencia.");
    return performance.now() - startedAt;
  }, []);

  const samplePings = useCallback(
    async (sessionId: string, signal: AbortSignal, until?: number) => {
      const samples: number[] = [];
      while (!until || performance.now() < until) {
        samples.push(await ping(sessionId, signal));
        if (!until && samples.length >= 5) break;
        if (until) await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
      }
      return median(samples);
    },
    [ping],
  );

  const measureTransfer = useCallback(
    async (
      kind: "download" | "upload",
      sessionId: string,
      signal: AbortSignal,
    ) => {
      let bytes = 0;
      const startedAt = performance.now();
      const until = startedAt + PHASE_DURATION_MS;
      setSpeed(0);
      const addBytes = (amount: number) => {
        bytes += amount;
      };
      const update = window.setInterval(() => {
        setSpeed((bytes * 8) / Math.max(performance.now() - startedAt, 1) / 1_000);
      }, 150);

      const download = async () => {
        while (performance.now() < until && !signal.aborted) {
          const response = await fetch(`/api/fast/download?session=${encodeURIComponent(sessionId)}`, {
            cache: "no-store",
            signal,
          });
          if (!response.ok || !response.body) throw new Error("No se pudo descargar datos de prueba.");
          const reader = response.body.getReader();
          while (performance.now() < until && !signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            addBytes(value.byteLength);
          }
          await reader.cancel().catch(() => undefined);
        }
      };

      const upload = async () => {
        while (performance.now() < until && !signal.aborted) {
          const response = await fetch(`/api/fast/upload?session=${encodeURIComponent(sessionId)}`, {
            method: "POST",
            body: UPLOAD_BODY,
            cache: "no-store",
            headers: { "Content-Type": "application/octet-stream" },
            signal,
          });
          if (!response.ok) throw new Error("No se pudo subir datos de prueba.");
          const uploadedBytes = Number(response.headers.get("x-fast-bytes"));
          if (!Number.isFinite(uploadedBytes) || uploadedBytes <= 0) {
            throw new Error("El servidor no confirmó los datos de prueba subidos.");
          }
          addBytes(uploadedBytes);
        }
      };

      try {
        await Promise.all(
          Array.from({ length: PARALLEL_TRANSFERS }, () => (kind === "download" ? download() : upload())),
        );
      } finally {
        window.clearInterval(update);
      }
      const measured = (bytes * 8) / Math.max(performance.now() - startedAt, 1) / 1_000;
      setSpeed(measured);
      return measured;
    },
    [],
  );

  const start = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setResults(initialResults);
    setSpeed(0);
    setShowDetails(false);
    setError(null);
    setPhase("idle");

    let sessionId: string | null = null;
    try {
      const response = await fetch("/api/fast/sessions", { method: "POST", cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { session?: { id?: string }; error?: string } | null;
      if (!response.ok || !data?.session?.id) throw new Error(data?.error || "No se pudo iniciar la prueba.");
      sessionId = data.session.id;
      sessionRef.current = sessionId;

      setPhase("download");
      const downloadUntil = performance.now() + PHASE_DURATION_MS;
      const [download, downloadPing] = await Promise.all([
        measureTransfer("download", sessionId, controller.signal),
        samplePings(sessionId, controller.signal, downloadUntil),
      ]);
      setResults((current) => ({ ...current, download, downloadPing }));
      setPhase("complete");
    } catch (cause) {
      if (controller.signal.aborted || abortError(cause)) {
        setPhase("paused");
      } else {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "No se pudo completar la prueba.");
      }
    } finally {
      if (sessionId) {
        sessionRef.current = null;
        void releaseSession(sessionId);
      }
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [measureTransfer, releaseSession, samplePings]);

  const showMoreInfo = useCallback(async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setShowDetails(true);
    setError(null);

    let sessionId: string | null = null;
    try {
      const response = await fetch("/api/fast/sessions", { method: "POST", cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { session?: { id?: string }; error?: string } | null;
      if (!response.ok || !data?.session?.id) throw new Error(data?.error || "No se pudo ampliar la prueba.");
      sessionId = data.session.id;
      sessionRef.current = sessionId;

      setPhase("baseline");
      const baselinePing = await samplePings(sessionId, controller.signal);
      setResults((current) => ({ ...current, baselinePing }));

      setPhase("upload");
      const uploadUntil = performance.now() + PHASE_DURATION_MS;
      const [upload, uploadPing] = await Promise.all([
        measureTransfer("upload", sessionId, controller.signal),
        samplePings(sessionId, controller.signal, uploadUntil),
      ]);
      setResults((current) => ({ ...current, upload, uploadPing }));
      setPhase("complete");
    } catch (cause) {
      if (controller.signal.aborted || abortError(cause)) {
        setPhase("paused");
      } else {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "No se pudo ampliar la prueba.");
      }
    } finally {
      if (sessionId) {
        sessionRef.current = null;
        void releaseSession(sessionId);
      }
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [measureTransfer, releaseSession, samplePings]);

  useEffect(() => {
    const startTimer = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(startTimer);
      controllerRef.current?.abort();
      if (sessionRef.current) void releaseSession(sessionRef.current);
    };
  }, [releaseSession, start]);

  const running = phase === "baseline" || phase === "download" || phase === "upload";
  const primarySpeed = phase === "download" ? speed : results.download;
  const hasDownloadResult = phase === "complete" || phase === "paused" || phase === "error" || showDetails;

  return (
    <section className="fast-view -mx-4 -my-6 flex min-h-[calc(100svh-4rem)] flex-col items-center overflow-hidden bg-white px-5 pt-[clamp(1.5rem,2.5vw,2.25rem)] pb-10 font-[Arial,Helvetica,sans-serif] text-[#231f20] sm:-mx-6 sm:px-8 lg:-mx-8 lg:-my-8">
      <div className="flex flex-col items-center" aria-label="Home Server Fast">
        <HomeServerMark />
        <span className="mt-[-0.2rem] text-[clamp(2rem,3vw,3.1rem)] leading-none font-black tracking-[-0.09em]">
          FAST
        </span>
      </div>

      <div className="mt-[clamp(1.25rem,3vh,2.5rem)] flex w-full flex-col items-center">
        {hasDownloadResult ? (
          <h1 className="mb-[clamp(1rem,2.5vh,2.2rem)] text-center text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight font-bold tracking-[-0.03em]">
            Tu velocidad es de
          </h1>
        ) : null}

        <div aria-live="polite" className="flex items-center justify-center text-[#231f20]">
          <span
            className={`text-[clamp(4.25rem,9.5vw,8.75rem)] leading-[0.8] tracking-[-0.025em] tabular-nums ${
              hasDownloadResult ? "font-bold" : "font-[300] text-[#d2d2d2]"
            }`}
          >
            {formatSpeed(primarySpeed)}
          </span>
          <span
            className={`mb-[clamp(0.75rem,1.6vw,1.5rem)] ml-[clamp(0.6rem,1.35vw,1.1rem)] text-[clamp(1.55rem,2.6vw,3rem)] leading-none font-bold tracking-[-0.06em] ${
              hasDownloadResult ? "" : "text-[#d2d2d2]"
            }`}
          >
            Mbps
          </span>
          {running ? (
            <button
              aria-label="Pausar prueba"
              className="relative ml-[clamp(0.65rem,1.5vw,1.4rem)] grid size-[clamp(3rem,3.5vw,3.7rem)] place-items-center rounded-full bg-white text-[#d1d1d1] transition-colors hover:bg-neutral-50"
              onClick={() => controllerRef.current?.abort()}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="fast-pause-ring pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 100 100"
              >
                <circle cx="50" cy="50" r="47" fill="none" stroke="#d6d6d6" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="#ffa000"
                  strokeDasharray="75 227"
                  strokeWidth="3"
                />
              </svg>
              <Pause aria-hidden="true" className="relative z-10 size-[45%] fill-current" />
            </button>
          ) : hasDownloadResult ? (
            <button
              aria-label="Repetir prueba"
              className="ml-[clamp(0.65rem,1.5vw,1.4rem)] grid size-[clamp(3rem,3.5vw,3.7rem)] place-items-center rounded-full border-[2px] border-[#22b734] bg-white text-[#231f20] transition-colors hover:bg-[#f4fff4]"
              onClick={() => void start()}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-[48%] stroke-[3]" />
            </button>
          ) : null}
        </div>

        {phase === "complete" && !showDetails ? (
          <button
            className="mt-[clamp(2rem,6vh,4rem)] rounded-[0.5rem] border border-[#898989] bg-white px-5 py-1.5 text-[clamp(0.9rem,1.15vw,1.15rem)] leading-none font-normal text-[#6f6f6f] transition-colors hover:bg-neutral-50"
            onClick={() => void showMoreInfo()}
            type="button"
          >
            Mostrar más información
          </button>
        ) : null}

        {showDetails ? (
          <Details
            results={results}
            loading={running}
            uploadSpeed={phase === "upload" ? speed : results.upload}
            uploading={phase === "upload"}
          />
        ) : null}
        {error ? <p className="mt-6 max-w-md text-center text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
};

const Details = ({
  results,
  loading,
  uploadSpeed,
  uploading,
}: {
  results: Results;
  loading: boolean;
  uploadSpeed: number;
  uploading: boolean;
}) => (
  <dl className="mt-[clamp(2.5rem,7vh,5rem)] grid w-full max-w-[52rem] gap-x-[clamp(2rem,8vw,8rem)] gap-y-8 text-left sm:grid-cols-[1.2fr_0.8fr]">
    <div>
      <dt className="border-b border-[#d4d4d4] pb-1 text-[clamp(1.25rem,2vw,2rem)] font-bold">Latencia</dt>
      <dd className="mt-2 grid grid-cols-3 gap-5">
        <Latency label="Base" value={formatPing(results.baselinePing)} />
        <Latency label="Descarga" value={formatPing(results.downloadPing)} />
        <Latency label="Subida" value={formatPing(results.uploadPing)} muted={loading && results.uploadPing === null} />
      </dd>
    </div>
    <div>
      <dt className="border-b border-[#d4d4d4] pb-1 text-[clamp(1.25rem,2vw,2rem)] font-bold">Carga</dt>
      <dd className={`mt-2 ${loading && !uploading ? "text-[#d2d2d2]" : ""}`}>
        <span className="block text-lg text-[#777]">Velocidad</span>
        <span className="text-[clamp(2.5rem,4vw,4.5rem)] leading-none font-bold tabular-nums">
          {formatSpeed(uploadSpeed)}
        </span>
        <span className="ml-1 text-base font-bold">Mbps</span>
      </dd>
    </div>
  </dl>
);

const Latency = ({ label, value, muted = false }: { label: string; value: number | null; muted?: boolean }) => (
  <div className={muted ? "text-[#d2d2d2]" : ""}>
    <span className="block text-base text-[#777]">{label}</span>
    <span className="inline-flex items-baseline whitespace-nowrap">
      <span className="text-[clamp(2rem,3.5vw,3.75rem)] leading-none font-bold tabular-nums">{value ?? "—"}</span>
      {value !== null ? <span className="ml-1 text-base font-bold">ms</span> : null}
    </span>
  </div>
);

const HomeServerMark = () => (
  <svg
    aria-hidden="true"
    className="h-[clamp(3.8rem,5.2vw,5.2rem)] w-[clamp(5.4rem,7.8vw,7.8rem)]"
    viewBox="0 0 300 210"
  >
    <path d="M14 104 145 7l131 97-25 31-106-79-106 79Z" fill="#0875f9" />
    <path d="M56 101h188v95c0 7-6 12-13 12H69c-7 0-13-5-13-12Z" fill="#0875f9" />
    <rect x="91" y="112" width="108" height="42" rx="12" fill="white" />
    <path d="m133 119 38 14-38 14Z" fill="#0875f9" />
    <rect x="77" y="164" width="146" height="27" rx="10" fill="white" />
    <circle cx="96" cy="177.5" r="7" fill="#0875f9" />
    <rect x="127" y="171" width="75" height="13" rx="6.5" fill="#0875f9" />
  </svg>
);
