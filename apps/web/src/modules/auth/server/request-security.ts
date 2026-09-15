export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const expectedOrigin = `${forwardedProtocol || requestUrl.protocol.slice(0, -1)}://${forwardedHost || requestUrl.host}`;
  return origin === expectedOrigin;
}
