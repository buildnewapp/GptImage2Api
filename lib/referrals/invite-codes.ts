const MIN_INVITE_CODE_LENGTH = 4;
const MAX_INVITE_CODE_LENGTH = 12;

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidInviteCode(value: string): boolean {
  const normalized = normalizeInviteCode(value);
  return (
    normalized.length >= MIN_INVITE_CODE_LENGTH &&
    normalized.length <= MAX_INVITE_CODE_LENGTH
  );
}

export function generateInviteCode(userId: string): string {
  const normalized = normalizeInviteCode(userId.replace(/-/g, ""));
  return normalized.slice(-8);
}
