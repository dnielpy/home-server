export type Result<T> =
  | { success: true; data: T; warnings?: string[] }
  | {
      success: false;
      error: { message: string };
      errorCode?: string;
      errorDetails?: {
        type: "NETWORK_ERROR" | "UNKNOWN_ERROR" | "AUTH_ERROR" | "FORBIDDEN_ERROR";
        statusCode?: number;
        clientCode?: number;
        shouldLogout?: boolean;
        [key: string]: unknown;
      };
    };
