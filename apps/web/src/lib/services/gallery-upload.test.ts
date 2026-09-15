import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadGalleryFile } from "./gallery-upload";

class FakeXmlHttpRequest {
  static latest: FakeXmlHttpRequest | undefined;
  readonly upload = { onprogress: null as ((event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null };
  readonly headers = new Map<string, string>();
  readonly open = vi.fn();
  readonly send = vi.fn();
  status = 0;
  responseText = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  public constructor() {
    FakeXmlHttpRequest.latest = this;
  }

  public setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  public abort() {
    this.onabort?.();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeXmlHttpRequest.latest = undefined;
});

describe("Gallery upload service", () => {
  it("encapsula XHR, destino, progreso y respuesta tipada", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXmlHttpRequest);
    const progress = vi.fn();
    const file = new File(["contenido"], "foto verano.jpg", { type: "image/jpeg" });
    const task = uploadGalleryFile({ file, folderName: "Vacaciones", onProgress: progress });
    const request = FakeXmlHttpRequest.latest!;

    request.upload.onprogress?.({
      lengthComputable: true,
      loaded: 5,
      total: 10,
    } as ProgressEvent<XMLHttpRequestEventTarget>);
    request.status = 201;
    request.responseText = JSON.stringify({
      fileName: "foto verano (1).jpg",
      folderName: "Vacaciones",
      size: file.size,
    });
    request.onload?.();

    await expect(task.promise).resolves.toMatchObject({ fileName: "foto verano (1).jpg" });
    expect(request.open).toHaveBeenCalledWith("POST", "/api/gallery/uploads");
    expect(request.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(request.headers.get("X-File-Name")).toBe("foto%20verano.jpg");
    expect(request.headers.get("X-Folder-Name")).toBe("Vacaciones");
    expect(progress).toHaveBeenCalledWith(50);
  });
});
