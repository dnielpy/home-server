import { Logger } from "../logger";
import type { Result } from "../types";

type ErrorPayload = {
  message?: string | string[];
  detail?: string;
  title?: string;
  errors?: Record<string, string[]> | string[];
  clientCode?: number;
};

const errorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === "string" && payload) return payload;
  if (!payload || typeof payload !== "object") return fallback;
  const error = payload as ErrorPayload;
  if (Array.isArray(error.message)) return error.message.filter(Boolean).join("; ") || fallback;
  if (typeof error.message === "string" && error.message) return error.message;
  if (typeof error.detail === "string" && error.detail) return error.detail;
  if (typeof error.title === "string" && error.title) return error.title;
  if (Array.isArray(error.errors)) return error.errors.filter(Boolean).join("; ") || fallback;
  if (error.errors) {
    const messages = Object.entries(error.errors).flatMap(([field, values]) =>
      values.map((value) => (field ? `${field}: ${value}` : value)),
    );
    if (messages.length) return messages.join("; ");
  }
  return fallback;
};

const readPayload = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json") && !contentType.includes("+json")) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export class RestErrorHandler {
  public static async handleResponse<T>(
    response: Response,
    request?: { method: string; url: string; body?: unknown },
  ): Promise<Result<T>> {
    try {
      const payload = await readPayload(response);
      if (response.ok) return { success: true, data: payload as T };

      const errorPayload = payload && typeof payload === "object" ? (payload as ErrorPayload) : undefined;
      const message = errorMessage(payload, `${response.status} ${response.statusText}`);
      const endpoint = request ? `${request.method} ${request.url}` : response.url;
      Logger.logGenericError(new Error(message), {
        errorType: "NETWORK_ERROR",
        status: response.status,
        endpoint,
        ...(request?.body === undefined ? {} : { requestBody: request.body }),
      });
      if (response.status === 401) {
        return {
          success: false,
          error: { message },
          errorDetails: { type: "AUTH_ERROR", statusCode: 401, clientCode: errorPayload?.clientCode },
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          error: { message },
          errorDetails: { type: "FORBIDDEN_ERROR", statusCode: 403, clientCode: errorPayload?.clientCode },
        };
      }
      return {
        success: false,
        error: { message },
        errorDetails: { type: "NETWORK_ERROR", statusCode: response.status, clientCode: errorPayload?.clientCode },
      };
    } catch (error) {
      return this.handleGenericError<T>(error);
    }
  }

  public static handleGenericError<T>(error: unknown): Result<T> {
    const message = error instanceof Error ? error.message : "No fue posible completar la petición.";
    Logger.logGenericError(error, { errorType: "UNKNOWN_ERROR", message });
    return { success: false, error: { message }, errorDetails: { type: "UNKNOWN_ERROR" } };
  }
}
