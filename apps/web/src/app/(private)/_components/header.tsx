"use client";

import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";
import { ProfileDropdown } from "./profile-dropdown";

type HeaderProps = {
  user: PublicUserDto;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between gap-3 rounded-tr-xl bg-background px-4 sm:gap-4 sm:px-6 border-b border-border">
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
