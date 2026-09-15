import "server-only";

import { loginProfilesResponseSchema, type LoginProfile } from "@home-server/contracts/users";

export async function getLoginProfiles(): Promise<LoginProfile[]> {
  try {
    const response = await fetch(new URL("/v1/auth/profiles", process.env.API_URL), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const parsed = loginProfilesResponseSchema.safeParse(await response.json());
    if (!parsed.success) return [];
    return parsed.data.profiles.map((profile) => ({
      ...profile,
      photoUrl: profile.photoUrl ? `/api/auth/profiles/${profile.id}/photo` : null,
    }));
  } catch {
    return [];
  }
}
