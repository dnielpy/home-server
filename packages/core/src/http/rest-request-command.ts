import { Logger } from "../logger";
import type { Result } from "../types";
import { BaseRestCommand } from "./base-rest-command";
import { RestErrorHandler } from "./error-handler";
import type { RestCommand } from "./rest-command";
import {
  createRequestContext,
  getRestConfig,
  redactSensitiveHeaders,
  type RequestContext,
  type RestFactoryConfig,
} from "./rest-config";
import type { NextFetchRequestConfig, NextRequestInit } from "./types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface BuiltRequest {
  url?: string;
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

const FALLBACK_ERROR_HOST = "http://error.invalid";
const hasJsonContentType = (headers: Record<string, string>): boolean =>
  Object.entries(headers).some(
    ([name, value]) => name.toLowerCase() === "content-type" && value.includes("application/json"),
  );

export class RestRequestCommand<T = unknown, V = unknown> extends BaseRestCommand<T> implements RestCommand<T, V> {
  public constructor(
    private readonly endpoint: string,
    private readonly method: HttpMethod,
    private readonly headers: Record<string, string> = {},
    private readonly buildRequest?: (variables?: V) => BuiltRequest,
    private readonly parse?: (raw: unknown) => T,
    private readonly next?: NextFetchRequestConfig,
    private readonly cache?: RequestCache,
  ) {
    super();
  }

  public async execute(variables?: V): Promise<Result<T>> {
    const config = getRestConfig();
    let context: RequestContext | undefined;
    try {
      const built = this.buildRequest?.(variables);
      const isFormData = typeof FormData !== "undefined" && built?.body instanceof FormData;
      const baseHeaders = {
        ...(this.method === "GET" || isFormData ? {} : { "Content-Type": "application/json" }),
        ...config.defaultHeaders,
        ...this.headers,
      };
      const baseUrl = built?.url ?? config.baseUrl ?? process.env.API_URL;
      if (!baseUrl && !/^https?:\/\//.test(this.endpoint)) throw new Error("API_URL no está configurado.");
      let url = new URL(this.endpoint, baseUrl);

      context = createRequestContext({
        method: this.method,
        url,
        endpoint: this.endpoint,
        headers: { ...baseHeaders, ...built?.headers },
        body: built?.body,
      });
      const patch = config.beforeRequest ? await this.runBeforeRequest(config.beforeRequest, context) : undefined;
      if (patch?.url && !built?.url) {
        const replaced = new URL(patch.url, url);
        url.searchParams.forEach((value, key) => {
          if (!replaced.searchParams.has(key)) replaced.searchParams.set(key, value);
        });
        url = replaced;
      }
      for (const [key, value] of Object.entries(built?.query ?? {})) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
      const headers = { ...baseHeaders, ...patch?.headers, ...built?.headers };
      context = createRequestContext({ method: this.method, url, endpoint: this.endpoint, headers, body: built?.body });
      const credentials = built?.credentials ?? config.defaultCredentials;
      const init: NextRequestInit = {
        method: this.method,
        headers,
        cache: this.cache ?? config.defaultCache ?? "no-cache",
        next: this.next ?? config.defaultNext,
        ...(credentials ? { credentials } : {}),
        ...(this.method !== "GET" && built?.body !== undefined
          ? {
              body: isFormData
                ? (built.body as FormData)
                : hasJsonContentType(headers)
                  ? JSON.stringify(built.body)
                  : (built.body as BodyInit),
            }
          : {}),
      };
      Logger.log(`[http] ${this.method} ${url.toString()}`, { headers: redactSensitiveHeaders(headers) });
      const response = await fetch(url, init);
      if (config.afterResponse) await this.runAfterResponse(config.afterResponse, context, response.clone());
      const handled = await RestErrorHandler.handleResponse<unknown>(response, {
        method: this.method,
        url: url.toString(),
        body: built?.body,
      });
      if (!handled.success) {
        const result = this.handleAuthError(handled as Result<T>);
        await this.runOnError(config.onError, context, result);
        return result;
      }
      if (!this.parse) return handled as Result<T>;
      try {
        return { success: true, data: this.parse(handled.data) };
      } catch (error) {
        const result = RestErrorHandler.handleGenericError<T>(error);
        await this.runOnError(config.onError, context, result);
        return result;
      }
    } catch (error) {
      const result = RestErrorHandler.handleGenericError<T>(error);
      await this.runOnError(config.onError, context, result);
      return result;
    }
  }

  private async runBeforeRequest(
    hook: NonNullable<RestFactoryConfig["beforeRequest"]>,
    context: RequestContext,
  ): Promise<Awaited<ReturnType<NonNullable<RestFactoryConfig["beforeRequest"]>>>> {
    try {
      return await hook(context);
    } catch (error) {
      Logger.logGenericError(error, { message: "[http] beforeRequest hook failed; continuing without patch." });
      return undefined;
    }
  }

  private async runAfterResponse(
    hook: NonNullable<RestFactoryConfig["afterResponse"]>,
    context: RequestContext,
    response: Response,
  ): Promise<void> {
    try {
      await hook(context, response);
    } catch (error) {
      Logger.logGenericError(error, { message: "[http] afterResponse hook failed; ignoring." });
    }
  }

  private async runOnError(
    hook: RestFactoryConfig["onError"],
    context: RequestContext | undefined,
    result: Result<T>,
  ): Promise<void> {
    if (!hook) return;
    const safeContext =
      context ??
      createRequestContext({
        method: this.method,
        url: new URL(this.endpoint, FALLBACK_ERROR_HOST),
        endpoint: this.endpoint,
        headers: this.headers,
      });
    try {
      await hook(safeContext, result as Result<unknown>);
    } catch (error) {
      Logger.logGenericError(error, { message: "[http] onError hook failed; ignoring." });
    }
  }
}
