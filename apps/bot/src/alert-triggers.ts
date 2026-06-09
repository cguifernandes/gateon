/** Must stay aligned with `AlertTriggerType` in apps/api/prisma/schema.prisma */
export type AlertTriggerType =
  | "MEMBER_JOINED"
  | "MEMBER_LEFT"
  | "MEMBER_BANNED"
  | "FORUM_TOPIC_CREATED"
  | "MEMBER_JOINED_GROUP_MESSAGE"
  | "MEMBER_LEFT_PRIVATE_MESSAGE";
