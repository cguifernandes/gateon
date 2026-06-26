type MemberNameFields = {
  firstName: string | null;
  lastName: string | null;
  telegramUserId: string;
};

export function getMemberDisplayName(member: MemberNameFields) {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ");

  if (fullName) return fullName;
  return member.telegramUserId;
}

export function getMemberInitials(member: MemberNameFields) {
  const source = member.firstName ?? member.lastName ?? member.telegramUserId;
  return source.slice(0, 2).toUpperCase();
}
