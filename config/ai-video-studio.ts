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
  versions: AiVideoStudioVersion[];
};

export type AiVideoStudioVersion = {
  key: AiVideoStudioVersionKey;
  label: string;
  familyKey: AiVideoStudioFamilyKey;
  modelId: string;
  aliases?: string[];
};

export type AiVideoStudioModelOption = {
  familyKey: AiVideoStudioFamilyKey;
  familyLabel: string;
  value: string;
  versionKey: AiVideoStudioVersionKey;
  versionLabel: string;
  label: string;
};

export const AI_VIDEO_STUDIO_FAMILIES: AiVideoStudioFamily[] = [
  {
    key: "seedance-2.0",
    label: "Seedance 2.0",
    description: "Seedance 2.0 for prompt-first and reference-driven video generation",
    tags: [
      { text: "HOT", type: "hot" },
    ],
    selectable: true,
    versions: [
      {
        key: "seedance-2.0",
        label: "Seedance 2.0",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0",
        aliases: ["video:apimart-seedance-2-0"],
      },
      {
        key: "seedance-2.0-fast",
        label: "Seedance 2.0 fast",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0-fast",
        aliases: ["video:apimart-seedance-2-0-fast"],
      },
      {
        key: "seedance-2.0-vip",
        label: "Seedance 2.0 VIP",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0-vip",
      },
      {
        key: "seedance-2.0-fast-vip",
        label: "Seedance 2.0 Fast VIP",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0-fast-vip",
      },
    ],
  },
  {
    key: "seedance-1.5",
    label: "Seedance 1.5",
    description: "Joint audio-video with multilingual lip-sync",
    tags: [
      { text: "With Audio", type: "audio" },
    ],
    versions: [
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
    ],
  },

  {
    key: "seedance-1.0",
    label: "Seedance 1.0",
    description: "Advanced model with smooth, stable motion",
    versions: [
      {
        key: "seedance-1.0",
        label: "Seedance 1.0",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-lite-text-to-video",
      },
    ],
  },
  {
    key: "sora2",
    label: "Sora 2",
    description: "OpenAI model with realistic physics",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
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
    ],
  },
  {
    key: "veo-3.1",
    label: "Veo 3.1",
    description: "Google's latest video model with native audio",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
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
    ],
  },
];

export function getAiVideoStudioSelectionFromModelId(modelId: string) {
  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    for (const version of family.versions) {
      if (
        version.modelId === modelId ||
        version.aliases?.includes(modelId)
      ) {
        return {
          familyKey: version.familyKey,
          versionKey: version.key,
        };
      }
    }
  }

  return null;
}

export const resolveAiVideoStudioSelectionFromModelId =
  getAiVideoStudioSelectionFromModelId;

export function getAiVideoStudioVersions(
  familyKey: AiVideoStudioFamilyKey,
) {
  return (
    AI_VIDEO_STUDIO_FAMILIES.find((family) => family.key === familyKey)?.versions ??
    []
  );
}

export function listAiVideoStudioModelOptions(): AiVideoStudioModelOption[] {
  const options: AiVideoStudioModelOption[] = [];

  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    if (family.selectable === false) {
      continue;
    }

    for (const version of getAiVideoStudioVersions(family.key)) {
      options.push({
        familyKey: family.key,
        familyLabel: family.label,
        value: `${family.key}::${version.key}`,
        versionKey: version.key,
        versionLabel: version.label,
        label: version.label,
      });
    }
  }

  return options;
}

export function resolveAiVideoStudioModelId(input: {
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
}) {
  const version = getAiVideoStudioVersions(input.familyKey).find(
    (item) => item.key === input.versionKey,
  );

  return version?.modelId ?? null;
}
