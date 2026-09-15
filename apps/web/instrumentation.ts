import { Logger } from "@home-server/core/logger";

const SUPPORTED_RUNTIMES = new Set(["nodejs"]);

export const register = async (): Promise<void> => {
  const runtime = process.env.NEXT_RUNTIME;
  if (!runtime || !SUPPORTED_RUNTIMES.has(runtime)) return;

  const { bootstrapRest } = await import("./src/lib/http/bootstrap-rest");
  bootstrapRest();
  Logger.log("[bootstrap-rest] RestFactory configured for nodejs runtime.");
};
