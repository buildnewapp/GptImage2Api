import type { AiVideoStudioMode } from "@/config/ai-video-studio";
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
  | "missing-prompt"
  | "missing-image"
  | "insufficient-credits"
  | "image-to-video-unsupported"
  | null;

export function hasAiVideoMiniStudioImageInput(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && item.length > 0);
  }

  return typeof value === "string" && value.length > 0;
}

export function resolveAiVideoMiniStudioMode(input: {
  currentMode: AiVideoStudioMode;
  imageValue: unknown;
  supportedModes: readonly AiVideoStudioMode[];
}): AiVideoStudioMode {
  const hasImage = hasAiVideoMiniStudioImageInput(input.imageValue);

  if (hasImage && input.supportedModes.includes("image-to-video")) {
    return "image-to-video";
  }

  if (!input.supportedModes.includes(input.currentMode)) {
    return input.supportedModes[0] ?? "text-to-video";
  }

  if (!hasImage && input.currentMode === "image-to-video") {
    return input.supportedModes.includes("text-to-video")
      ? "text-to-video"
      : input.currentMode;
  }

  return input.currentMode;
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
    promptField: findField(fields, (field) => field.kind === "prompt"),
    imageField: findField(fields, (field) => field.kind === "image"),
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
  requiresPrompt: boolean;
  requiresImage: boolean;
  promptValue: unknown;
  imageValue: unknown;
  supportsImageToVideo: boolean;
}) {
  const hasImage = hasAiVideoMiniStudioImageInput(input.imageValue);
  const hasPrompt =
    typeof input.promptValue === "string" && input.promptValue.trim().length > 0;

  let reason: AiVideoMiniStudioValidationReason = null;

  if (input.isSubmitting) {
    reason = "submitting";
  } else if (!input.resolvedModelId) {
    reason = "missing-model";
  } else if (!input.inputPayload) {
    reason = "missing-payload";
  } else if (hasImage && !input.supportsImageToVideo) {
    reason = "image-to-video-unsupported";
  } else if (input.availableCredits !== null && input.availableCredits < input.estimatedCredits) {
    reason = "insufficient-credits";
  } else if (input.requiresPrompt && !hasPrompt) {
    reason = "missing-prompt";
  } else if (input.requiresImage && !hasImage) {
    reason = "missing-image";
  }

  return {
    canGenerate: reason === null,
    reason,
  };
}
