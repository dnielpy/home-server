import "server-only";

import { cookies } from "next/headers";
import { RestFactory } from "@home-server/core/http";
import { SESSION_COOKIE } from "@/src/modules/auth/server/session";

export const bootstrapRest = (): void => {
  RestFactory.configure({
    baseUrl: process.env.API_URL,
    defaultHeaders: { "Accept-Language": "es" },
    beforeRequest: async () => {
      try {
        const token = (await cookies()).get(SESSION_COOKIE)?.value;
        return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      } catch {
        return undefined;
      }
    },
  });
};
