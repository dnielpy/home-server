/** Next.js fetch extensions kept local so this package can typecheck in isolation. */
export interface NextFetchRequestConfig {
  revalidate?: number | false;
  tags?: string[];
}

export type NextRequestInit = RequestInit & { next?: NextFetchRequestConfig };
