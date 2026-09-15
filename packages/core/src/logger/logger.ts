export class Logger {
  public static log(message: string, context?: Record<string, unknown>): void {
    console.info("[home-server]", message, context);
  }

  public static logError(error: unknown, context?: Record<string, unknown>): void {
    console.error("[home-server]", error, context);
  }

  public static logGenericError(error: unknown, context: Record<string, unknown> = {}): void {
    this.logError(error, { errorType: "UNKNOWN_ERROR", ...context });
  }
}
