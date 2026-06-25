import type { AiStudioDocDetail } from "@/lib/ai-studio/catalog";
import type {
  AiStudioNormalizedState,
  AiStudioTaskQueryResult,
} from "@/lib/ai-studio/execute";

export const AI_STUDIO_PROVIDER_MOCK_TASK_STATE: Extract<
  AiStudioNormalizedState,
  "succeeded" | "failed"
> = "succeeded";

export const AI_STUDIO_PROVIDER_MOCK_FAILURE_REASON =
  "AI Studio mock provider failure";

export const AI_STUDIO_MOCK_IMAGE_URLS = [
    "https://cdn.sdanceai.com/sdanceai/sdance_images/4ryp8bssv.png",
    "https://cdn.sdanceai.com/sdanceai/sdance_images/9qfkzq75i.png",
    "https://cdn.sdanceai.com/sdanceai/sdance_images/sel4unt33.png",
    "https://cdn.sdanceai.com/sdanceai/sdance_images/ilxeib4mv.png",
    "https://cdn.sdanceai.com/sdanceai/sdance_images/4o8l4rmdj.png"
];

export const AI_STUDIO_MOCK_VIDEO_URLS = [
    "https://v.sdanceai.com/sdanceai/sdance_videos/es600fg0x.mp4",
    "https://v.sdanceai.com/sdanceai/sdance_videos/gomdqjkt4.mp4",
    "https://v.sdanceai.com/sdanceai/sdance_videos/cslx142y0.mp4",
    "https://v.sdanceai.com/sdanceai/sdance_videos/kewve4hf7.mp4",
    "https://v.sdanceai.com/sdanceai/sdance_videos/598uoczz9.mp4"
];

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

function createMockTaskId(detail: Pick<AiStudioDocDetail, "category" | "id">) {
  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `mock_${detail.category}_${randomSuffix}`;
}

function getMockMediaUrls(category: AiStudioDocDetail["category"]) {
  const urls = category === "image"
    ? AI_STUDIO_MOCK_IMAGE_URLS
    : category === "video"
      ? AI_STUDIO_MOCK_VIDEO_URLS
      : [];

  if (urls.length === 0) {
    return [];
  }

  return [urls[Math.floor(Math.random() * urls.length)]!];
}

function getMockVendor(detail: Pick<AiStudioDocDetail, "vendor">) {
  return detail.vendor ?? "kie";
}

export function isAiStudioProviderMockEnabled() {
  const raw = process.env.AI_STUDIO_PROVIDER_MOCK_ENABLED
    ?.trim()
    .toLowerCase();

  return raw ? TRUTHY_ENV_VALUES.has(raw) : false;
}

export function isMockAiStudioTaskId(taskId: string | null | undefined) {
  return typeof taskId === "string" && taskId.startsWith("mock_");
}

export function getMockAiStudioProviderSubmission(
  detail: AiStudioDocDetail,
  payload: Record<string, any>,
) {
  const taskId = createMockTaskId(detail);

  return {
    raw: {
      mocked: true,
      taskId,
      state: "queued",
      category: detail.category,
      vendor: getMockVendor(detail),
      modelId: detail.id,
      payload,
    },
    taskId,
    statusEndpoint: "/mock/ai-studio/tasks/{taskId}",
    statusMode: "poll" as const,
    mediaUrls: [],
    artifacts: [],
  };
}

export function getMockAiStudioTaskResult(
  detail: AiStudioDocDetail,
  taskId = createMockTaskId(detail),
): AiStudioTaskQueryResult {
  const state = AI_STUDIO_PROVIDER_MOCK_TASK_STATE;
  const mediaUrls =
    state === "succeeded" ? getMockMediaUrls(detail.category) : [];
  const raw = {
    mocked: true,
    taskId,
    state,
    category: detail.category,
    vendor: getMockVendor(detail),
    modelId: detail.id,
    mediaUrls,
    ...(state === "failed"
      ? {
          error: AI_STUDIO_PROVIDER_MOCK_FAILURE_REASON,
          message: AI_STUDIO_PROVIDER_MOCK_FAILURE_REASON,
        }
      : {}),
  };

  return {
    detail,
    raw,
    state,
    mediaUrls,
    artifacts: [],
  };
}
