"use client";

import Link from "next/link";
import { useRef } from "react";
import { LogoutIcon, type LogoutIconHandle } from "@/components/icons/logout";
import {
  SettingsIcon,
  type SettingsIconHandle,
} from "@/components/icons/settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/server/logout.action";
import { cn, getUserInitials } from "@/lib/utils";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";

type ProfileDropdownProps = {
  user: PublicUserDto;
};

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const settingsIconRef = useRef<SettingsIconHandle>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const logoutIconRef = useRef<LogoutIconHandle>(null);
  const label = user.name ?? user.email;
  const sublabel = user.name ? user.email : null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <form
        ref={logoutFormRef}
        action={logoutAction}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      >
        <button type="submit">Sair da conta</button>
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "rounded-full outline-none ring-offset-background transition-[box-shadow,color]",
            "hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-primary",
            "aria-expanded:ring-2 cursor-pointer aria-expanded:ring-primary",
          )}
          aria-label="Menu da conta"
        >
          <Avatar className="size-8 shadow-sm ring-1 ring-border">
            {user.image ? <AvatarImage src={user.image} alt={label} /> : null}
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end" sideOffset={6}>
          <div
            className="flex items-center gap-3 px-2 py-2.5"
            data-slot="profile-menu-summary"
          >
            <Avatar className="size-9 shadow-sm ring-1 ring-border">
              {user.image && <AvatarImage src={user.image} alt={label} />}
              <AvatarFallback className="text-sm">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-0.5 leading-tight">
              <p
                data-slot="profile-menu-title"
                className="truncate font-heading font-medium text-sm"
              >
                {label}
              </p>
              {sublabel && (
                <p className="truncate text-muted-foreground text-xs">
                  {sublabel}
                </p>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onMouseEnter={() => settingsIconRef.current?.startAnimation()}
            onMouseLeave={() => settingsIconRef.current?.stopAnimation()}
            className="p-0 cursor-pointer"
          >
            <Link
              href="/dashboard/settings"
              className="flex group items-center p-2 gap-2"
            >
              <SettingsIcon
                ref={settingsIconRef}
                className="text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-in-out"
                size={16}
              />
              Configurações
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onMouseEnter={() => logoutIconRef.current?.startAnimation()}
            onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
            onClick={() => logoutFormRef.current?.requestSubmit()}
            className="cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive data-highlighted:bg-destructive/5 data-highlighted:text-destructive"
          >
            <LogoutIcon
              ref={logoutIconRef}
              className="text-destructive group-hover:text-foreground transition-colors duration-200 ease-in-out"
              size={16}
            />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
