import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";
import {
  guessPricingRow,
  toBillableCredits,
} from "@/lib/ai-studio/runtime";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

export type AiVideoMiniStudioPrimaryFields = {
  promptField: AiVideoStudioFieldDescriptor | null;
  imageField: AiVideoStudioFieldDescriptor | null;
  aspectRatioField: AiVideoStudioFieldDescriptor | null;
  resolutionField: AiVideoStudioFieldDescriptor | null;
  durationField: AiVideoStudioFieldDescriptor | null;
};

export type AiVideoMiniStudioValidationReason =
  | "submitting"
  | "missing-model"
  | "missing-payload"
  | "missing-required"
  | "insufficient-credits"
  | null;

function hasRequiredFieldValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && item.length > 0);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

function isPromptField(field: AiVideoStudioFieldDescriptor) {
  const key = field.key.toLowerCase();
  return key === "prompt" || key.endsWith("_prompt");
}

function isImageField(field: AiVideoStudioFieldDescriptor) {
  const key = field.key.toLowerCase();

  if (!key.includes("image")) {
    return false;
  }

  if (field.schema.type === "array") {
    return field.schema.items?.type === "string";
  }

  return field.schema.type === "string";
}

function findField(
  fields: AiVideoStudioFieldDescriptor[],
  matcher: (field: AiVideoStudioFieldDescriptor) => boolean,
) {
  return fields.find(matcher) ?? null;
}

export function getAiVideoMiniStudioPrimaryFields(
  fields: AiVideoStudioFieldDescriptor[],
): AiVideoMiniStudioPrimaryFields {
  return {
    promptField: findField(fields, isPromptField),
    imageField: findField(fields, isImageField),
    aspectRatioField: findField(fields, (field) => field.key === "aspect_ratio"),
    resolutionField: findField(fields, (field) => field.key === "resolution"),
    durationField:
      findField(fields, (field) => field.key === "duration") ??
      findField(fields, (field) => field.key === "n_frames"),
  };
}

export function estimateAiVideoMiniStudioCredits(input: {
  pricingRows: AiStudioPublicPricingRow[];
  payload: Record<string, any> | null;
}) {
  const selectedPricing = input.payload
    ? guessPricingRow(input.pricingRows, input.payload)
    : null;

  return {
    selectedPricing,
    estimatedCredits: toBillableCredits(selectedPricing?.creditPrice),
  };
}

export function validateAiVideoMiniStudioSubmission(input: {
  isSubmitting: boolean;
  resolvedModelId: string | null;
  inputPayload: Record<string, any> | null;
  availableCredits: number | null;
  estimatedCredits: number;
  requiredFieldValues: unknown[];
}) {
  let reason: AiVideoMiniStudioValidationReason = null;

  if (input.isSubmitting) {
    reason = "submitting";
  } else if (!input.resolvedModelId) {
    reason = "missing-model";
  } else if (!input.inputPayload) {
    reason = "missing-payload";
  } else if (input.availableCredits !== null && input.availableCredits < input.estimatedCredits) {
    reason = "insufficient-credits";
  } else if (input.requiredFieldValues.some((value) => !hasRequiredFieldValue(value))) {
    reason = "missing-required";
  }

  return {
    canGenerate: reason === null,
    reason,
  };
}
