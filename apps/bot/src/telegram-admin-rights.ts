/**
 * Maps Telegram ChatMemberAdministrator flags to the payload expected by the Gateon API.
 * Field names match the Bot API JSON (snake_case on the wire, camelCase in our API).
 */
export type TelegramAdministratorRightsPayload = {
  canManageChat: boolean;
  canRestrictMembers: boolean;
  canInviteUsers: boolean;
};

function readBool(member: Record<string, unknown>, key: string): boolean {
  return member[key] === true;
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
