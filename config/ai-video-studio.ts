export type AiVideoStudioFamilyKey = string;
export type AiVideoStudioVersionKey = string;
export type AiVideoStudioLevelLimit = "none" | "standard" | "pro" | "max";

export type AiVideoStudioTag = {
  text: string;
  type: string;
};

export type AiVideoStudioFamilyIconKey =
  | "alibaba-cloud"
  | "bytedance"
  | "gemini"
  | "google"
  | "grok"
  | "hailuo"
  | "jimeng"
  | "kling"
  | "meta-muse"
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
  description?: string;
  modelId: string;
  isSpecial?: boolean;
  isHot?: boolean;
  levelLimit?: AiVideoStudioLevelLimit;
};

export type AiVideoStudioModelOption = {
  familyKey: AiVideoStudioFamilyKey;
  familyLabel: string;
  value: string;
  versionKey: AiVideoStudioVersionKey;
  versionLabel: string;
  label: string;
  isSpecial: boolean;
  isHot: boolean;
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
    key: "seedance-2.5",
    label: "Seedance 2.5",
    description: "Seedance 2.5 video generation with text, image, and reference inputs",
    icon: "bytedance",
    tags: [{ text: "Coming Soon", type: "coming-soon" }],
    selectable: false,
    versions: [
      {
        key: "seedance-2-5-text-to-video",
        label: "Text to Video",
        familyKey: "seedance-2.5",
        modelId: "video:seedance-2-5-text-to-video",
        description: "Create video from a text prompt.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "seedance-2-5-image-to-video",
        label: "Image to Video",
        familyKey: "seedance-2.5",
        modelId: "video:seedance-2-5-image-to-video",
        description: "Animate a source image into video.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "seedance-2-5-reference-to-video",
        label: "Reference to Video",
        familyKey: "seedance-2.5",
        modelId: "video:seedance-2-5-reference-to-video",
        description: "Create video guided by reference assets.",
        isSpecial: true,
        isHot: true,
      },
    ],
  },
  {
    key: "meta-muse-video",
    label: "Meta Muse Video",
    description: "Meta Muse video generation model",
    icon: "meta-muse",
    tags: [{ text: "Coming Soon", type: "coming-soon" }],
    selectable: false,
    versions: [
      {
        key: "meta-muse-text-to-video",
        label: "Text to Video",
        familyKey: "meta-muse-video",
        modelId: "video:meta-muse-text-to-video",
        description: "Create video from a text prompt.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "meta-muse-image-to-video",
        label: "Image to Video",
        familyKey: "meta-muse-video",
        modelId: "video:meta-muse-image-to-video",
        description: "Animate a source image into video.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "meta-muse-reference-to-video",
        label: "Reference to Video",
        familyKey: "meta-muse-video",
        modelId: "video:meta-muse-reference-to-video",
        description: "Create video guided by reference images.",
        isSpecial: true,
        isHot: true,
      },
    ],
  },
  {
    key: "grok-imagine",
    label: "Grok Imagine",
    description: "Grok video generation with text, image, extend, and upscale variants",
    icon: "grok",
    tags: [{ text: "HOT", type: "hot" }],
    selectable: true,
    versions: [
      {
        key: "grok-imagine-text-to-video",
        label: "Grok Imagine Text to Video",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-text-to-video",
        isSpecial: true
      },
      {
        key: "grok-imagine-image-to-video",
        label: "Grok Imagine Image to Video",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-image-to-video",
        isSpecial: true
      },
      {
        key: "grok-imagine-video-upscale",
        label: "Grok Imagine Video Upscale",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-video-upscale",
        isSpecial: true,
      },
      {
        key: "grok-imagine-video-extend",
        label: "Grok Imagine Video Extend",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-video-extend",
        isSpecial: true,
      },
      {
        key: "grok-imagine-video-1.5-preview",
        label: "Grok Imagine Video 1.5 Preview",
        familyKey: "grok-imagine",
        modelId: "video:grok-imagine-video-1-5-preview",
        isSpecial: true,
      },
      {
        key: "fal-grok-imagine-text-to-video",
        label: "Grok Imagine Text to Video",
        familyKey: "grok-imagine",
        modelId: "video:fal-xai-grok-imagine-video-text-to-video",
        isHot: true
      },
      {
        key: "fal-grok-imagine-image-to-video",
        label: "Grok Imagine Image to Video",
        familyKey: "grok-imagine",
        modelId: "video:fal-xai-grok-imagine-video-image-to-video",
        isHot: true
      },
      {
        key: "fal-grok-imagine-1.5-image-to-video",
        label: "Grok Imagine 1.5 Image to Video",
        familyKey: "grok-imagine",
        modelId: "video:fal-xai-grok-imagine-video-v1-5-image-to-video",
        isHot: true
      },
      {
        key: "fal-grok-imagine-reference-to-video",
        label: "Grok Imagine Reference to Video",
        familyKey: "grok-imagine",
        modelId: "video:fal-xai-grok-imagine-video-reference-to-video",
      },
      {
        key: "fal-grok-imagine-video-edit",
        label: "Grok Imagine Video Edit",
        familyKey: "grok-imagine",
        modelId: "video:fal-xai-grok-imagine-video-edit-video",
      },
    ],
  },
  {
    key: "gemini-omni",
    label: "Gemini Omni",
    description: "Gemini Omni video generation with text and image variants",
    icon: "gemini",
    tags: [{ text: "HOT", type: "hot" }],
    selectable: true,
    versions: [
      {
        key: "omni-flash-ext",
        label: "Gemini Omni Flash Lite",
        familyKey: "gemini-omni",
        modelId: "video:am-omni-flash-ext",
        isSpecial: true,
      },
      {
        key: "gemini-omni-video",
        label: "Gemini Omni Video",
        familyKey: "gemini-omni",
        modelId: "video:gemini-omni-video",
        isSpecial: true,
        isHot: true
      },
      {
        key: "gemini-omni-character",
        label: "Gemini Omni Character",
        familyKey: "gemini-omni",
        modelId: "video:gemini-omni-character",
        isSpecial: true,
      },
      {
        key: "gemini-omni-audio",
        label: "Gemini Omni Audio",
        familyKey: "gemini-omni",
        modelId: "video:gemini-omni-audio",
        isSpecial: true,
      }
    ],
  },
  {
    key: "seedance-2.0",
    label: "Seedance 2.0",
    description: "Seedance 2.0 for prompt-first and reference-driven video generation",
    icon: "bytedance",
    tags: [{ text: "HOT", type: "hot" },{ text: "With Audio", type: "audio" }],
    selectable: true,
    versions: [
      {
        key: "seedance-2.0",
        label: "Seedance 2.0",
        familyKey: "seedance-2.0",
        modelId: "video:bytedance-seedance-2",
        isSpecial: true,
      },
      {
        key: "seedance-2.0-fast",
        label: "Seedance 2.0 Fast",
        familyKey: "seedance-2.0",
        modelId: "video:bytedance-seedance-2-0-fast",
        isSpecial: true,
      },
      {
        key: "seedance-2.0-mini",
        label: "Seedance 2.0 Mini",
        familyKey: "seedance-2.0",
        modelId: "video:bytedance-seedance-2-0-mini",
        isSpecial: true,
      },
      {
        key: "fal-seedance-2.0-text-to-video",
        label: "Seedance 2.0 Text to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-text-to-video",
        levelLimit: "pro",
        isHot: true
      },
      {
        key: "fal-seedance-2.0-fast-text-to-video",
        label: "Seedance 2.0 Fast Text to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-fast-text-to-video",
        isHot: true
      },
      {
        key: "fal-seedance-2.0-image-to-video",
        label: "Seedance 2.0 Image to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-image-to-video",
        levelLimit: "pro"
      },
      {
        key: "fal-seedance-2.0-fast-image-to-video",
        label: "Seedance 2.0 Fast Image to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-fast-image-to-video",
      },
      {
        key: "fal-seedance-2.0-reference-to-video",
        label: "Seedance 2.0 Reference to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-reference-to-video",
        levelLimit: "pro"
      },
      {
        key: "fal-seedance-2.0-fast-reference-to-video",
        label: "Seedance 2.0 Fast Reference to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-fast-reference-to-video",
      },
      {
        key: "fal-seedance-2.0-mini-text-to-video",
        label: "Seedance 2.0 Mini Text to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-mini-text-to-video",
      },
      {
        key: "fal-seedance-2.0-mini-image-to-video",
        label: "Seedance 2.0 Mini Image to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-mini-image-to-video",
      },
      {
        key: "fal-seedance-2.0-mini-reference-to-video",
        label: "Seedance 2.0 Mini Reference to Video",
        familyKey: "seedance-2.0",
        modelId: "video:fal-bytedance-seedance-2-0-mini-reference-to-video",
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
        modelId: "video:bytedance-seedance-1-5-pro",
        isSpecial: true,
      },
      {
        key: "fal-seedance-1.5-pro-text-to-video",
        label: "Seedance 1.5 Pro Text to Video",
        familyKey: "seedance-1.5",
        modelId: "video:fal-fal-ai-bytedance-seedance-v1-5-pro-text-to-video",
      },
      {
        key: "fal-seedance-1.5-pro-image-to-video",
        label: "Seedance 1.5 Pro Image to Video",
        familyKey: "seedance-1.5",
        modelId: "video:fal-fal-ai-bytedance-seedance-v1-5-pro-image-to-video",
      },
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
        isSpecial: true,
      },
      {
        key: "seedance-1.0-pro-image-to-video",
        label: "V1 Pro Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-pro-image-to-video",
        isSpecial: true,
      },
      {
        key: "seedance-1.0-lite-text-to-video",
        label: "V1 Lite Text To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-lite-text-to-video",
        isSpecial: true,
      },
      {
        key: "seedance-1.0-lite-image-to-video",
        label: "V1 Lite Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-lite-image-to-video",
        isSpecial: true,
      },
      {
        key: "seedance-1.0-pro-fast-image-to-video",
        label: "V1 Pro Fast Image To Video",
        familyKey: "seedance-1.0",
        modelId: "video:bytedance-v1-pro-fast-image-to-video",
        isSpecial: true,
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
        isSpecial: true,
      },
      {
        key: "veo-3.1-fast",
        label: "Veo 3.1 Fast",
        familyKey: "veo-3.1",
        modelId: "video:veo-3.1-fast",
        isSpecial: true,
      },
      {
        key: "veo-3.1-quality",
        label: "Veo 3.1 Quality",
        familyKey: "veo-3.1",
        modelId: "video:veo-3.1-quality",
        isSpecial: true,
      },
      {
        key: "veo-3.1-extend",
        label: "Veo 3.1 Extend",
        familyKey: "veo-3.1",
        modelId: "video:extend-veo3-1-video",
        isSpecial: true,
      },
      {
        key: "veo-3.1-get-1080p",
        label: "Veo 3.1 Get 1080P",
        familyKey: "veo-3.1",
        modelId: "video:get-veo3-1-1080p-video",
        isSpecial: true,
      },
      {
        key: "veo-3.1-get-4k",
        label: "Veo 3.1 Get 4K",
        familyKey: "veo-3.1",
        modelId: "video:get-veo3-1-4k-video",
        isSpecial: true,
      },
      {
        key: "fal-veo-3.1",
        label: "Veo 3.1",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3-1",
        isHot: true
      },
      {
        key: "fal-veo-3.1-fast",
        label: "Veo 3.1 Fast",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3-1-fast",
        isHot: true
      },
      {
        key: "fal-veo-3.1-image-to-video",
        label: "Veo 3.1 Image to Video",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3-1-image-to-video",
      },
      {
        key: "fal-veo-3.1-fast-image-to-video",
        label: "Veo 3.1 Fast Image to Video",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3-1-fast-image-to-video",
      },
      {
        key: "fal-veo-3",
        label: "Veo 3",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3",
      },
      {
        key: "fal-veo-3-fast",
        label: "Veo 3 Fast",
        familyKey: "veo-3.1",
        modelId: "video:fal-fal-ai-veo3-fast",
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
        isSpecial: true
      },
      {
        key: "sora-2-image-to-video",
        label: "Sora 2 Image to Video",
        familyKey: "sora2",
        modelId: "video:sora2-image-to-video-standard",
        isSpecial: true,
      },
      {
        key: "sora-2-pro",
        label: "Sora 2 Pro Text to Video",
        familyKey: "sora2",
        modelId: "video:sora2-pro-text-to-video",
        isSpecial: true,
      },
      {
        key: "sora-2-pro-image-to-video",
        label: "Sora 2 Pro Image to Video",
        familyKey: "sora2",
        modelId: "video:sora2-pro-image-to-video",
        isSpecial: true,
      },
      {
        key: "sora-2-pro-storyboard",
        label: "Sora 2 Pro Storyboard",
        familyKey: "sora2",
        modelId: "video:sora2-pro-storyboard",
        isSpecial: true,
        levelLimit: "pro",
      },
      {
        key: "sora-2-official",
        label: "Sora 2 Official",
        familyKey: "sora2",
        modelId: "video:sora2-official",
        isSpecial: true,
        levelLimit: "pro",
      },
      {
        key: "fal-sora-2-text-to-video",
        label: "Sora 2 Text to Video",
        familyKey: "sora2",
        modelId: "video:fal-fal-ai-sora-2-text-to-video",
      },
      {
        key: "fal-sora-2-image-to-video",
        label: "Sora 2 Image to Video",
        familyKey: "sora2",
        modelId: "video:fal-fal-ai-sora-2-image-to-video",
      },
      {
        key: "fal-sora-2-pro-text-to-video",
        label: "Sora 2 Pro Text to Video",
        familyKey: "sora2",
        modelId: "video:fal-fal-ai-sora-2-text-to-video-pro",
      },
      {
        key: "fal-sora-2-pro-image-to-video",
        label: "Sora 2 Pro Image to Video",
        familyKey: "sora2",
        modelId: "video:fal-fal-ai-sora-2-image-to-video-pro",
      },
      {
        key: "fal-sora-2-video-remix",
        label: "Sora 2 Video Remix",
        familyKey: "sora2",
        modelId: "video:fal-fal-ai-sora-2-video-to-video-remix",
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
        isSpecial: true,
      },
      {
        key: "kling-3.0-motion-control",
        label: "Kling 3.0 Motion Control",
        familyKey: "kling",
        modelId: "video:kling-3-0-motion-control",
        isSpecial: true,
      },
      {
        key: "kling-v3-turbo-text-to-video",
        label: "Kling V3 Turbo Text to Video",
        familyKey: "kling",
        modelId: "video:kling-v3-turbo-text-to-video",
        isSpecial: true,
      },
      {
        key: "kling-v3-turbo-image-to-video",
        label: "Kling V3 Turbo Image to Video",
        familyKey: "kling",
        modelId: "video:kling-v3-turbo-image-to-video",
        isSpecial: true,
      },
      {
        key: "kling-2.6-text-to-video",
        label: "Kling 2.6 Text to Video",
        familyKey: "kling",
        modelId: "video:kling-2-6-text-to-video",
        isSpecial: true,
      },
      {
        key: "kling-2.6-image-to-video",
        label: "Kling 2.6 Image to Video",
        familyKey: "kling",
        modelId: "video:kling-2-6-image-to-video",
        isSpecial: true,
      },
      {
        key: "kling-2.6-motion-control",
        label: "Kling 2.6 Motion Control",
        familyKey: "kling",
        modelId: "video:kling-2-6-motion-control",
        isSpecial: true,
      },
      {
        key: "kling-2.5-turbo-text-to-video-pro",
        label: "Kling 2.5 Turbo Text to Video Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-5-turbo-text-to-video-pro",
        isSpecial: true,
      },
      {
        key: "kling-2.5-turbo-image-to-video-pro",
        label: "Kling 2.5 Turbo Image to Video Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-5-turbo-image-to-video-pro",
        isSpecial: true,
      },
      {
        key: "kling-v2.1-master-text-to-video",
        label: "Kling V2.1 Master Text to Video",
        familyKey: "kling",
        modelId: "video:kling-v2-1-master-text-to-video",
        isSpecial: true,
      },
      {
        key: "kling-v2.1-master-image-to-video",
        label: "Kling V2.1 Master Image to Video",
        familyKey: "kling",
        modelId: "video:kling-v2-1-master-image-to-video",
        isSpecial: true,
      },
      {
        key: "kling-v2.1-pro",
        label: "Kling V2.1 Pro",
        familyKey: "kling",
        modelId: "video:kling-v2-1-pro",
        isSpecial: true,
      },
      {
        key: "kling-v2.1-standard",
        label: "Kling V2.1 Standard",
        familyKey: "kling",
        modelId: "video:kling-v2-1-standard",
        isSpecial: true,
      },
      {
        key: "kling-ai-avatar-standard",
        label: "Kling AI Avatar Standard",
        familyKey: "kling",
        modelId: "video:kling-ai-avatar-standard",
        isSpecial: true,
      },
      {
        key: "kling-ai-avatar-pro",
        label: "Kling AI Avatar Pro",
        familyKey: "kling",
        modelId: "video:kling-ai-avatar-pro",
        isSpecial: true,
      },
      {
        key: "fal-kling-v3-pro-text-to-video",
        label: "Kling v3 Pro Text to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-pro-text-to-video",
      },
      {
        key: "fal-kling-v3-standard-text-to-video",
        label: "Kling v3 Standard Text to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-standard-text-to-video",
      },
      {
        key: "fal-kling-v3-pro-image-to-video",
        label: "Kling v3 Pro Image to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-pro-image-to-video",
      },
      {
        key: "fal-kling-v3-standard-image-to-video",
        label: "Kling v3 Standard Image to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-standard-image-to-video",
      },
      {
        key: "fal-kling-v3-4k-image-to-video",
        label: "Kling v3 4K Image to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-4k-image-to-video",
      },
      {
        key: "fal-kling-v3-4k-text-to-video",
        label: "Kling v3 4K Text to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v3-4k-text-to-video",
      },
      {
        key: "fal-kling-o1-image-to-video",
        label: "Kling O1 Image to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-o1-image-to-video",
      },
      {
        key: "fal-kling-v2.6-pro-text-to-video",
        label: "Kling v2.6 Pro Text to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v2-6-pro-text-to-video",
      },
      {
        key: "fal-kling-v2.6-pro-image-to-video",
        label: "Kling v2.6 Pro Image to Video",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v2-6-pro-image-to-video",
      },
      {
        key: "fal-kling-v2.6-motion-control",
        label: "Kling v2.6 Motion Control",
        familyKey: "kling",
        modelId: "video:fal-fal-ai-kling-video-v2-6-standard-motion-control",
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
        isSpecial: true,
      },
      {
        key: "wan-2.7-image-to-video",
        label: "Wan 2.7 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-7-image-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.7-video-edit",
        label: "Wan 2.7 Video Edit",
        familyKey: "wan",
        modelId: "video:wan-2-7-video-edit",
        isSpecial: true,
      },
      {
        key: "wan-2.7-reference-to-video",
        label: "Wan 2.7 Reference to Video",
        familyKey: "wan",
        modelId: "video:wan-2-7-reference-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.6-text-to-video",
        label: "Wan 2.6 Text to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-text-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.6-image-to-video",
        label: "Wan 2.6 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-image-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.6-video-to-video",
        label: "Wan 2.6 Video to Video",
        familyKey: "wan",
        modelId: "video:wan-2-6-video-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.5-text-to-video",
        label: "Wan 2.5 Text to Video",
        familyKey: "wan",
        modelId: "video:wan-2-5-text-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.5-image-to-video",
        label: "Wan 2.5 Image to Video",
        familyKey: "wan",
        modelId: "video:wan-2-5-image-to-video",
        isSpecial: true,
      },
      {
        key: "wan-text-to-video",
        label: "Wan Text to Video",
        familyKey: "wan",
        modelId: "video:wan-text-to-video",
        isSpecial: true,
      },
      {
        key: "wan-image-to-video",
        label: "Wan Image to Video",
        familyKey: "wan",
        modelId: "video:wan-image-to-video",
        isSpecial: true,
      },
      {
        key: "wan-2.2-a14b-speech-to-video-turbo",
        label: "Wan 2.2 A14B Speech to Video Turbo",
        familyKey: "wan",
        modelId: "video:wan-2-2-a14b-speech-to-video-turbo",
        isSpecial: true,
      },
      {
        key: "wan-animate-move",
        label: "Wan Animate Move",
        familyKey: "wan",
        modelId: "video:wan-animate-move",
        isSpecial: true,
      },
      {
        key: "wan-animate-replace",
        label: "Wan Animate Replace",
        familyKey: "wan",
        modelId: "video:wan-animate-replace",
        isSpecial: true,
      },
      {
        key: "fal-wan-2.7-text-to-video",
        label: "Wan 2.7 Text to Video",
        familyKey: "wan",
        modelId: "video:fal-fal-ai-wan-v2-7-text-to-video",
      },
      {
        key: "fal-wan-2.7-image-to-video",
        label: "Wan 2.7 Image to Video",
        familyKey: "wan",
        modelId: "video:fal-fal-ai-wan-v2-7-image-to-video",
      },
      {
        key: "fal-wan-2.7-reference-to-video",
        label: "Wan 2.7 Reference to Video",
        familyKey: "wan",
        modelId: "video:fal-fal-ai-wan-v2-7-reference-to-video",
      },
    ],
  },
  {
    key: "happyhorse",
    label: "HappyHorse",
    description: "HappyHorse text, image, and reference-to-video generation",
    icon: "alibaba-cloud",
    tags: [{ text: "HOT", type: "hot" }],
    selectable: true,
    versions: [
      {
        key: "happyhorse-text-to-video",
        label: "HappyHorse Text to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-text-to-video",
        isSpecial: true,
      },
      {
        key: "happyhorse-image-to-video",
        label: "HappyHorse Image to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-image-to-video",
        isSpecial: true,
      },
      {
        key: "happyhorse-reference-to-video",
        label: "HappyHorse Reference to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-reference-to-video",
        isSpecial: true,
      },
      {
        key: "happyhorse-1.1-text-to-video",
        label: "HappyHorse 1.1 Text to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-1-1-text-to-video",
        isSpecial: true,
      },
      {
        key: "happyhorse-1.1-image-to-video",
        label: "HappyHorse 1.1 Image to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-1-1-image-to-video",
        isSpecial: true,
      },
      {
        key: "happyhorse-1.1-reference-to-video",
        label: "HappyHorse 1.1 Reference to Video",
        familyKey: "happyhorse",
        modelId: "video:happyhorse-1-1-reference-to-video",
        isSpecial: true,
      },
      {
        key: "fal-happy-horse-text-to-video",
        label: "Happy Horse Text to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-text-to-video",
      },
      {
        key: "fal-happy-horse-image-to-video",
        label: "Happy Horse Image to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-image-to-video",
      },
      {
        key: "fal-happy-horse-reference-to-video",
        label: "Happy Horse Reference to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-reference-to-video",
      },
      {
        key: "fal-happy-horse-1.1-text-to-video",
        label: "Happy Horse 1.1 Text to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-v1-1-text-to-video",
      },
      {
        key: "fal-happy-horse-1.1-image-to-video",
        label: "Happy Horse 1.1 Image to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-v1-1-image-to-video",
      },
      {
        key: "fal-happy-horse-1.1-reference-to-video",
        label: "Happy Horse 1.1 Reference to Video",
        familyKey: "happyhorse",
        modelId: "video:fal-alibaba-happy-horse-v1-1-reference-to-video",
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
        isSpecial: true,
      },
      {
        key: "hailuo-standard-image-to-video",
        label: "Hailuo Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-standard-image-to-video",
        isSpecial: true,
      },
      {
        key: "hailuo-pro-text-to-video",
        label: "Hailuo Pro Text to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-pro-text-to-video",
        isSpecial: true,
      },
      {
        key: "hailuo-pro-image-to-video",
        label: "Hailuo Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-pro-image-to-video",
        isSpecial: true,
      },
      {
        key: "hailuo-2.3-standard-image-to-video",
        label: "Hailuo 2.3 Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-2-3-standard-image-to-video",
        isSpecial: true,
      },
      {
        key: "hailuo-2.3-pro-image-to-video",
        label: "Hailuo 2.3 Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:hailuo-2-3-pro-image-to-video",
        isSpecial: true,
      },
      {
        key: "fal-hailuo-02-standard-text-to-video",
        label: "Hailuo 02 Standard Text to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-02-standard-text-to-video",
      },
      {
        key: "fal-hailuo-02-standard-image-to-video",
        label: "Hailuo 02 Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-02-standard-image-to-video",
      },
      {
        key: "fal-hailuo-02-pro-text-to-video",
        label: "Hailuo 02 Pro Text to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-02-pro-text-to-video",
      },
      {
        key: "fal-hailuo-02-pro-image-to-video",
        label: "Hailuo 02 Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-02-pro-image-to-video",
      },
      {
        key: "fal-hailuo-02-fast-image-to-video",
        label: "Hailuo 02 Fast Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-02-fast-image-to-video",
      },
      {
        key: "fal-hailuo-2.3-standard-text-to-video",
        label: "Hailuo 2.3 Standard Text to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-standard-text-to-video",
      },
      {
        key: "fal-hailuo-2.3-standard-image-to-video",
        label: "Hailuo 2.3 Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-standard-image-to-video",
      },
      {
        key: "fal-hailuo-2.3-pro-text-to-video",
        label: "Hailuo 2.3 Pro Text to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-pro-text-to-video",
      },
      {
        key: "fal-hailuo-2.3-pro-image-to-video",
        label: "Hailuo 2.3 Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-pro-image-to-video",
      },
      {
        key: "fal-hailuo-2.3-fast-standard-image-to-video",
        label: "Hailuo 2.3 Fast Standard Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-fast-standard-image-to-video",
      },
      {
        key: "fal-hailuo-2.3-fast-pro-image-to-video",
        label: "Hailuo 2.3 Fast Pro Image to Video",
        familyKey: "hailuo",
        modelId: "video:fal-fal-ai-minimax-hailuo-2-3-fast-pro-image-to-video",
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
        isSpecial: true,
      },
      {
        key: "runway-generate-aleph-video",
        label: "Runway Generate Aleph Video",
        familyKey: "runway",
        modelId: "video:generate-aleph-video",
        isSpecial: true,
      },
    ],
  },
  {
    key: "meta-muse-image",
    label: "Meta Muse Image",
    description: "Meta Muse image generation model",
    icon: "meta-muse",
    tags: [{ text: "Coming Soon", type: "coming-soon" }],
    selectable: false,
    versions: [
      {
        key: "meta-muse-text-to-image",
        label: "Text to Image",
        familyKey: "meta-muse-image",
        modelId: "image:meta-muse-text-to-image",
        description: "Create an image from a text prompt.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "meta-muse-image-edit",
        label: "Image Edit",
        familyKey: "meta-muse-image",
        modelId: "image:meta-muse-image-edit",
        description: "Edit an image with precise instructions.",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "meta-muse-multi-reference-image",
        label: "Multi-Reference Image",
        familyKey: "meta-muse-image",
        modelId: "image:meta-muse-multi-reference-image",
        description: "Create an image from multiple reference images.",
        isSpecial: true,
        isHot: true,
      },
    ],
  },
  {
    key: "nano-banana",
    label: "Nano Banana",
    description: "Nano Banana image generation and edit models",
    icon: "nano-banana",
    selectable: true,
    tags: [{ text: "HOT", type: "hot" }],
    versions: [
      {
        key: "nano-banana-pro",
        label: "Nano Banana Pro",
        familyKey: "nano-banana",
        modelId: "image:google-nano-banana-pro",
        isSpecial: true,
      },
      {
        key: "nano-banana-2",
        label: "Nano Banana 2",
        familyKey: "nano-banana",
        modelId: "image:google-nano-banana-2",
        isSpecial: true,
        isHot: true
      },
      {
        key: "nano-banana-2-lite",
        label: "Nano Banana 2 Lite",
        familyKey: "nano-banana",
        modelId: "image:google-nano-banana-2-lite",
        isSpecial: true,
      },
      {
        key: "fal-gemini-3.1-flash-image-preview",
        label: "Gemini 3.1 Flash Image Preview",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-gemini-3-1-flash-image-preview",
        isHot: true
      },
      {
        key: "fal-gemini-3.1-flash-image-preview-edit",
        label: "Gemini 3.1 Flash Image Preview Edit",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-gemini-3-1-flash-image-preview-edit",
      },
      {
        key: "fal-gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-gemini-3-pro-image-preview",
      },
      {
        key: "fal-gemini-3-pro-image-preview-edit",
        label: "Gemini 3 Pro Image Preview Edit",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-gemini-3-pro-image-preview-edit",
      },
      {
        key: "fal-nano-banana",
        label: "Nano Banana",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-nano-banana",
      },
      {
        key: "fal-nano-banana-edit",
        label: "Nano Banana Edit",
        familyKey: "nano-banana",
        modelId: "image:fal-fal-ai-nano-banana-edit",
      },
      {
        key: "fal-nano-banana-2-lite",
        label: "Nano Banana 2 Lite",
        familyKey: "nano-banana",
        modelId: "image:fal-google-nano-banana-2-lite",
      },
    ],
  },
  {
    key: "gpt-image-2",
    label: "GPT Image 2",
    description: "OpenAI text-to-image and image-to-image workflows",
    icon: "sora",
    tags: [{ text: "HOT", type: "hot" }],
    selectable: true,
    versions: [
      {
        key: "gpt-image-2-text-to-image",
        label: "Text to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-text-to-image",
        isSpecial: true,
        isHot: true
      },
      {
        key: "gpt-image-2-image-to-image",
        label: "Image to Image",
        familyKey: "gpt-image-2",
        modelId: "image:gpt-image-2-image-to-image",
        isSpecial: true,
      },
      {
        key: "ama-gpt-image-2",
        label: "Gpt image 2 Special offer",
        familyKey: "gpt-image-2",
        modelId: "image:ama-gpt-image-2",
        isSpecial: true,
        isHot: true
      },
      {
        key: "fal-openai-gpt-image-2",
        label: "Gpt image 2",
        familyKey: "gpt-image-2",
        modelId: "image:fal-openai-gpt-image-2",
        isHot: true
      },
      {
        key: "fal-openai-gpt-image-2-edit",
        label: "Gpt image 2 edit",
        familyKey: "gpt-image-2",
        modelId: "image:fal-openai-gpt-image-2-edit",
      },
      {
        key: "fal-gpt-image-1.5",
        label: "GPT Image 1.5",
        familyKey: "gpt-image-2",
        modelId: "image:fal-fal-ai-gpt-image-1-5",
      },
      {
        key: "fal-gpt-image-1.5-edit",
        label: "GPT Image 1.5 Edit",
        familyKey: "gpt-image-2",
        modelId: "image:fal-fal-ai-gpt-image-1-5-edit",
      }
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
        isSpecial: true,
      },
      {
        key: "seedream-5-lite-image-to-image",
        label: "Seedream5.0 Lite - Image to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream5-0-lite-image-to-image",
        isSpecial: true,
      },
      {
        key: "seedream-5-pro-text-to-image",
        label: "Seedream5.0 Pro - Text to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream5-0-pro-text-to-image",
        isSpecial: true,
      },
      {
        key: "seedream-5-pro-image-to-image",
        label: "Seedream5.0 Pro - Image to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream5-0-pro-image-to-image",
        isSpecial: true,
      },
      {
        key: "seedream-4.5-text-to-image",
        label: "Seedream4.5 - Text to Image",
        familyKey: "seedream-image",
        modelId: "image:seedream4-5-text-to-image",
        isSpecial: true,
      },
      {
        key: "seedream-4.5-edit",
        label: "Seedream4.5 - Edit",
        familyKey: "seedream-image",
        modelId: "image:seedream4-5-edit",
        isSpecial: true,
      },

      {
        key: "seedream-5-lite-text-to-image-fal",
        label: "Seedream 5.0 Lite Text to Image",
        familyKey: "seedream-image",
        modelId: "image:fal-fal-ai-bytedance-seedream-v5-lite-text-to-image",
      },
      {
        key: "seedream-5-lite-edit-fal",
        label: "Seedream 5.0 Lite Edit",
        familyKey: "seedream-image",
        modelId: "image:fal-fal-ai-bytedance-seedream-v5-lite-edit",
      },
      {
        key: "seedream-5-pro-text-to-image-fal",
        label: "Seedream 5.0 Pro Text to Image",
        familyKey: "seedream-image",
        modelId: "image:fal-bytedance-seedream-v5-pro-text-to-image",
      },
      {
        key: "seedream-5-pro-edit-fal",
        label: "Seedream 5.0 Pro Edit",
        familyKey: "seedream-image",
        modelId: "image:fal-bytedance-seedream-v5-pro-edit",
      },
      {
        key: "seedream-4.5-text-to-image-fal",
        label: "Seedream 4.5 Text to Image",
        familyKey: "seedream-image",
        modelId: "image:fal-fal-ai-bytedance-seedream-v4-5-text-to-image",
      },
      {
        key: "seedream-4.5-edit-fal",
        label: "Seedream 4.5 Edit",
        familyKey: "seedream-image",
        modelId: "image:fal-fal-ai-bytedance-seedream-v4-5-edit",
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
        isSpecial: true,
      },
      {
        key: "qwen2-image-edit",
        label: "Qwen2 - Image Edit",
        familyKey: "qwen2-image",
        modelId: "image:qwen2-image-edit",
        isSpecial: true,
      },
      {
        key: "qwen2-text-to-image-fal",
        label: "Qwen2 - Text To Image",
        familyKey: "qwen2-image",
        modelId: "image:fal-fal-ai-qwen-image-2-text-to-image",
      },
      {
        key: "qwen2-image-edit-fal",
        label: "Qwen2 - Image Edit",
        familyKey: "qwen2-image",
        modelId: "image:fal-fal-ai-qwen-image-2-edit",
      },
    ],
  },
  {
    key: "grok-imagine-image",
    label: "Grok Imagine",
    description: "Grok Imagine text-to-image and image-to-image models",
    icon: "grok",
    tags: [
      { text: "HOT", type: "hot" },
    ],
    selectable: true,
    versions: [
      {
        key: "grok-imagine-text-to-image",
        label: "Grok Imagine - Text to Image",
        familyKey: "grok-imagine-image",
        modelId: "image:grok-imagine-text-to-image",
        isSpecial: true,
      },
      {
        key: "grok-imagine-image-to-image",
        label: "Grok Imagine - image to image",
        familyKey: "grok-imagine-image",
        modelId: "image:grok-imagine-image-to-image",
        isSpecial: true,
      },
      {
        key: "fal-grok-imagine-text-to-image",
        label: "Grok Imagine Text to Image",
        familyKey: "grok-imagine-image",
        modelId: "image:fal-xai-grok-imagine-image",
        isHot: true
      },
      {
        key: "fal-grok-imagine-image-edit",
        label: "Grok Imagine Image Edit",
        familyKey: "grok-imagine-image",
        modelId: "image:fal-xai-grok-imagine-image-edit",
      },
      {
        key: "fal-grok-imagine-quality-text-to-image",
        label: "Grok Imagine Quality Text to Image",
        familyKey: "grok-imagine-image",
        modelId: "image:fal-xai-grok-imagine-image-quality-text-to-image",
      },
      {
        key: "fal-grok-imagine-quality-image-edit",
        label: "Grok Imagine Quality Image Edit",
        familyKey: "grok-imagine-image",
        modelId: "image:fal-xai-grok-imagine-image-quality-edit",
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
        modelId: "image:wan-2-7-image"
      },
      {
        key: "wan-2.7-image-pro",
        label: "Wan 2.7 Image Pro",
        familyKey: "wan-image",
        modelId: "image:wan-2-7-image-pro",
        isSpecial: true,
      },
      {
        key: "fal-wan-2.7-text-to-image",
        label: "Wan 2.7 Text to Image",
        familyKey: "wan-image",
        modelId: "image:fal-fal-ai-wan-v2-7-text-to-image",
      },
      {
        key: "fal-wan-2.7-edit",
        label: "Wan 2.7 Edit",
        familyKey: "wan-image",
        modelId: "image:fal-fal-ai-wan-v2-7-edit",
      },
      {
        key: "fal-wan-2.7-pro-text-to-image",
        label: "Wan 2.7 Pro Text to Image",
        familyKey: "wan-image",
        modelId: "image:fal-fal-ai-wan-v2-7-pro-text-to-image",
        levelLimit: "pro",
        isSpecial: true,
        isHot: true,
      },
      {
        key: "fal-wan-2.7-pro-edit",
        label: "Wan 2.7 Pro Edit",
        familyKey: "wan-image",
        modelId: "image:fal-fal-ai-wan-v2-7-pro-edit",
      }
    ],
  },
];

export function getAiVideoStudioSelectionFromModelId(modelId: string) {
  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    for (const version of family.versions) {
      if (version.modelId === modelId) {
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
        isSpecial: version.isSpecial === true,
        isHot: version.isHot === true,
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
