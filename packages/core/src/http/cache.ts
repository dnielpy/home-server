import { revalidateTag } from "next/cache";

export const revalidateRestCache = (tags: string | string[]): void => {
  for (const tag of Array.isArray(tags) ? tags : [tags]) revalidateTag(tag, "max");
};
