"use server";

import { RestFactory } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import {
  userResponseSchema,
  usersResponseSchema,
  type UserDto,
} from "@home-server/contracts/users";
import { API_ROUTES } from "@/src/routes";

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
  photoUrl: user.photoUrl
    ? `/api/users/${user.id}/photo?v=${encodeURIComponent(user.updatedAt)}`
    : null,
});

const usersCommand = RestFactory.createGet(API_ROUTES.users.list, {
  cache: "no-store",
  parse: usersResponseSchema.parse,
});

const createUserCommand = RestFactory.createPost(API_ROUTES.users.list, {
  cache: "no-store",
  buildRequest: (data) => ({ body: data }),
  parse: userResponseSchema.parse,
});

export const getUsers = async (): Promise<Result<UserDto[]>> => {
  const result = await usersCommand.execute();
  if (!result.success) return result;

  return { success: true, data: result.data.users.map(toBrowserUser) };
};

export const createUser = async (
  data: CreateUserInput,
): Promise<Result<UserDto>> => {
  const result = await createUserCommand.execute(data);
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};

export const updateUser = async (
  userId: string,
  data: UpdateUserInput,
): Promise<Result<UserDto>> => {
  const command = RestFactory.createPatch(
    `${API_ROUTES.users.list}/${userId}`,
    {
      cache: "no-store",
      buildRequest: (input) => ({ body: input }),
      parse: userResponseSchema.parse,
    },
  );
  const result = await command.execute(data);
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};

export const deleteUser = async (userId: string): Promise<Result<UserDto>> => {
  const command = RestFactory.createDelete(`${API_ROUTES.users.list}/${userId}`, {
    cache: "no-store",
    parse: userResponseSchema.parse,
  });
  const result = await command.execute();
  if (!result.success) return result;

  return { success: true, data: toBrowserUser(result.data.user) };
};
