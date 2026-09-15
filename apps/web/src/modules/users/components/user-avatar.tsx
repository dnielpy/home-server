import type { UserDto } from "@home-server/contracts/users";
import Image from "next/image";

export function UserAvatar({ user, large = false }: { user: Pick<UserDto, "name" | "photoUrl">; large?: boolean }) {
  const initials = user.name.trim().slice(0, 2).toUpperCase() || "?";
  return user.photoUrl ? (
    <Image
      unoptimized
      src={user.photoUrl}
      alt=""
      width={large ? 64 : 40}
      height={large ? 64 : 40}
      className={`${large ? "size-16 rounded-full" : "size-10 rounded-xl"} object-cover`}
    />
  ) : (
    <span
      className={`grid ${large ? "size-16 rounded-full text-xl" : "size-10 rounded-xl text-sm"} bg-primary text-primary-foreground place-items-center font-semibold`}
    >
      {initials}
    </span>
  );
}
