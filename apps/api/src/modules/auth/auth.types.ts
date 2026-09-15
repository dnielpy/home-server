import type { UserDto } from "@home-server/contracts";
import type { FastifyRequest } from "fastify";
import type { users } from "@home-server/database";

export type UserRecord = typeof users.$inferSelect;

export type AuthenticatedRequest = FastifyRequest & {
  user?: UserRecord;
};

export type AuthenticatedUser = UserDto;
