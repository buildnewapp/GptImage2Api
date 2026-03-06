"use client";

import type { VideoInputPayload } from "@/config/model_config";
import {
  AdvancedSettings,
  AspectRatioSelector,
  DurationSelector,
  EndImageUploadField,
  ImageUploadField,
  PromptField,
  ResolutionSelector,
  toApiDuration,
  toHttpUrl,
  toSeed,
} from "./FieldWidgets";
import type { ProviderFieldsProps, ProviderFormValues, ProviderMeta } from "./types";

/* ─── 模型变体 ─── */

type SeedanceVariant = "pro" | "pro-fast" | "lite";

function getSeedanceVariant(modelId: string): SeedanceVariant {
  if (modelId.includes("v1-pro-fast")) return "pro-fast";
  if (modelId.includes("v1-pro")) return "pro";
  return "lite";
}

function isImageMode(modelId: string): boolean {
  return modelId.includes("image-to-video");
}

/* ─── 各变体常量 ─── */

// v1-pro (text-to-video & image-to-video)
const PRO_RESOLUTIONS = ["480p", "720p", "1080p"];
const PRO_DURATIONS = ["5s", "10s"];
const PRO_ASPECT_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const PRO_DEFAULT_PROMPT =
  "A boy with curly hair and a backpack rides a bike down a golden-lit rural road at sunset.\n" +
  "[Cut to] He slows down and looks toward a field of tall grass.\n" +
  "[Wide shot] His silhouette halts in the orange haze.";

// v1-pro-fast (image-to-video only)
const PRO_FAST_RESOLUTIONS = ["720p", "1080p"];
const PRO_FAST_DURATIONS = ["5s", "10s"];

// v1-lite (text-to-video & image-to-video)
const LITE_RESOLUTIONS = ["480p", "720p", "1080p"];
const LITE_DURATIONS = ["5s", "10s"];
const LITE_ASPECT_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16", "9:21"];

/* ─── 配置工厂 ─── */

type ModelConfig = {
  resolutions: string[];
  durations: string[];
  aspectRatios: string[] | null; // null = 不支持 aspect_ratio
  supportsSeed: boolean;
  supportsCameraFixed: boolean;
  supportsSafetyChecker: boolean;
  supportsEndImage: boolean;
  requiresImage: boolean;
  defaultValues: ProviderFormValues;
};

function getConfig(modelId: string): ModelConfig {
  const variant = getSeedanceVariant(modelId);
  const hasImage = isImageMode(modelId);

  switch (variant) {
    case "pro":
      return {
        resolutions: PRO_RESOLUTIONS,
        durations: PRO_DURATIONS,
        aspectRatios: PRO_ASPECT_RATIOS,
        supportsSeed: true,
        supportsCameraFixed: true,
        supportsSafetyChecker: true,
        supportsEndImage: false,
        requiresImage: hasImage,
        defaultValues: {
          prompt: PRO_DEFAULT_PROMPT,
          resolution: "720p",
          duration: "5s",
          aspectRatio: "16:9",
          seed: "-1",
          cameraFixed: false,
          enableSafetyChecker: true,
        } satisfies ProviderFormValues,
      };

    case "pro-fast":
      return {
        resolutions: PRO_FAST_RESOLUTIONS,
        durations: PRO_FAST_DURATIONS,
        aspectRatios: null, // v1-pro-fast 不支持 aspect_ratio
        supportsSeed: false,
        supportsCameraFixed: false,
        supportsSafetyChecker: false,
        supportsEndImage: false,
        requiresImage: true, // pro-fast 仅支持 image-to-video
        defaultValues: {
          resolution: "720p",
          duration: "5s",
        } satisfies ProviderFormValues,
      };

    case "lite":
    default:
      return {
        resolutions: LITE_RESOLUTIONS,
        durations: LITE_DURATIONS,
        aspectRatios: LITE_ASPECT_RATIOS,
        supportsSeed: true,
        supportsCameraFixed: true,
        supportsSafetyChecker: true,
        supportsEndImage: hasImage, // 仅 v1-lite-image-to-video 支持 end_image_url
        requiresImage: hasImage,
        defaultValues: {
          resolution: "720p",
          duration: "5s",
          aspectRatio: "16:9",
          seed: "-1",
          cameraFixed: false,
          enableSafetyChecker: true,
        } satisfies ProviderFormValues,
      };
  }
}

/* ─── Meta ─── */

export function getSeedanceMeta(modelId: string): ProviderMeta {
  const cfg = getConfig(modelId);

  return {
    requiresImage: cfg.requiresImage,
    requiresPrompt: true,
    getDefaultValues: () => ({ ...cfg.defaultValues }),
    buildPayload: (values: ProviderFormValues): VideoInputPayload => {
      const payload: VideoInputPayload = {
        prompt: values.prompt?.trim() || undefined,
        resolution: values.resolution,
        duration: toApiDuration(values.duration),
      };
      // aspect_ratio（pro-fast 不支持）
      if (cfg.aspectRatios) {
        payload.aspect_ratio =
          values.aspectRatio && values.aspectRatio !== "auto"
            ? values.aspectRatio
            : undefined;
      }
      // seed
      if (cfg.supportsSeed) {
        payload.seed = toSeed(values.seed);
      }
      // image_url
      if (cfg.requiresImage) {
        payload.image_url = toHttpUrl(values.imageUrl);
      }
      // camera_fixed
      if (cfg.supportsCameraFixed && typeof values.cameraFixed === "boolean") {
        payload.camera_fixed = values.cameraFixed;
      }
      // enable_safety_checker
      if (cfg.supportsSafetyChecker && typeof values.enableSafetyChecker === "boolean") {
        payload.enable_safety_checker = values.enableSafetyChecker;
      }
      // end_image_url（仅 v1-lite-image-to-video）
      if (cfg.supportsEndImage) {
        payload.end_image_url = toHttpUrl(values.endImageUrl) || "";
      }
      return payload;
    },
  };
}

/* ─── 组件 ─── */

type SeedanceFieldsProps = ProviderFieldsProps & { modelId: string };

export default function SeedanceFields({
  modelId,
  values,
  onChange,
  isPublic,
  onPublicChange,
  t,
}: SeedanceFieldsProps) {
  const cfg = getConfig(modelId);

  return (
    <div className="space-y-4">
      {cfg.requiresImage && (
        <ImageUploadField
          imageUrl={values.imageUrl}
          onChange={(v) => onChange({ imageUrl: v })}
          t={t}
        />
      )}

      {cfg.supportsEndImage && (
        <EndImageUploadField
          endImageUrl={values.endImageUrl}
          onChange={(v) => onChange({ endImageUrl: v })}
          t={t}
        />
      )}

      <PromptField
        prompt={values.prompt}
        onChange={(v) => onChange({ prompt: v })}
        t={t}
      />

      <ResolutionSelector
        resolutions={cfg.resolutions}
        selected={values.resolution}
        onChange={(v) => onChange({ resolution: v })}
        t={t}
      />

      <DurationSelector
        durations={cfg.durations}
        selected={values.duration}
        onChange={(v) => onChange({ duration: v })}
        t={t}
      />

      {cfg.aspectRatios && (
        <AspectRatioSelector
          aspectRatios={cfg.aspectRatios}
          selected={values.aspectRatio}
          onChange={(v) => onChange({ aspectRatio: v })}
          t={t}
        />
      )}

      <AdvancedSettings
        values={values}
        onChange={onChange}
        isPublic={isPublic}
        onPublicChange={onPublicChange}
        supportsSeed={cfg.supportsSeed}
        supportsCameraFixed={cfg.supportsCameraFixed}
        supportsSafetyChecker={cfg.supportsSafetyChecker}
        t={t}
      />
    </div>
  );
}
