import { z } from "zod";

export const userDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  photoUrl: z.string().nullable(),
  isAdmin: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const loginRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  sessionToken: z.string().min(1),
  user: userDtoSchema,
});

export const usersResponseSchema = z.object({ users: z.array(userDtoSchema) });
export const userResponseSchema = z.object({ user: userDtoSchema });

export type UserDto = z.infer<typeof userDtoSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type UsersResponse = z.infer<typeof usersResponseSchema>;
