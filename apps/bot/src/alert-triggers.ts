/** Must stay aligned with `AlertTriggerType` in apps/api/prisma/schema.prisma */
export type AlertTriggerType =
  | "MEMBER_JOINED"
  | "MEMBER_LEFT"
  | "MEMBER_BANNED"
  | "FORUM_TOPIC_CREATED";
