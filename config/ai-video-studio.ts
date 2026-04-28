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
