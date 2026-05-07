export type AiVideoStudioFamilyKey = string;
export type AiVideoStudioVersionKey = string;
export type AiVideoStudioLevelLimit = "none" | "standard" | "pro" | "max";

export type AiVideoStudioTag = {
  text: string;
  type: string;
};

export type AiVideoStudioFamilyIconKey =
  | "bytedance"
  | "google"
  | "grok"
  | "hailuo"
  | "jimeng"
  | "kling"
  | "nano-banana"
  | "qwen"
  | "runway"
  | "sora";

export type AiVideoStudioFamily = {
  key: AiVideoStudioFamilyKey;
  label: string;
  description: string;
  icon: AiVideoStudioFamilyIconKey;
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
  levelLimit?: AiVideoStudioLevelLimit;
};

export type AiVideoStudioModelOption = {
  familyKey: AiVideoStudioFamilyKey;
  familyLabel: string;
  value: string;
  versionKey: AiVideoStudioVersionKey;
  versionLabel: string;
  label: string;
  levelLimit: AiVideoStudioLevelLimit;
  levelLimitLabel: string | null;
};

const AI_VIDEO_STUDIO_LEVEL_LIMIT_RANK: Record<AiVideoStudioLevelLimit, number> = {
  none: 0,
  standard: 1,
  pro: 2,
  max: 3,
};

export const AI_VIDEO_STUDIO_FAMILIES: AiVideoStudioFamily[] = [
  {
    key: "gpt-image-2",
    label: "GPT Image 2",
    description: "OpenAI text-to-image and image-to-image workflows",
    icon: "sora",
    selectable: true,
    versions: [
      {
        key: "gpt-image-2-text-to-image",
        label: "GPT Image 2 Text to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-text-to-image",
      },
      {
        key: "gpt-image-2-image-to-image",
        label: "GPT Image 2 Image to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-image-to-image",
      },
    ],
  },
  {
    key: "nano-banana",
    label: "Nano Banana",
    description: "Nano Banana image generation and edit models",
    icon: "nano-banana",
    selectable: true,
    versions: [
      {
        key: "nano-banana-pro",
        label: "Nano Banana Pro",
        familyKey: "nano-banana",
        modelId: "image:google-nano-banana-pro",
      },
      {
        key: "nano-banana-2",
        label: "Nano Banana 2",
        familyKey: "nano-banana",
        modelId: "image:google-nano-banana-2",
      },
    ],
  },
  {
    key: "seedream-image",
    label: "Seedream",
    description: "Seedream image generation and edit models",
    icon: "jimeng",
    selectable: true,
    versions: [
      {
        key: "seedream-5-lite-text-to-image",
        label: "Seedream5.0 Lite - Text to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream5-0-lite-text-to-image",
      },
      {
        key: "seedream-5-lite-image-to-image",
        label: "Seedream5.0 Lite - Image to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream5-0-lite-image-to-image",
      },
      {
        key: "seedream-4.5-text-to-image",
        label: "Seedream4.5 - Text to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream4-5-text-to-image",
      },
      {
        key: "seedream-4.5-edit",
        label: "Seedream4.5 - Edit",
        familyKey: "seedream-image",
        modelId: "image:seedream4-5-edit",
      },
    ],
  },
  {
    key: "qwen2-image",
    label: "Qwen2",
    description: "Qwen2 text-to-image and image edit models",
    icon: "qwen",
    selectable: true,
    versions: [
      {
        key: "qwen2-text-to-image",
        label: "Qwen2 - Text To Image",
        familyKey: "qwen2-image",
        modelId: "image:qwen2-text-to-image",
      },
      {
        key: "qwen2-image-edit",
        label: "Qwen2 - Image Edit",
        familyKey: "qwen2-image",
        modelId: "image:qwen2-image-edit",
      },
    ],
  },
  {
    key: "grok-imagine-image",
    label: "Grok Imagine",
    description: "Grok Imagine text-to-image and image-to-image models",
    icon: "grok",
    selectable: true,
    versions: [
      {
        key: "grok-imagine-text-to-image",
        label: "Grok Imagine - Text to Image",
        familyKey: "grok-imagine-image",
        modelId: "image:grok-imagine-text-to-image",
      },
      {
        key: "grok-imagine-image-to-image",
        label: "Grok Imagine - image to image",
        familyKey: "grok-imagine-image",
        modelId: "image:grok-imagine-image-to-image",
      },
    ],
  },
  {
    key: "wan-image",
    label: "Wan Image",
    description: "Wan 2.7 image generation and edit models",
    icon: "qwen",
    selectable: true,
    versions: [
      {
        key: "wan-2.7-image",
        label: "Wan 2.7 Image",
        familyKey: "wan-image",
        modelId: "image:wan-2-7-image",
        levelLimit: "pro",
      },
      {
        key: "wan-2.7-image-pro",
        label: "Wan 2.7 Image Pro",
        familyKey: "wan-image",
        modelId: "image:wan-2-7-image-pro",
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

export function getAiVideoStudioLevelLimit(
  levelLimit?: AiVideoStudioLevelLimit | null,
): AiVideoStudioLevelLimit {
  return levelLimit ?? "none";
}

export function getAiVideoStudioLevelLabel(
  levelLimit?: AiVideoStudioLevelLimit | null,
) {
  const normalized = getAiVideoStudioLevelLimit(levelLimit);
  return normalized === "none" ? null : normalized.toUpperCase();
}

export function canUseAiVideoStudioModelForMembership(input: {
  currentLevel?: AiVideoStudioLevelLimit | null;
  requiredLevel?: AiVideoStudioLevelLimit | null;
}) {
  const current = getAiVideoStudioLevelLimit(input.currentLevel);
  const required = getAiVideoStudioLevelLimit(input.requiredLevel);
  return (
    AI_VIDEO_STUDIO_LEVEL_LIMIT_RANK[current] >=
    AI_VIDEO_STUDIO_LEVEL_LIMIT_RANK[required]
  );
}

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
      const levelLimit = getAiVideoStudioLevelLimit(version.levelLimit);
      const levelLimitLabel = getAiVideoStudioLevelLabel(levelLimit);

      options.push({
        familyKey: family.key,
        familyLabel: family.label,
        value: `${family.key}::${version.key}`,
        versionKey: version.key,
        versionLabel: version.label,
        label: levelLimitLabel
          ? `${version.label} (${levelLimitLabel})`
          : version.label,
        levelLimit,
        levelLimitLabel,
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

export function resolveAiVideoStudioLevelLimitFromModelId(modelId: string) {
  const selection = getAiVideoStudioSelectionFromModelId(modelId);
  if (!selection) {
    return "none";
  }

  const version = getAiVideoStudioVersions(selection.familyKey).find(
    (item) => item.key === selection.versionKey,
  );

  return getAiVideoStudioLevelLimit(version?.levelLimit);
}
