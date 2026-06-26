export function isTelegramMemberGoneStatus(
  status: string | undefined | null,
): boolean {
  return status === 'left' || status === 'kicked';
}

export function isTelegramMemberLookupGoneError(reason: string): boolean {
  const normalized = reason.toLowerCase();
  return (
    normalized.includes('user not found') ||
    normalized.includes('participant_id_invalid') ||
    normalized.includes('user_not_participant') ||
    normalized.includes('member not found')
  );
}
