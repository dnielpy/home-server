import { Logger } from "../logger";
import type { Result } from "../types";

export abstract class BaseRestCommand<T = unknown> {
  protected handleAuthError(result: Result<T>): Result<T> {
    if (!result.success && result.errorDetails?.type === "AUTH_ERROR" && result.errorDetails.statusCode === 401) {
      Logger.log("[http] 401 received; the current session should be renewed.");
      return { ...result, errorDetails: { ...result.errorDetails, shouldLogout: true } };
    }
    return result;
  }
}
