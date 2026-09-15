"use client";

import type { LoginProfile } from "@home-server/contracts/users";
import { ArrowLeft, Server } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

type LoginFormProps = {
  nextPath: string;
  profiles: LoginProfile[];
};

function ProfileAvatar({ profile, selected = false }: { profile: LoginProfile; selected?: boolean }) {
  const initials = profile.name.trim().slice(0, 2).toUpperCase() || "?";
  const color = ["from-[#d84c59] to-[#8f2031]", "from-[#538cc6] to-[#1d4775]", "from-[#9773c8] to-[#4d3474]", "from-[#d39a50] to-[#77451d}"][profile.name.codePointAt(0)! % 4];

  return profile.photoUrl ? (
    <Image
      unoptimized
      src={profile.photoUrl}
      alt=""
      width={176}
      height={176}
      className={`aspect-square w-full object-cover transition duration-200 ${selected ? "ring-2 ring-white ring-offset-4 ring-offset-[#141414]" : ""}`}
    />
  ) : (
    <span className={`grid aspect-square w-full place-items-center bg-gradient-to-br ${color} text-4xl font-medium text-white transition duration-200 ${selected ? "ring-2 ring-white ring-offset-4 ring-offset-[#141414]" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function LoginForm({ nextPath, profiles }: LoginFormProps) {
  const router = useRouter();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [selectedProfile, setSelectedProfile] = useState<LoginProfile | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (selectedProfile) passwordInput.current?.focus();
  }, [selectedProfile]);

  const chooseProfile = (profile: LoginProfile) => {
    setSelectedProfile(profile);
    setName(profile.name);
    setPassword("");
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo iniciar sesión.");
      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
      setPassword("");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141414] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.13),transparent_42%)]" />
      <header className="relative flex h-16 items-center px-5 sm:h-20 sm:px-10 lg:px-[4vw]">
        <span className="flex items-center gap-2.5 text-[#e50914]">
          <Server aria-hidden="true" className="size-6 fill-current sm:size-7" strokeWidth={2.5} />
          <span className="text-xl font-black uppercase tracking-[-0.08em] sm:text-2xl">Home Server</span>
        </span>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-5 pb-20 sm:min-h-[calc(100vh-5rem)] sm:px-10">
        {!selectedProfile ? (
          <section className="w-full text-center" aria-labelledby="profiles-title">
            <h1 id="profiles-title" className="text-3xl font-medium tracking-tight sm:text-5xl">¿Quién está usando Home Server?</h1>
            {profiles.length > 0 ? (
              <div className="mx-auto mt-9 grid max-w-3xl grid-cols-2 justify-center gap-x-4 gap-y-7 sm:mt-12 sm:grid-cols-3 sm:gap-x-7 md:grid-cols-4">
                {profiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => chooseProfile(profile)} className="group min-w-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#141414]">
                    <span className="block overflow-hidden rounded-sm bg-[#333] shadow-lg transition duration-200 group-hover:scale-[1.035] group-hover:ring-2 group-hover:ring-white">
                      <ProfileAvatar profile={profile} />
                    </span>
                    <span className="mt-3 block truncate text-sm text-[#808080] transition-colors group-hover:text-white sm:mt-4 sm:text-base">{profile.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mx-auto mt-9 max-w-sm text-left">
                <p className="text-center text-sm text-[#b3b3b3]">Introduce tus datos para acceder.</p>
                <form className="mt-5 space-y-3" onSubmit={(event) => void submit(event)}>
                  <input autoFocus required autoComplete="username" value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Usuario" className="h-12 w-full border border-[#555] bg-[#333] px-4 text-white outline-none placeholder:text-[#8c8c8c] focus:border-white" />
                  <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Contraseña" className="h-12 w-full border border-[#555] bg-[#333] px-4 text-white outline-none placeholder:text-[#8c8c8c] focus:border-white" />
                  {error && <p role="alert" className="text-sm text-[#e87c03]">{error}</p>}
                  <button disabled={pending} type="submit" className="h-11 w-full bg-[#e50914] text-sm font-bold transition hover:bg-[#f6121d] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Entrando…" : "Entrar"}</button>
                </form>
              </div>
            )}
          </section>
        ) : (
          <section className="w-full max-w-sm text-center" aria-labelledby="password-title">
            <button type="button" onClick={() => { setSelectedProfile(null); setPassword(""); setError(null); }} className="mb-8 inline-flex items-center gap-2 text-sm text-[#b3b3b3] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ArrowLeft aria-hidden="true" className="size-4" /> Cambiar perfil
            </button>
            <div className="mx-auto w-32 overflow-hidden rounded-sm bg-[#333] shadow-2xl sm:w-36">
              <ProfileAvatar profile={selectedProfile} selected />
            </div>
            <h1 id="password-title" className="mt-6 text-3xl font-medium tracking-tight">Hola, {selectedProfile.name}</h1>
            <p className="mt-2 text-sm text-[#b3b3b3]">Introduce la contraseña de este perfil.</p>
            <form className="mx-auto mt-7 max-w-[18rem] space-y-3" onSubmit={(event) => void submit(event)}>
              <label className="sr-only" htmlFor="profile-password">Contraseña</label>
              <input id="profile-password" ref={passwordInput} required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Contraseña" className="h-9 w-full rounded-md border border-[#555] bg-[#333] px-3 text-sm text-white outline-none placeholder:text-[#8c8c8c] focus:border-white focus:ring-1 focus:ring-white" />
              {error && <p role="alert" className="text-left text-sm text-[#e87c03]">{error}</p>}
              <button disabled={pending} type="submit" className="h-9 w-full rounded-md bg-[#e50914] text-sm font-bold transition hover:bg-[#f6121d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Entrando…" : "Entrar"}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
