"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/server/logout.action";

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );
}
