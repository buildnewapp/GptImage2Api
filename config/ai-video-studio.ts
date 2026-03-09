export type AiVideoStudioMode = "text-to-video" | "image-to-video";
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
  modelIds: Partial<Record<AiVideoStudioMode, string>>;
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
    description: "Open only to invited personnel; if needed, please apply by email",
    tags: [{ text: "Targeted opening", type: "coming-soon" }],
    selectable: false,
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
    modelIds: {
      "text-to-video": "video:bytedance-v1-pro-text-to-video",
      "image-to-video": "video:bytedance-v1-pro-image-to-video",
    },
  },
  {
    key: "seedance-1.5-fast",
    label: "Seedance 1.5 Fast",
    familyKey: "seedance-1.5",
    modelIds: {
      "image-to-video": "video:bytedance-v1-pro-fast-image-to-video",
    },
  },
  {
    key: "seedance-2.0",
    label: "Seedance 2.0",
    familyKey: "seedance-2.0",
    modelIds: {},
  },
  {
    key: "seedance-1.0",
    label: "Seedance 1.0",
    familyKey: "seedance-1.0",
    modelIds: {
      "text-to-video": "video:bytedance-v1-lite-text-to-video",
      "image-to-video": "video:bytedance-v1-lite-image-to-video",
    },
  },
  {
    key: "sora-2",
    label: "Sora 2",
    familyKey: "sora2",
    modelIds: {
      "text-to-video": "video:sora2-text-to-video-standard",
      "image-to-video": "video:sora2-image-to-video-standard",
    },
  },
  {
    key: "sora-2-pro",
    label: "Sora 2 Pro",
    familyKey: "sora2",
    modelIds: {
      "text-to-video": "video:sora2-pro-text-to-video",
      "image-to-video": "video:sora2-pro-image-to-video",
    },
  },
  {
    key: "veo-3.1",
    label: "Veo 3.1",
    familyKey: "veo-3.1",
    modelIds: {
      "text-to-video": "video:generate-veo3-1-video",
      "image-to-video": "video:generate-veo3-1-video",
    },
  },
];

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
  mode: AiVideoStudioMode;
}) {
  const version = AI_VIDEO_STUDIO_VERSIONS.find(
    (item) =>
      item.familyKey === input.familyKey && item.key === input.versionKey,
  );

  if (!version) {
    return null;
  }

  return version.modelIds[input.mode] ?? null;
}
