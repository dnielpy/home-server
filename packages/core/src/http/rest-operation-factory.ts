import type { RestCommand } from "./rest-command";
import { resetRestConfig, setRestConfig, type RestFactoryConfig } from "./rest-config";
import { type BuiltRequest, type HttpMethod, RestRequestCommand } from "./rest-request-command";
import type { NextFetchRequestConfig } from "./types";

export interface RestCommandOptions<T, V> {
  headers?: Record<string, string>;
  buildRequest?: (variables?: V) => BuiltRequest;
  parse?: (raw: unknown) => T;
  next?: NextFetchRequestConfig;
  cache?: RequestCache;
}

export class RestFactory {
  public static configure(config: RestFactoryConfig): void {
    setRestConfig(config);
  }
  public static reset(): void {
    resetRestConfig();
  }
  public static createGet<T = unknown, V = unknown>(
    endpoint: string,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return this.create(endpoint, "GET", options);
  }
  public static createPost<T = unknown, V = unknown>(
    endpoint: string,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return this.create(endpoint, "POST", options);
  }
  public static createPut<T = unknown, V = unknown>(
    endpoint: string,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return this.create(endpoint, "PUT", options);
  }
  public static createPatch<T = unknown, V = unknown>(
    endpoint: string,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return this.create(endpoint, "PATCH", options);
  }
  public static createDelete<T = unknown, V = unknown>(
    endpoint: string,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return this.create(endpoint, "DELETE", options);
  }

  private static create<T, V>(
    endpoint: string,
    method: HttpMethod,
    options?: RestCommandOptions<T, V>,
  ): RestCommand<T, V> {
    return new RestRequestCommand(
      endpoint,
      method,
      options?.headers,
      options?.buildRequest,
      options?.parse,
      options?.next,
      options?.cache,
    );
  }
}
