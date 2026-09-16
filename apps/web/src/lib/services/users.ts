"use server";

import type { Result } from "@home-server/core/types";
import { userResponseSchema, usersResponseSchema, type UserDto } from "@home-server/contracts/users";
import { API_ROUTES } from "@/src/routes";
import { authenticatedApiRequest } from "@/src/modules/auth/server/session";

export type CreateUserInput = {
  name: string;
  password: string;
  photoData?: string;
};

export type UpdateUserInput = {
  name: string;
  password?: string;
  photoData?: string;
  removePhoto?: boolean;
};

const toBrowserUser = (user: UserDto): UserDto => ({
  ...user,
  photoUrl: user.photoUrl ? `/api/users/${user.id}/photo?v=${encodeURIComponent(user.updatedAt)}` : null,
});

export const getUsers = async (): Promise<Result<UserDto[]>> => {
  const result = await authenticatedApiRequest(API_ROUTES.users.list, usersResponseSchema.parse, { cache: "no-store" });
  if (!result.success) return result;

  return { success: true, data: result.data.users.map(toBrowserUser) };
};

export const createUser = async (data: CreateUserInput): Promise<Result<UserDto>> => {
  const result = await authenticatedApiRequest(API_ROUTES.users.list, userResponseSchema.parse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};

export const updateUser = async (userId: string, data: UpdateUserInput): Promise<Result<UserDto>> => {
  const result = await authenticatedApiRequest(`${API_ROUTES.users.list}/${userId}`, userResponseSchema.parse, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};

export const deleteUser = async (userId: string): Promise<Result<UserDto>> => {
  const result = await authenticatedApiRequest(`${API_ROUTES.users.list}/${userId}`, userResponseSchema.parse, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};
