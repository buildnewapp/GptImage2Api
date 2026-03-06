import type { GenerationMode, ProviderKey } from "@/config/model_config";

export const VIDEO_REMIX_STORAGE_KEY = "seedance-remix-payload";
export const VIDEO_STUDIO_FORM_STORAGE_KEY = "seedance-video-studio-form";

export type VideoRemixPayload = {
  mode?: GenerationMode;
  modelKey?: string;
  versionKey?: string;
  providerKey?: ProviderKey;
  isPublic?: boolean;
  providerValues?: {
    prompt?: string;
    imageUrl?: string;
    resolution?: string;
    aspectRatio?: string;
    duration?: string;
    seed?: string;
    cameraFixed?: boolean;
    enableSafetyChecker?: boolean;
  };
};

export type VideoStudioFormPayload = VideoRemixPayload;

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseVideoPayloadRecord(parsed: Record<string, unknown>): VideoStudioFormPayload {
  const mode =
    parsed.mode === "image-to-video" || parsed.mode === "text-to-video"
      ? parsed.mode
      : undefined;
  const providerKey =
    parsed.providerKey === "office" ? parsed.providerKey : undefined;
  const providerValuesSource =
    parsed.providerValues && typeof parsed.providerValues === "object"
      ? (parsed.providerValues as Record<string, unknown>)
      : null;
  const legacyPrompt = asString(parsed.prompt);
  const legacyUploadedImage = asString(parsed.uploadedImage);
  const providerValues = providerValuesSource
    ? {
        prompt: asString(providerValuesSource.prompt) ?? legacyPrompt,
        imageUrl: asString(providerValuesSource.imageUrl) ?? legacyUploadedImage,
        resolution: asString(providerValuesSource.resolution),
        aspectRatio: asString(providerValuesSource.aspectRatio),
        duration: asString(providerValuesSource.duration),
        seed: asString(providerValuesSource.seed),
        cameraFixed: asBoolean(providerValuesSource.cameraFixed),
        enableSafetyChecker: asBoolean(providerValuesSource.enableSafetyChecker),
      }
    : legacyPrompt || legacyUploadedImage
      ? {
          prompt: legacyPrompt,
          imageUrl: legacyUploadedImage,
        }
      : undefined;

  return {
    mode,
    modelKey: asString(parsed.modelKey),
    versionKey: asString(parsed.versionKey),
    providerKey,
    isPublic: asBoolean(parsed.isPublic),
    providerValues,
  };
}

export function safeParseVideoRemixPayload(raw: string | null): VideoRemixPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parseVideoPayloadRecord(parsed);
  } catch {
    return null;
  }
}

export function safeParseVideoStudioFormPayload(
  raw: string | null,
): VideoStudioFormPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parseVideoPayloadRecord(parsed);
  } catch {
    return null;
  }
}
