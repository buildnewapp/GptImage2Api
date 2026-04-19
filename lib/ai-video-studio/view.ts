export function hasAiVideoStudioSignedInSession(
  session: { user?: unknown } | null | undefined,
) {
  return Boolean(session?.user);
}

export function shouldShowAiVideoStudioSignedInUi(
  session: { user?: unknown } | null | undefined,
  hasHydrated: boolean,
) {
  return hasHydrated && hasAiVideoStudioSignedInSession(session);
}
