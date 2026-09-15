import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userDtoSchema, type UserDto } from "@home-server/contracts/users";

export const SESSION_COOKIE = "home_server_session";

export function toBrowserUser(user: UserDto): UserDto {
  return {
    ...user,
    photoUrl: user.photoUrl
      ? `/api/users/${user.id}/photo?v=${encodeURIComponent(user.updatedAt)}`
      : null,
  };
}

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string) {
  const sessionToken = token ?? await getSessionToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
  return fetch(new URL(path, process.env.API_URL).toString(), { ...init, headers, cache: "no-store" });
}

export async function getCurrentUser(): Promise<UserDto | null> {
  const response = await apiFetch("/v1/auth/me");
  if (!response.ok) return null;
  const parsed = userDtoSchema.safeParse(await response.json());
  return parsed.success ? toBrowserUser(parsed.data) : null;
}

export async function requireCurrentUser(nextPath = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdminUser(nextPath = "/users") {
  const user = await requireCurrentUser(nextPath);
  if (!user.isAdmin) redirect("/");
  return user;
}

export function isSafeNextPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api/"));
}
