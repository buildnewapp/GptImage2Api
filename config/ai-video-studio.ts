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
    label: "Seedance 1.5 Pro",
    description: "Joint audio-video with multilingual lip-sync",
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
