import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";
import {
  getEstimatedCreditsForPricing,
  resolveSelectedPricing,
} from "@/lib/ai-studio/runtime";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

export type AiVideoMiniStudioOptionValue = string | number;

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

function isAspectRatioLikeOption(option: unknown) {
  if (typeof option !== "string") {
    return false;
  }

  const normalized = option.trim().toLowerCase();

  return (
    /^\d+:\d+$/.test(normalized) ||
    normalized === "adaptive" ||
    normalized === "auto" ||
    normalized === "portrait" ||
    normalized === "landscape"
  );
}

function isSizeFieldWithAspectRatioSemantics(field: AiVideoStudioFieldDescriptor) {
  if (field.key !== "size") {
    return false;
  }

  const description =
    typeof field.schema.description === "string"
      ? field.schema.description.toLowerCase()
      : "";
  const enumOptions = Array.isArray(field.schema.enum) ? field.schema.enum : [];

  return (
    description.includes("aspect ratio") ||
    description.includes("ratio of the generated") ||
    (enumOptions.length > 0 && enumOptions.every(isAspectRatioLikeOption))
  );
}

function findField(
  fields: AiVideoStudioFieldDescriptor[],
  matcher: (field: AiVideoStudioFieldDescriptor) => boolean,
) {
  return fields.find(matcher) ?? null;
}

function isDurationField(field: AiVideoStudioFieldDescriptor) {
  return field.key === "duration" || field.key === "n_frames";
}

function getEnumOptions(field: AiVideoStudioFieldDescriptor): AiVideoMiniStudioOptionValue[] {
  if (!Array.isArray(field.schema.enum)) {
    return [];
  }

  return field.schema.enum.filter(
    (item): item is AiVideoMiniStudioOptionValue =>
      typeof item === "string" || typeof item === "number",
  );
}

function getIntegerRangeOptions(field: AiVideoStudioFieldDescriptor) {
  if (
    !isDurationField(field) ||
    (field.schema.type !== "integer" && field.schema.type !== "number")
  ) {
    return [];
  }

  const minimum = Number(field.schema.minimum);
  const maximum = Number(field.schema.maximum);

  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum) {
    return [];
  }

  if (maximum - minimum > 24) {
    return [];
  }

  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
}

export function getAiVideoMiniStudioPrimaryFields(
  fields: AiVideoStudioFieldDescriptor[],
): AiVideoMiniStudioPrimaryFields {
  return {
    promptField: findField(fields, isPromptField),
    imageField: findField(fields, isImageField),
    aspectRatioField:
      findField(fields, (field) => field.key === "aspect_ratio") ??
      findField(fields, isSizeFieldWithAspectRatioSemantics),
    resolutionField: findField(fields, (field) => field.key === "resolution"),
    durationField:
      findField(fields, (field) => field.key === "duration") ??
      findField(fields, (field) => field.key === "n_frames"),
  };
}

export function getAiVideoMiniStudioFieldOptions(
  field: AiVideoStudioFieldDescriptor | null,
): AiVideoMiniStudioOptionValue[] {
  if (!field) {
    return [];
  }

  const enumOptions = getEnumOptions(field);

  if (enumOptions.length > 0) {
    return enumOptions;
  }

  return getIntegerRangeOptions(field);
}

export function coerceAiVideoMiniStudioFieldValue(
  field: AiVideoStudioFieldDescriptor | null,
  value: string,
) {
  if (!field) {
    return value;
  }

  if (field.schema.type === "integer") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (field.schema.type === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}

export function estimateAiVideoMiniStudioCredits(input: {
  modelId: string | null;
  pricingRows: AiStudioPublicPricingRow[];
  payload: Record<string, any> | null;
}) {
  const selectedPricing =
    input.payload && input.modelId
      ? resolveSelectedPricing(input.pricingRows, {
          modelId: input.modelId,
          payload: input.payload,
        })
      : null;

  return {
    selectedPricing,
    estimatedCredits: getEstimatedCreditsForPricing(selectedPricing, input.payload),
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
