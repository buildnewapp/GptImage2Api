import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

type PartitionableField = Pick<AiVideoStudioFieldDescriptor, "key" | "kind">;

function isPrimaryField(field: PartitionableField) {
  return (
    field.kind === "prompt" ||
    field.kind === "image" ||
    field.key === "aspect_ratio" ||
    field.key === "n_frames"
  );
}

export function partitionAiVideoStudioFields<T extends PartitionableField>(
  fields: T[],
) {
  const primary: T[] = [];
  const advanced: T[] = [];

  for (const field of fields) {
    if (isPrimaryField(field)) {
      primary.push(field);
      continue;
    }

    advanced.push(field);
  }

  return {
    primary,
    advanced,
  };
}
