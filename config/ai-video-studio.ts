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
    key: "seedance-2.0",
    label: "Seedance 2.0",
    description: "Seedance 2.0 for prompt-first and reference-driven video generation",
    icon: "bytedance",
    tags: [
      { text: "HOT", type: "hot" },
    ],
    selectable: true,
    versions: [
      {
        key: "seedance-2.0-vip",
        label: "Seedance 2.0",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0-vip",
      },
      {
        key: "seedance-2.0-fast-vip",
        label: "Seedance 2.0 Fast",
        familyKey: "seedance-2.0",
        modelId: "video:seedance-2-0-fast-vip",
      },
    ],
  },
  {
    key: "seedance-1.5",
    label: "Seedance 1.5 Pro",
    description: "Joint audio-video with multilingual lip-sync",
    icon: "bytedance",
    tags: [
      { text: "With Audio", type: "audio" },
    ],
    versions: [
      {
        key: "seedance-1.5",
        label: "Seedance 1.5 Pro",
        familyKey: "seedance-1.5",
        modelId: "video:bytedance-seedance-1-5-pro"
      }
    ],
  },

  {
    key: "seedance-1.0",
    label: "Seedance 1.0",
    description: "Advanced model with smooth, stable motion",
    icon: "bytedance",
    versions: [
      {
        key: "seedance-1.0-pro-text-to-video",
        label: "V1 Pro Text To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-pro-text-to-video",
      },
      {
        key: "seedance-1.0-pro-image-to-video",
        label: "V1 Pro Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-pro-image-to-video",
      },
      {
        key: "seedance-1.0-lite-text-to-video",
        label: "V1 Lite Text To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-lite-text-to-video",
      },
      {
        key: "seedance-1.0-lite-image-to-video",
        label: "V1 Lite Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-lite-image-to-video",
      },
      {
        key: "seedance-1.0-pro-fast-image-to-video",
        label: "V1 Pro Fast Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-pro-fast-image-to-video",
      },
    ],
  },
  {
    key: "sora2",
    label: "Sora 2",
    description: "OpenAI model with realistic physics",
    icon: "sora",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
      {
        key: "sora-2",
        label: "Sora 2 Text to Video",
        familyKey: "sora2",
        modelId: "video:sora2-text-to-video-standard",
      },
      {
        key: "sora-2-image-to-video",
        label: "Sora 2 Image to Video",
        familyKey: "sora2",
        modelId: "video:sora2-image-to-video-standard",
      },
      {
        key: "sora-2-stable",
        label: "Sora 2 Text to Video Stable",
        familyKey: "sora2",
        modelId: "video:sora2-text-to-video-stable",
      },
      {
        key: "sora-2-image-to-video-stable",
        label: "Sora 2 Image to Video Stable",
        familyKey: "sora2",
        modelId: "video:sora2-image-to-video-stable",
      },
      {
        key: "sora-2-pro",
        label: "Sora 2 Pro Text to Video",
        familyKey: "sora2",
        modelId: "video:sora2-pro-text-to-video",
      },
      {
        key: "sora-2-pro-image-to-video",
        label: "Sora 2 Pro Image to Video",
        familyKey: "sora2",
        modelId: "video:sora2-pro-image-to-video",
      },
      {
        key: "sora-2-pro-storyboard",
        label: "Sora 2 Pro Storyboard",
        familyKey: "sora2",
        modelId: "video:sora2-pro-storyboard",
        levelLimit: "pro",
      },
    ],
  },
  {
    key: "veo-3.1",
    label: "Veo 3.1",
    description: "Google's latest video model with native audio",
    icon: "google",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
      {
        key: "veo-3.1-lite",
        label: "Veo 3.1 Lite",
        familyKey: "veo-3.1",
        modelId: "video:veo-3.1-lite",
      },
      {
        key: "veo-3.1-fast",
        label: "Veo 3.1 Fast",
        familyKey: "veo-3.1",
        modelId: "video:veo-3.1-fast",
      },
      {
        key: "veo-3.1-quality",
        label: "Veo 3.1 Quality",
        familyKey: "veo-3.1",
        modelId: "video:veo-3.1-quality",
      },
      {
        key: "veo-3.1-extend",
        label: "Veo 3.1 Extend",
        familyKey: "veo-3.1",
        modelId: "video:extend-veo3-1-video",
      },
      {
        key: "veo-3.1-get-1080p",
        label: "Veo 3.1 Get 1080P",
        familyKey: "veo-3.1",
        modelId: "video:get-veo3-1-1080p-video",
      },
      {
        key: "veo-3.1-get-4k",
        label: "Veo 3.1 Get 4K",
        familyKey: "veo-3.1",
        modelId: "video:get-veo3-1-4k-video",
      },
    ],
  },
  {
    key: "grok-imagine",
    label: "Grok Imagine",
    description: "Grok video generation with text, image, extend, and upscale variants",
    icon: "grok",
    selectable: true,
    versions: [
      {
        key: "grok-imagine-text-to-video",
        label: "Grok Imagine Text to Video",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-text-to-video",
      },
      {
        key: "grok-imagine-image-to-video",
        label: "Grok Imagine Image to Video",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-image-to-video",
      },
      {
        key: "grok-imagine-video-upscale",
        label: "Grok Imagine Video Upscale",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-video-upscale",
      },
      {
        key: "grok-imagine-video-extend",
        label: "Grok Imagine Video Extend",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-video-extend",
      },
    ],
  },
  {
    key: "kling",
    label: "Kling",
    description: "Kling video models across 2.1, 2.5, 2.6, and 3.0 variants",
    icon: "kling",
    selectable: true,
    versions: [
      {
        key: "kling-3.0",
        label: "Kling 3.0",
        familyKey: "kling",
        modelId: "video:kling-3-0",
      },
      {
        key: "kling-3.0-motion-control",
        label: "Kling 3.0 Motion Control",
        familyKey: "kling",
        modelId: "video:kling-3-0-motion-control",
      },
      {
        key: "kling-2.6-text-to-video",
        label: "Kling 2.6 Text to Video",
        familyKey: "kling",
        modelId: "video:kling-2-6-text-to-video",
      },
      {
        key: "kling-2.6-image-to-video",
        label: "Kling 2.6 Image to Video",
        familyKey: "kling",
        modelId: "video:kling-2-6-image-to-video",
      },
      {
        key: "kling-2.6-motion-control",
        label: "Kling 2.6 Motion Control",
        familyKey: "kling",
        modelId: "video:kling-2-6-motion-control",
      },
      {
        key: "kling-2.5-turbo-text-to-video-pro",
        label: "Kling 2.5 Turbo Text to Video Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-5-turbo-text-to-video-pro",
      },
      {
        key: "kling-2.5-turbo-image-to-video-pro",
        label: "Kling 2.5 Turbo Image to Video Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-5-turbo-image-to-video-pro",
      },
      {
        key: "kling-v2.1-master-text-to-video",
        label: "Kling V2.1 Master Text to Video",
        familyKey: "kling",
        modelId: "video:kling-v2-1-master-text-to-video",
      },
      {
        key: "kling-v2.1-master-image-to-video",
        label: "Kling V2.1 Master Image to Video",
        familyKey: "kling",
        modelId: "video:kling-v2-1-master-image-to-video",
      },
      {
        key: "kling-v2.1-pro",
        label: "Kling V2.1 Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-1-pro",
      },
      {
        key: "kling-v2.1-standard",
        label: "Kling V2.1 Standard",
        familyKey: "kling",
        modelId: "video:kling-v2-1-standard",
      },
      {
        key: "kling-ai-avatar-standard",
        label: "Kling AI Avatar Standard",
        familyKey: "kling",
        modelId: "video:kling-ai-avatar-standard",
      },
      {
        key: "kling-ai-avatar-pro",
        label: "Kling AI Avatar Pro",
        familyKey: "kling",
        modelId: "video:kling-ai-avatar-pro",
      },
    ],
  },
  {
    key: "wan",
    label: "Wan",
    description: "Wan video models across 2.2, 2.5, 2.6, and 2.7 workflows",
    icon: "qwen",
    selectable: true,
    versions: [
      {
        key: "wan-2.7-text-to-video",
        label: "Wan 2.7 Text to Video",
        familyKey: "wan",
        modelId: "video:wan-2-7-text-to-video",
      },
      {
        key: "wan-2.7-image-to-video",
        label: "Wan 2.7 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-7-image-to-video",
      },
      {
        key: "wan-2.7-video-edit",
        label: "Wan 2.7 Video Edit",
        familyKey: "wan",
        modelId: "video:wan-2-7-video-edit",
      },
      {
        key: "wan-2.7-reference-to-video",
        label: "Wan 2.7 Reference to Video",
        familyKey: "wan",
        modelId: "video:wan-2-7-reference-to-video",
      },
      {
        key: "wan-2.6-text-to-video",
        label: "Wan 2.6 Text to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-text-to-video",
      },
      {
        key: "wan-2.6-image-to-video",
        label: "Wan 2.6 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-image-to-video",
      },
      {
        key: "wan-2.6-video-to-video",
        label: "Wan 2.6 Video to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-video-to-video",
      },
      {
        key: "wan-2.5-text-to-video",
        label: "Wan 2.5 Text to Video",
        familyKey: "wan",
        modelId: "video:wan-2-5-text-to-video",
      },
      {
        key: "wan-2.5-image-to-video",
        label: "Wan 2.5 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-5-image-to-video",
      },
      {
        key: "wan-text-to-video",
        label: "Wan Text to Video",
        familyKey: "wan",
        modelId: "video:wan-text-to-video",
      },
      {
        key: "wan-image-to-video",
        label: "Wan Image to Video",
        familyKey: "wan",
        modelId: "video:wan-image-to-video",
      },
      {
        key: "wan-2.2-a14b-speech-to-video-turbo",
        label: "Wan 2.2 A14B Speech to Video Turbo",
        familyKey: "wan",
        modelId: "video:wan-2-2-a14b-speech-to-video-turbo",
      },
      {
        key: "wan-animate-move",
        label: "Wan Animate Move",
        familyKey: "wan",
        modelId: "video:wan-animate-move",
      },
      {
        key: "wan-animate-replace",
        label: "Wan Animate Replace",
        familyKey: "wan",
        modelId: "video:wan-animate-replace",
      },
    ],
  },
  {
    key: "hailuo",
    label: "Hailuo",
    description: "Hailuo text-to-video and image-to-video variants, including 2.3 image models",
    icon: "hailuo",
    selectable: true,
    versions: [
      {
        key: "hailuo-standard-text-to-video",
        label: "Hailuo Standard Text to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-standard-text-to-video",
      },
      {
        key: "hailuo-standard-image-to-video",
        label: "Hailuo Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-standard-image-to-video",
      },
      {
        key: "hailuo-pro-text-to-video",
        label: "Hailuo Pro Text to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-pro-text-to-video",
      },
      {
        key: "hailuo-pro-image-to-video",
        label: "Hailuo Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-pro-image-to-video",
      },
      {
        key: "hailuo-2.3-standard-image-to-video",
        label: "Hailuo 2.3 Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-2-3-standard-image-to-video",
      },
      {
        key: "hailuo-2.3-pro-image-to-video",
        label: "Hailuo 2.3 Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-2-3-pro-image-to-video",
      },
    ],
  },
  {
    key: "runway",
    label: "Runway",
    description: "Runway video generation endpoints",
    icon: "runway",
    selectable: true,
    versions: [
      {
        key: "runway-generate-ai-video",
        label: "Runway Generate AI Video",
        familyKey: "runway",
        modelId: "video:generate-ai-video",
      },
      {
        key: "runway-generate-aleph-video",
        label: "Runway Generate Aleph Video",
        familyKey: "runway",
        modelId: "video:generate-aleph-video",
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
    key: "gpt-image-2",
    label: "GPT Image 2",
    description: "OpenAI text-to-image and image-to-image workflows",
    icon: "sora",
    selectable: true,
    versions: [
      {
        key: "gpt-image-2-text-to-image",
        label: "Text to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-text-to-image",
      },
      {
        key: "gpt-image-2-image-to-image",
        label: "Image to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-image-to-image",
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
