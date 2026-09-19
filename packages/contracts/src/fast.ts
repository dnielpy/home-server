import { z } from "zod";

export const fastSessionSchema = z.object({
  id: z.string().uuid(),
  expiresAt: z.string().datetime(),
});

export const fastSessionResponseSchema = z.object({ session: fastSessionSchema });

export type FastSession = z.infer<typeof fastSessionSchema>;
export type FastSessionResponse = z.infer<typeof fastSessionResponseSchema>;
