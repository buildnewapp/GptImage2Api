import type {
  AiVideoStudioFamilyKey,
  AiVideoStudioVersionKey,
} from "@/config/ai-video-studio";
import type { AiVideoStudioFormValues } from "@/lib/ai-video-studio/adapter";

export type AiVideoMiniStudioGenerationTaskState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type AiVideoMiniStudioGenerationTask = {
  localId: string;
  taskId?: string;
  state: AiVideoMiniStudioGenerationTaskState;
  mediaUrls: string[];
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  modelId: string;
  prompt: string;
  formValues: AiVideoStudioFormValues;
  creditsRequired: number;
  progress: number;
  createdAt: number;
};

function createAiVideoMiniStudioTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPromptText(
  formValues: AiVideoStudioFormValues,
  promptFieldKey: string,
) {
  const promptValue = formValues[promptFieldKey];

  if (typeof promptValue !== "string") {
    return "-";
  }

  const trimmedPrompt = promptValue.trim();
  return trimmedPrompt.length > 0 ? trimmedPrompt : "-";
}

export function createAiVideoMiniStudioGenerationTask(input: {
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  modelId: string;
  formValues: AiVideoStudioFormValues;
  creditsRequired: number;
  promptFieldKey: string;
  now?: number;
  createId?: () => string;
}): AiVideoMiniStudioGenerationTask {
  return {
    localId: input.createId?.() ?? createAiVideoMiniStudioTaskId(),
    taskId: undefined,
    state: "queued",
    mediaUrls: [],
    familyKey: input.familyKey,
    versionKey: input.versionKey,
    modelId: input.modelId,
    prompt: getPromptText(input.formValues, input.promptFieldKey),
    formValues: { ...input.formValues },
    creditsRequired: input.creditsRequired,
    progress: 5,
    createdAt: input.now ?? Date.now(),
  };
}

export function resolveAiVideoMiniStudioTaskState(
  state: string | null | undefined,
): AiVideoMiniStudioGenerationTaskState {
  if (state === "succeeded" || state === "failed") {
    return state;
  }

  if (state === "running") {
    return "running";
  }

  if (state === "queued" || !state) {
    return "queued";
  }

  return "running";
}
