"use client";

import { EllipsisVertical, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { EyeIcon, type EyeIconHandle } from "@/components/icons/eye";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RemoveGroupDialog } from "../../../../../components/remove-group-dialog";

type GroupRowActionsMenuProps = {
  groupId: string;
  groupTitle: string;
  isForum: boolean;
  onViewMembers: () => void;
  onQuickNotice: () => void;
};

export function GroupRowActionsMenu({
  groupId,
  groupTitle,
  isForum,
  onViewMembers,
  onQuickNotice,
}: GroupRowActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const closeMenuAfterRefreshRef = useRef(false);
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const removeIconRef = useRef<XIconHandle>(null);
  const { refresh, isPending } = useRefreshTelegramGroup(groupId, groupTitle);
  const eyeIconRef = useRef<EyeIconHandle>(null);

  useEffect(() => {
    if (isPending || !closeMenuAfterRefreshRef.current) {
      return;
    }

    closeMenuAfterRefreshRef.current = false;
    setMenuOpen(false);
  }, [isPending]);

  function handleViewMembers() {
    setMenuOpen(false);
    onViewMembers();
  }

  function handleRefresh() {
    closeMenuAfterRefreshRef.current = true;
    refresh();
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={(triggerProps) => (
            <Button
              {...triggerProps}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 text-muted-foreground hover:text-foreground",
                triggerProps.className,
              )}
              aria-label="Ações do grupo"
            >
              <EllipsisVertical size={16} />
              <span className="sr-only">Ações do grupo</span>
            </Button>
          )}
        />

        <DropdownMenuContent side="bottom" align="end" sideOffset={6}>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={isPending}
            onClick={handleViewMembers}
            onMouseEnter={() => eyeIconRef.current?.startAnimation()}
            onMouseLeave={() => eyeIconRef.current?.stopAnimation()}
            className="cursor-pointer group"
          >
            <EyeIcon
              ref={eyeIconRef}
              size={14}
              className={cn(
                "text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-in-out",
              )}
            />
            Ver detalhes
          </DropdownMenuItem>

          <DropdownMenuLinkItem
            href={`/groups/${groupId}/bot`}
            className="cursor-pointer"
          >
            <Settings2 size={14} className="text-muted-foreground" />
            Configurar bot
          </DropdownMenuLinkItem>

          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              onQuickNotice();
            }}
            className="cursor-pointer"
          >
            <span className="text-muted-foreground">✉</span>
            Enviar aviso rápido
          </DropdownMenuItem>

          {isForum ? (
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                onQuickNotice();
              }}
              className="cursor-pointer"
            >
              <span className="text-muted-foreground">#</span>
              Enviar aviso em tópico
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            closeOnClick={false}
            disabled={isPending}
            onClick={handleRefresh}
            onMouseEnter={() => refreshIconRef.current?.startAnimation()}
            onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
            className="cursor-pointer group"
          >
            <RefreshCWIcon
              ref={refreshIconRef}
              size={14}
              className={cn(
                "text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-in-out",
                isPending && "animate-spin",
              )}
            />
            {isPending ? "Sincronizando…" : "Sincronizar dados"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setRemoveOpen(true)}
            onMouseEnter={() => removeIconRef.current?.startAnimation()}
            onMouseLeave={() => removeIconRef.current?.stopAnimation()}
            className="cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive data-highlighted:bg-destructive/5 data-highlighted:text-destructive"
          >
            <XIcon ref={removeIconRef} size={16} className="text-destructive" />
            Desconectar grupo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RemoveGroupDialog
        groupId={groupId}
        groupTitle={groupTitle}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </>
  );
}
