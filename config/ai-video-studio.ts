export type AiVideoStudioFamilyKey = string;
export type AiVideoStudioVersionKey = string;

export type AiVideoStudioTag = {
  text: string;
  type: string;
};

export type AiVideoStudioFamily = {
  key: AiVideoStudioFamilyKey;
  label: string;
  description: string;
  tags?: AiVideoStudioTag[];
  selectable?: boolean;
};

export type AiVideoStudioVersion = {
  key: AiVideoStudioVersionKey;
  label: string;
  familyKey: AiVideoStudioFamilyKey;
  modelId: string;
};

export const AI_VIDEO_STUDIO_FAMILIES: AiVideoStudioFamily[] = [
  {
    key: "seedance-1.5",
    label: "Seedance 1.5",
    description: "Joint audio-video with multilingual lip-sync",
    tags: [
      { text: "HOT", type: "hot" },
      { text: "With Audio", type: "audio" },
    ],
  },
  {
    key: "seedance-2.0",
    label: "Seedance 2.0",
    description:
      "APIMart-hosted Seedance 2.0 for prompt-first and reference-driven video generation",
    tags: [{ text: "APIMart", type: "provider" }],
    selectable: true,
  },
  {
    key: "seedance-1.0",
    label: "Seedance 1.0",
    description: "Advanced model with smooth, stable motion",
  },
  {
    key: "sora2",
    label: "Sora 2",
    description: "OpenAI model with realistic physics",
    tags: [{ text: "With Audio", type: "audio" }],
  },
  {
    key: "veo-3.1",
    label: "Veo 3.1",
    description: "Google's latest video model with native audio",
    tags: [{ text: "With Audio", type: "audio" }],
  },
];

const AI_VIDEO_STUDIO_VERSIONS: AiVideoStudioVersion[] = [
  {
    key: "seedance-1.5",
    label: "Seedance 1.5",
    familyKey: "seedance-1.5",
    modelId: "video:bytedance-v1-pro-text-to-video",
  },
  {
    key: "seedance-1.5-fast",
    label: "Seedance 1.5 Fast",
    familyKey: "seedance-1.5",
    modelId: "video:bytedance-v1-pro-fast-image-to-video",
  },
  {
    key: "seedance-2.0",
    label: "Seedance 2.0",
    familyKey: "seedance-2.0",
    modelId: "video:apimart-seedance-2-0",
  },
  {
    key: "seedance-1.0",
    label: "Seedance 1.0",
    familyKey: "seedance-1.0",
    modelId: "video:bytedance-v1-lite-text-to-video",
  },
  {
    key: "sora-2",
    label: "Sora 2",
    familyKey: "sora2",
    modelId: "video:sora2-text-to-video-standard",
  },
  {
    key: "sora-2-pro",
    label: "Sora 2 Pro",
    familyKey: "sora2",
    modelId: "video:sora2-pro-text-to-video",
  },
  {
    key: "sora-2-pro-storyboard",
    label: "Sora 2 Pro Storyboard",
    familyKey: "sora2",
    modelId: "video:sora2-pro-storyboard",
  },
  {
    key: "veo-3.1-fast",
    label: "Veo 3.1 Fast",
    familyKey: "veo-3.1",
    modelId: "video:veo-3.1-fast-text-to-video",
  },
  {
    key: "veo-3.1-quality",
    label: "Veo 3.1 Quality",
    familyKey: "veo-3.1",
    modelId: "video:veo-3.1-quality-text-to-video",
  },
];

export function getAiVideoStudioSelectionFromModelId(modelId: string) {
  for (const version of AI_VIDEO_STUDIO_VERSIONS) {
    if (version.modelId === modelId) {
      return {
        familyKey: version.familyKey,
        versionKey: version.key,
      };
    }
  }

  return null;
}

export const resolveAiVideoStudioSelectionFromModelId =
  getAiVideoStudioSelectionFromModelId;

export function getAiVideoStudioVersions(
  familyKey: AiVideoStudioFamilyKey,
) {
  return AI_VIDEO_STUDIO_VERSIONS.filter(
    (version) => version.familyKey === familyKey,
  );
}

export function resolveAiVideoStudioModelId(input: {
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
}) {
  const version = AI_VIDEO_STUDIO_VERSIONS.find(
    (item) =>
      item.familyKey === input.familyKey && item.key === input.versionKey,
  );

  return version?.modelId ?? null;
}
