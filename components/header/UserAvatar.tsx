"use client";

import LoginButton from "@/components/header/LoginButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { user as userSchema } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { UserInfo } from "./UserInfo";

type User = typeof userSchema.$inferSelect;

export function UserAvatar({
  user,
  totalAvailableCredits,
  avatarClassName,
  loginButtonClassName,
  triggerClassName,
}: {
  user: User;
  totalAvailableCredits?: number | null;
  avatarClassName?: string;
  loginButtonClassName?: string;
  triggerClassName?: string;
}) {
  if (!user) {
    return <LoginButton className={loginButtonClassName} />;
  }

  const fallbackLetter = user.email[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={cn(
            triggerClassName
              ? "inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              : "rounded-full focus:outline-hidden",
            triggerClassName,
          )}
        >
          <Avatar className={cn("h-8 w-8", avatarClassName)}>
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback>{fallbackLetter}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <UserInfo
          user={user}
          totalAvailableCredits={totalAvailableCredits}
          renderContainer={(children) => (
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">{children}</div>
            </DropdownMenuLabel>
          )}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
