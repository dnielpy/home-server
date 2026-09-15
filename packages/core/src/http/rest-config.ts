import { Logger } from "../logger";
import type { Result } from "../types";
import type { HttpMethod } from "./rest-request-command";
import type { NextFetchRequestConfig } from "./types";

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization", "proxy-authorization", "cookie", "set-cookie", "x-api-key", "x-auth-token", "authentication-info",
]);
const REDACTED_VALUE = "[REDACTED]";
const GLOBAL_KEY = Symbol.for("@home-server/core/http/rest-config");

export const isRestProduction = (): boolean => process.env.NODE_ENV === "production";

export class RestFactoryConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RestFactoryConfigError";
  }
}

export interface RequestContext {
  readonly method: HttpMethod;
  readonly url: URL;
  readonly endpoint: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
  getUnredactedHeaders(): Record<string, string>;
}

export interface RequestPatch { headers?: Record<string, string>; url?: string; }

export interface RestFactoryConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  defaultCache?: RequestCache;
  defaultNext?: NextFetchRequestConfig;
  defaultCredentials?: RequestCredentials;
  beforeRequest?(context: RequestContext): Promise<RequestPatch | undefined>;
  afterResponse?(context: RequestContext, response: Response): Promise<void>;
  onError?(context: RequestContext, result: Result<unknown>): Promise<void>;
}

interface RestConfigStore { config: RestFactoryConfig; configured: boolean; unredactedWarningEmitted: boolean; }

const getStore = (): RestConfigStore => {
  const globalStore = globalThis as Record<symbol, unknown>;
  if (!globalStore[GLOBAL_KEY]) {
    globalStore[GLOBAL_KEY] = { config: {}, configured: false, unredactedWarningEmitted: false } satisfies RestConfigStore;
  }
  return globalStore[GLOBAL_KEY] as RestConfigStore;
};

const validateDefaultHeaders = (headers: Record<string, string> | undefined): void => {
  if (!headers) return;
  for (const name of Object.keys(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
      throw new RestFactoryConfigError(`defaultHeaders does not accept \"${name}\"; use beforeRequest instead.`);
    }
  }
};

export const setRestConfig = (config: RestFactoryConfig): void => {
  const store = getStore();
  if (store.configured && isRestProduction()) throw new RestFactoryConfigError("RestFactory is already configured in production.");
  validateDefaultHeaders(config.defaultHeaders);
  store.config = config;
  store.configured = true;
};

export const getRestConfig = (): RestFactoryConfig => getStore().config;

export const resetRestConfig = (): void => {
  if (isRestProduction()) throw new RestFactoryConfigError("RestFactory.reset() is unavailable in production.");
  const store = getStore();
  store.config = {};
  store.configured = false;
  store.unredactedWarningEmitted = false;
};

export const redactSensitiveHeaders = (headers: Record<string, string>): Record<string, string> => Object.fromEntries(
  Object.entries(headers).map(([name, value]) => [name, SENSITIVE_HEADER_NAMES.has(name.toLowerCase()) ? REDACTED_VALUE : value]),
);

export const createRequestContext = (input: {
  method: HttpMethod; url: URL; endpoint: string; headers: Record<string, string>; body?: unknown;
}): RequestContext => ({
  method: input.method,
  url: input.url,
  endpoint: input.endpoint,
  headers: redactSensitiveHeaders(input.headers),
  body: input.body,
  getUnredactedHeaders: () => {
    const store = getStore();
    if (!store.unredactedWarningEmitted) {
      store.unredactedWarningEmitted = true;
      Logger.log("[rest-config] Unredacted request headers were requested from a hook.");
    }
    return { ...input.headers };
  },
});
