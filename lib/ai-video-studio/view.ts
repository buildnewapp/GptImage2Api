export function hasAiVideoStudioSignedInSession(
  session: { user?: unknown } | null | undefined,
) {
  return Boolean(session?.user);
}
