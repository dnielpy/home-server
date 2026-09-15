import "server-only";

import { RestFactory } from "@home-server/core/http";

export const bootstrapRest = (): void => {
  RestFactory.configure({
    baseUrl: process.env.API_URL,
    defaultHeaders: { "Accept-Language": "es" },
  });
};
