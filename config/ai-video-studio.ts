export type AiVideoStudioFamilyKey = string;
export type AiVideoStudioVersionKey = string;

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
