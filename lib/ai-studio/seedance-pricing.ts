export const LOCAL_REFERENCE_METADATA_KEY = "__local_reference_metadata";

export function stripLocalReferenceMetadata(payload: Record<string, any>) {
  const next = structuredClone(payload);

  delete next[LOCAL_REFERENCE_METADATA_KEY];

  if (
    next.input &&
    typeof next.input === "object" &&
    !Array.isArray(next.input)
  ) {
    delete next.input[LOCAL_REFERENCE_METADATA_KEY];
  }

  return next;
}
