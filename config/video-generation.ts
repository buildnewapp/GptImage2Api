import {
  calculateCreditsForImplementation,
  findImplementationByModelId,
  getAllModelIds,
  type VideoInputPayload,
} from "@/config/model_config";

export const VALID_MODELS = getAllModelIds();

// 兼容旧代码：提供一个静态映射占位（按每个模型最小档位估算）
export const VIDEO_MODEL_CREDITS: Record<string, number> = Object.fromEntries(
  VALID_MODELS.map((modelId) => [modelId, 10]),
);

export function getModelCredits(
  model: string,
  input?: VideoInputPayload,
): number | null {
  const resolved = findImplementationByModelId(model);
  if (!resolved) return null;

  if (!input) {
    return VIDEO_MODEL_CREDITS[model] ?? null;
  }

  return calculateCreditsForImplementation(resolved.implementation, input);
}

