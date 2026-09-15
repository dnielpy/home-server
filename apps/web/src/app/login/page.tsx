import type { Metadata } from "next";
import { LoginForm } from "@/src/modules/auth/components/login-form";
import { isSafeNextPath } from "@/src/modules/auth/server/session";

export const metadata: Metadata = {
  title: "Iniciar sesión · Home Server",
  description: "Accede al panel de Home Server.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = isSafeNextPath(requestedNext) ? requestedNext! : "/";
  return <LoginForm nextPath={nextPath} />;
}
