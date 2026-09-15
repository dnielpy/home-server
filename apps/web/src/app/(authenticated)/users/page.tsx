import type { Metadata } from "next";
import { getUsers } from "@/src/lib/services/users";
import { requireAdminUser } from "@/src/modules/auth/server/session";
import { UsersManager } from "@/src/modules/users/components/users-manager";

export const metadata: Metadata = {
  title: "Usuarios · Home Server",
  description: "Gestiona los usuarios de Home Server.",
};
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminUser();
  const result = await getUsers();

  if (!result.success) throw new Error(result.error.message);

  return <UsersManager initialUsers={result.data} />;
}
