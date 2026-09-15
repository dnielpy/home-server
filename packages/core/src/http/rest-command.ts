import type { Result } from "../types";

export interface RestCommand<T = unknown, V = unknown> {
  execute(variables?: V): Promise<Result<T>>;
}
