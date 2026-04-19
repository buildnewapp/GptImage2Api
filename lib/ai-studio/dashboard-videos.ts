import { getAiVideoStudioSelectionFromModelId } from "@/config/ai-video-studio";

export type LegacyVideoStatus = "pending" | "success" | "failed";
export type LegacyVideoStatusFilter = LegacyVideoStatus | "all";

export type LegacyProviderValues = {
  prompt?: string;
  imageUrl?: string;
  resolution?: string;
  aspectRatio?: string;
  duration?: string;
  seed?: string;
  cameraFixed?: boolean;
  enableSafetyChecker?: boolean;
};

export type AiStudioUserHistoryItem = {
  id: string;
  category: string;
  catalogModelId: string;
  title: string;
  provider: string;
  status: string;
  providerTaskId: string | null;
  isPublic?: boolean;
  reservedCredits: number;
  capturedCredits: number;
  refundedCredits: number;
  resultUrls: string[];
  createdAt: string;
  requestPayload: Record<string, any>;
};

export type LegacyVideoHistoryRecord = {
  id: string;
  taskId: string;
  providerTaskId?: string | null;
  category: string;
  catalogModelId?: string;
  model: string;
  modelLabel: string | null;
  modelKey?: string | null;
  versionKey?: string | null;
  mode?: "image-to-video" | "text-to-video";
  providerValues?: LegacyProviderValues;
  uploadedImage?: string | null;
  status: LegacyVideoStatus;
  creditsUsed: number;
  creditsRequired?: number;
  creditsRefunded: boolean;
  isPublic: boolean;
  visibilityAvailable: boolean;
  prompt: string | null;
  resultUrl: string | null;
  resultUrls: string[];
  createdAt: string;
  requestPayload: Record<string, any>;
};

export type AiStudioAdminVideoItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  category: string;
  catalogModelId: string;
  title: string;
  providerTaskId: string | null;
  status: string;
  requestPayload: Record<string, any>;
  resultUrls: string[];
  reservedCredits: number;
  refundedCredits: number;
  createdAt: string;
};

export type LegacyAdminVideoRecord = {
  id: string;
  taskId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  category: string;
  model: string;
  selectedModel: string;
  status: LegacyVideoStatus;
  creditsUsed: number;
  creditsRefunded: boolean;
  inputParams: unknown;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function getFirstString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  return undefined;
}

function formatDuration(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value)}s`;
  }

  if (typeof value === "string" && value.trim()) {
    return value.endsWith("s") ? value : `${value}s`;
  }

  return undefined;
}

function compactProviderValues(values: LegacyProviderValues) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as LegacyProviderValues;
}

export function mapAiStudioStatusToLegacyVideoStatus(
  status: string,
): LegacyVideoStatus {
  if (status === "succeeded") {
    return "success";
  }

  if (status === "failed") {
    return "failed";
  }

  return "pending";
}

export function getAiStudioStatusesForLegacyVideoFilter(
  status: LegacyVideoStatusFilter,
) {
  switch (status) {
    case "pending":
      return ["created", "submitted", "queued", "running"] as const;
    case "success":
      return ["succeeded"] as const;
    case "failed":
      return ["failed"] as const;
    default:
      return null;
  }
}

export function mapAiStudioStoredPayloadToLegacyVideoInput(
  payload: Record<string, any> | null | undefined,
) {
  const root = asRecord(payload) ?? {};
  const input = asRecord(root.input) ?? root;

  return compactProviderValues({
    prompt: asString(input.prompt) ?? asString(root.prompt),
    imageUrl:
      getFirstString(input.image_urls) ??
      getFirstString(input.imageUrls) ??
      asString(input.image_url) ??
      asString(input.first_frame_image) ??
      asString(root.image_url),
    resolution: asString(input.resolution) ?? asString(input.image_resolution),
    aspectRatio: asString(input.aspect_ratio) ?? asString(input.aspectRatio),
    duration: formatDuration(input.n_frames) ?? formatDuration(input.duration),
    seed:
      (typeof input.seed === "number" || typeof input.seed === "string") &&
      `${input.seed}`.trim().length > 0
        ? `${input.seed}`
        : (typeof input.seeds === "number" ||
              typeof input.seeds === "string") &&
            `${input.seeds}`.trim().length > 0
          ? `${input.seeds}`
          : undefined,
    cameraFixed: asBoolean(input.camera_fixed) ?? asBoolean(input.cameraFixed),
    enableSafetyChecker:
      asBoolean(input.enable_safety_checker) ??
      asBoolean(input.enableSafetyChecker),
  } satisfies LegacyProviderValues);
}

export function mapAiStudioUserRecordToLegacyVideoHistoryRecord(
  record: AiStudioUserHistoryItem,
): LegacyVideoHistoryRecord {
  const providerValues = mapAiStudioStoredPayloadToLegacyVideoInput(
    record.requestPayload,
  );
  const resolvedSelection = getAiVideoStudioSelectionFromModelId(
    record.catalogModelId,
  );
  const model = asString(record.requestPayload?.model) ?? record.catalogModelId;
  const taskId = record.providerTaskId ?? record.id;
  const prompt = providerValues.prompt ?? null;
  const uploadedImage = providerValues.imageUrl ?? null;
  const category = record.category || "video";

  const nextRecord: LegacyVideoHistoryRecord = {
    id: record.id,
    taskId,
    providerTaskId: record.providerTaskId,
    category,
    catalogModelId: record.catalogModelId,
    model,
    modelLabel: record.title,
    providerValues,
    status: mapAiStudioStatusToLegacyVideoStatus(record.status),
    creditsUsed:
      record.capturedCredits > 0
        ? record.capturedCredits
        : record.reservedCredits,
    creditsRequired: record.reservedCredits,
    creditsRefunded: record.refundedCredits > 0,
    isPublic: record.isPublic ?? true,
    visibilityAvailable: true,
    prompt,
    resultUrl: record.resultUrls[0] ?? null,
    resultUrls: record.resultUrls,
    createdAt: record.createdAt,
    requestPayload: record.requestPayload,
  };

  if (category === "video") {
    nextRecord.mode = uploadedImage ? "image-to-video" : "text-to-video";
  }

  if (resolvedSelection?.familyKey) {
    nextRecord.modelKey = resolvedSelection.familyKey;
  }

  if (resolvedSelection?.versionKey) {
    nextRecord.versionKey = resolvedSelection.versionKey;
  }

  if (uploadedImage) {
    nextRecord.uploadedImage = uploadedImage;
  }

  return nextRecord;
}

export function mapAiStudioAdminRecordToLegacyAdminVideoRecord(
  record: AiStudioAdminVideoItem,
): LegacyAdminVideoRecord {
  const providerValues = mapAiStudioStoredPayloadToLegacyVideoInput(
    record.requestPayload,
  );

  return {
    id: record.id,
    taskId: record.providerTaskId ?? record.id,
    userId: record.userId,
    userEmail: record.userEmail,
    userName: record.userName,
    category: record.category,
    model: asString(record.requestPayload?.model) ?? record.catalogModelId,
    selectedModel: record.title,
    status: mapAiStudioStatusToLegacyVideoStatus(record.status),
    creditsUsed: record.reservedCredits,
    creditsRefunded: record.refundedCredits > 0,
    inputParams: record.requestPayload,
    prompt: providerValues.prompt ?? null,
    resultUrl: record.resultUrls[0] ?? null,
    createdAt: record.createdAt,
  };
}
