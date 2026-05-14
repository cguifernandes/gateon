/**
 * Maps Telegram ChatMemberAdministrator flags to the payload expected by the Gateon API.
 * Uses snake_case keys from the Bot API JSON / grammy objects.
 */
export type TelegramAdministratorRightsPayload = {
  canManageChat: boolean;
  canRestrictMembers: boolean;
  canInviteUsers: boolean;
};

function readBool(member: Record<string, unknown>, key: string): boolean {
  return (member as Record<string, unknown>)[key] === true;
}

export function extractAdministratorRightsPayload(member: {
  status: string;
}): TelegramAdministratorRightsPayload | undefined {
  if (member.status !== "administrator") {
    return undefined;
  }

  const m = member as Record<string, unknown>;
  return {
    canManageChat: readBool(m, "can_manage_chat"),
    canRestrictMembers: readBool(m, "can_restrict_members"),
    canInviteUsers: readBool(m, "can_invite_users"),
  };
}
