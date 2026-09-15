import "server-only";

import { getSessionToken } from "@/src/modules/auth/server/session";

const REQUEST_HEADERS = ["accept", "content-type", "content-length", "range", "x-file-name", "x-folder-name"];
const RESPONSE_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-length",
  "content-range",
  "content-type",
];

export async function proxyLocalTube(request: Request, apiPath: string, includeBody = false) {
  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  const token = await getSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    cache: "no-store",
    ...(includeBody ? { body: request.body, duplex: "half" as const } : {}),
  };
  const upstream = await fetch(new URL(apiPath, process.env.API_URL), init);
  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
