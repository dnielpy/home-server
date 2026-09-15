"use client";

import { Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    <main className="min-h-screen bg-[#141414] text-white">
      <header className="flex h-20 items-center px-6 sm:h-24 sm:px-12 lg:px-[4vw]">
        <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-lg sm:size-11"><Server className="size-5 sm:size-6" /></span>
        <span className="ml-2 text-xl font-bold tracking-[-0.07em] sm:text-2xl">Home Server</span>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center justify-center px-5 pb-20 sm:px-8">
        <section className="w-full rounded-2xl border border-white/10 bg-[#202020] p-7 shadow-2xl sm:p-9" aria-labelledby="login-title">
          <p className="text-sm font-medium text-blue-300">Panel de control</p>
          <h1 id="login-title" className="mt-2 text-3xl font-semibold tracking-tight">Inicia sesión</h1>
          <p className="mt-2 text-sm text-white/60">Accede a tu servidor doméstico.</p>
          <form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm font-medium">
              Nombre de usuario
              <input autoFocus required autoComplete="username" value={name} onChange={(event) => setName(event.currentTarget.value)} className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-[#141414] px-3.5 text-white outline-none placeholder:text-white/35 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25" />
            </label>
            <label className="block text-sm font-medium">
              Contraseña
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-[#141414] px-3.5 text-white outline-none placeholder:text-white/35 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25" />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button disabled={pending} type="submit" className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">{pending ? "Entrando…" : "Entrar"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
