"use client";

import type { VideoInputPayload } from "@/config/model_config";
import type { ProviderFieldsProps, ProviderFormValues, ProviderMeta } from "./types";

import SeedanceFields, { getSeedanceMeta } from "./SeedanceFields";
import SoraFields, { getSoraMeta } from "./SoraFields";
import VeoFields, { getVeoMeta } from "./VeoFields";

/**
 * modelId → 模型组件的路由映射。
 * "model" 标识使用哪个组件，"getMeta" 返回对应版本的元信息。
 */
type ModelEntry = {
  model: "seedance" | "sora" | "veo";
  getMeta: (modelId: string) => ProviderMeta;
};

const MODEL_ROUTING: Record<string, ModelEntry> = {
  // Seedance 2
  "bytedance/v1-pro-text-to-video": { model: "seedance", getMeta: getSeedanceMeta },
  "bytedance/v1-pro-image-to-video": { model: "seedance", getMeta: getSeedanceMeta },
  "bytedance/v1-pro-fast-image-to-video": { model: "seedance", getMeta: getSeedanceMeta },
  // Seedance 1.0
  "bytedance/v1-lite-text-to-video": { model: "seedance", getMeta: getSeedanceMeta },
  "bytedance/v1-lite-image-to-video": { model: "seedance", getMeta: getSeedanceMeta },
  // Sora 2
  "sora-2-text-to-video": { model: "sora", getMeta: getSoraMeta },
  "sora-2-image-to-video": { model: "sora", getMeta: getSoraMeta },
  // Sora 2 Pro
  "sora-2-pro-text-to-video": { model: "sora", getMeta: getSoraMeta },
  "sora-2-pro-image-to-video": { model: "sora", getMeta: getSoraMeta },
  // Sora 2 Pro Storyboard
  "sora-2-pro-storyboard": { model: "sora", getMeta: getSoraMeta },
  // Veo 3.1
  "veo3": { model: "veo", getMeta: getVeoMeta },
  "veo3_fast": { model: "veo", getMeta: getVeoMeta },
};

function getEntry(modelId: string) {
  return MODEL_ROUTING[modelId] ?? null;
}

/* ─── 公共 API ─── */

export function getDefaultValuesForModel(modelId: string): ProviderFormValues {
  return getEntry(modelId)?.getMeta(modelId).getDefaultValues() ?? {};
}

export function buildPayloadForModel(
  modelId: string,
  values: ProviderFormValues,
): VideoInputPayload {
  return getEntry(modelId)?.getMeta(modelId).buildPayload(values) ?? {};
}

export function getProviderMeta(modelId: string): ProviderMeta | null {
  return getEntry(modelId)?.getMeta(modelId) ?? null;
}

/* ─── 渲染组件 ─── */

type ProviderFieldsRendererProps = ProviderFieldsProps & {
  modelId: string;
};

export function ProviderFieldsRenderer({
  modelId,
  ...props
}: ProviderFieldsRendererProps) {
  const entry = getEntry(modelId);
  if (!entry) return null;

  switch (entry.model) {
    case "seedance":
      return <SeedanceFields modelId={modelId} {...props} />;
    case "sora":
      return <SoraFields modelId={modelId} {...props} />;
    case "veo":
      return <VeoFields {...props} />;
    default:
      return null;
  }
}
