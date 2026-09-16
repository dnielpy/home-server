import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RestErrorHandler } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import { userDtoSchema, type UserDto } from "@home-server/contracts/users";

export const SESSION_COOKIE = "home_server_session";

export function toBrowserUser(user: UserDto): UserDto {
  return {
    ...user,
    photoUrl: user.photoUrl ? `/api/users/${user.id}/photo?v=${encodeURIComponent(user.updatedAt)}` : null,
  };
}

export async function getSessionToken() {
  try {
    return (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string) {
  const sessionToken = token ?? (await getSessionToken());
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
  return fetch(new URL(path, process.env.API_URL).toString(), { ...init, headers, cache: "no-store" });
}

export async function authenticatedApiRequest<T>(
  path: string,
  parse: (value: unknown) => T,
  init: RequestInit = {},
): Promise<Result<T>> {
  const method = init.method ?? "GET";
  const request = { method, url: new URL(path, process.env.API_URL).toString() };
  try {
    const response = await apiFetch(path, { ...init, method });
    const result = await RestErrorHandler.handleResponse<unknown>(response, request);
    if (!result.success) return result;
    try {
      return { success: true, data: parse(result.data) };
    } catch (error) {
      return RestErrorHandler.handleGenericError<T>(error);
    }
  } catch (error) {
    return RestErrorHandler.handleGenericError<T>(error);
  }
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
