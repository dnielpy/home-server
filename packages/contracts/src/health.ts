import { z } from "zod";

export const healthDataSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("ok"),
});

export type HealthData = z.infer<typeof healthDataSchema>;
