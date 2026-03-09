export type AiVideoStudioMode = "text-to-video" | "image-to-video";
export type AiVideoStudioFamilyKey = "sora2";
export type AiVideoStudioVersionKey = "sora-2" | "sora-2-pro";

export type AiVideoStudioFamily = {
  key: AiVideoStudioFamilyKey;
  label: string;
  description: string;
};

export type AiVideoStudioVersion = {
  key: AiVideoStudioVersionKey;
  label: string;
  familyKey: AiVideoStudioFamilyKey;
  modelIds: Record<AiVideoStudioMode, string>;
};

export const AI_VIDEO_STUDIO_FAMILIES: AiVideoStudioFamily[] = [
  {
    key: "sora2",
    label: "Sora2",
    description: "OpenAI Sora2 video generation",
  },
];

const AI_VIDEO_STUDIO_VERSIONS: AiVideoStudioVersion[] = [
  {
    key: "sora-2",
    label: "sora 2",
    familyKey: "sora2",
    modelIds: {
      "text-to-video": "video:sora2-text-to-video-standard",
      "image-to-video": "video:sora2-image-to-video-standard",
    },
  },
  {
    key: "sora-2-pro",
    label: "sora 2 pro",
    familyKey: "sora2",
    modelIds: {
      "text-to-video": "video:sora2-pro-text-to-video",
      "image-to-video": "video:sora2-pro-image-to-video",
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
