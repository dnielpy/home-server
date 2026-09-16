import path from "node:path";
import { randomUUID } from "node:crypto";
import { BadGatewayException } from "@nestjs/common";
import type { Aria2Download, Aria2GlobalStat, Aria2Snapshot } from "./aria2.types";

const DOWNLOAD_KEYS = ["gid", "status", "totalLength", "completedLength", "downloadSpeed", "errorMessage", "files"];
const RPC_TIMEOUT_MS = 8_000;

type JsonRpcSuccess<T> = { jsonrpc: "2.0"; id: string; result: T };
type JsonRpcFailure = { jsonrpc: "2.0"; id: string; error: { code: number; message: string } };

export class Aria2RpcError extends BadGatewayException {
  public constructor(
    message: string,
    public readonly rpcCode: number | null = null,
  ) {
    super(message);
    this.name = "Aria2RpcError";
  }
}

const rpcConfig = () => {
  const url = process.env.ARIA2_RPC_URL?.trim();
  const secret = process.env.ARIA2_RPC_SECRET?.trim();
  if (!url || !secret) throw new Aria2RpcError("aria2 no está configurado.");
  return { url, token: `token:${secret}` };
};

const callRpc = async <T>(method: string, params: unknown[] = []) => {
  const { url, token } = rpcConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params: [token, ...params] }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Aria2RpcError(`aria2 respondió HTTP ${response.status}.`);
    const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;
    if ("error" in payload) throw new Aria2RpcError(payload.error.message, payload.error.code);
    return payload.result;
  } catch (error) {
    if (error instanceof Aria2RpcError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new Aria2RpcError("aria2 no respondió a tiempo.");
    throw new Aria2RpcError("No se pudo conectar con aria2.");
  } finally {
    clearTimeout(timeout);
  }
};

export const addAria2Download = (url: string, directory: string, outputName?: string) => {
  const options: Record<string, string> = { continue: "true", dir: directory };
  if (outputName) options.out = path.basename(outputName);
  return callRpc<string>("aria2.addUri", [[url], options]);
};

export const getAria2Snapshot = async (): Promise<Aria2Snapshot> => {
  const [active, waiting, stopped, stats] = await Promise.all([
    callRpc<Aria2Download[]>("aria2.tellActive", [DOWNLOAD_KEYS]),
    callRpc<Aria2Download[]>("aria2.tellWaiting", [0, 1_000, DOWNLOAD_KEYS]),
    callRpc<Aria2Download[]>("aria2.tellStopped", [0, 1_000, DOWNLOAD_KEYS]),
    callRpc<Aria2GlobalStat>("aria2.getGlobalStat"),
  ]);
  return { downloads: [...active, ...waiting, ...stopped], stats };
};

export const pauseAria2Download = (gid: string) => callRpc<string>("aria2.pause", [gid]);
export const resumeAria2Download = (gid: string) => callRpc<string>("aria2.unpause", [gid]);
export const removeAria2Download = (gid: string) => callRpc<string>("aria2.remove", [gid]);
export const saveAria2Session = () => callRpc<"OK">("aria2.saveSession");

export const getDownloadFileName = (download: Aria2Download, fallback = "Untitled download") => {
  const filePath = download.files.find((file) => file.path)?.path;
  if (filePath) return path.basename(filePath);
  return fallback;
};
