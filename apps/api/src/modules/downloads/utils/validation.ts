import { BadRequestException } from "@nestjs/common";
import { basename } from "node:path";

export const validateDownloadUrl = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException("El enlace es obligatorio.");
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new BadRequestException("El enlace no es válido.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol))
    throw new BadRequestException("Solo se admiten enlaces HTTP y HTTPS.");
  if (url.username || url.password) throw new BadRequestException("No se permiten credenciales dentro del enlace.");
  return url.toString();
};

export const initialDownloadFileName = (url: string) => {
  try {
    return basename(decodeURIComponent(new URL(url).pathname)) || "Untitled download";
  } catch {
    return "Untitled download";
  }
};
