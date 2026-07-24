export interface AdminEvidencePreviewGuardInput {
  requestToken: number;
  currentToken: number;
  requestedApplicationId: string;
  currentApplicationId: string | null;
  resultApplicationId: string;
}

export function shouldApplyAdminEvidencePreview({
  requestToken,
  currentToken,
  requestedApplicationId,
  currentApplicationId,
  resultApplicationId,
}: AdminEvidencePreviewGuardInput): boolean {
  return (
    requestToken === currentToken &&
    requestedApplicationId === currentApplicationId &&
    resultApplicationId === requestedApplicationId
  );
}
