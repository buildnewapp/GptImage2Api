"use client";

import type { VideoInputPayload } from "@/config/model_config";
import {
  AdvancedSettings,
  AspectRatioSelector,
  DurationSelector,
  ImageUploadField,
  PromptField,
  ShotsEditor,
  SizeSelector,
  toApiDuration,
  toHttpUrl,
} from "./FieldWidgets";
import type { ProviderFieldsProps, ProviderFormValues, ProviderMeta, ShotItem } from "./types";

/* ─── 版本常量 ─── */

// aspect_ratio：文档统一为 portrait / landscape
const SORA_ASPECT_RATIOS = ["landscape", "portrait"];

// duration（n_frames）
const SORA_2_DURATIONS = ["10s", "15s"];
const SORA_2_PRO_DURATIONS = ["10s", "15s"];
const SORA_2_PRO_STORYBOARD_DURATIONS = ["10s", "15s", "25s"]; // 文档：10/15/25

// size（仅 Pro 系列）
const SORA_2_PRO_SIZES = ["standard", "high"];

/* ─── 版本判断 ─── */

type SoraVariant = "sora-2" | "sora-2-pro" | "sora-2-pro-storyboard";

function getSoraVariant(modelId: string): SoraVariant {
  if (modelId === "sora-2-pro-storyboard") return "sora-2-pro-storyboard";
  if (modelId.startsWith("sora-2-pro")) return "sora-2-pro";
  return "sora-2";
}

function isImageMode(modelId: string): boolean {
  return modelId.includes("image-to-video");
}

/* ─── 工具函数 ─── */

/** 将 duration 字符串(如 "15s")解析为数字秒 */
function parseDurationToSeconds(duration: string | undefined): number {
  if (!duration) return 15;
  const raw = toApiDuration(duration); // "15s" -> "15"
  const n = Number.parseInt(raw || "15", 10);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

/** 生成默认 shots：按 totalDuration 均分为 2 段 */
function makeDefaultShots(totalDuration: number): ShotItem[] {
  const half = Math.round((totalDuration / 2) * 10) / 10;
  return [
    { Scene: "", duration: half },
    { Scene: "", duration: totalDuration - half },
  ];
}

/* ─── 配置工厂 ─── */

type SoraConfig = {
  durations: string[];
  aspectRatios: string[];
  sizes: string[] | null; // null = 不支持 size
  requiresImage: boolean;
  supportsOptionalImage: boolean; // storyboard 可选上传图片
  isStoryboard: boolean;
  defaultValues: ProviderFormValues;
};

function getConfig(modelId: string): SoraConfig {
  const variant = getSoraVariant(modelId);
  const hasImage = isImageMode(modelId);

  switch (variant) {
    case "sora-2-pro-storyboard":
      return {
        durations: SORA_2_PRO_STORYBOARD_DURATIONS,
        aspectRatios: SORA_ASPECT_RATIOS,
        sizes: null,
        requiresImage: false,
        supportsOptionalImage: true, // storyboard 的 image_urls 可选
        isStoryboard: true,
        defaultValues: {
          duration: "15s",
          aspectRatio: "landscape",
          shots: makeDefaultShots(15),
        } satisfies ProviderFormValues,
      };

    case "sora-2-pro":
      return {
        durations: SORA_2_PRO_DURATIONS,
        aspectRatios: SORA_ASPECT_RATIOS,
        sizes: SORA_2_PRO_SIZES,
        requiresImage: hasImage,
        supportsOptionalImage: false,
        isStoryboard: false,
        defaultValues: {
          duration: "10s",
          aspectRatio: "landscape",
          size: "high",
        } satisfies ProviderFormValues,
      };

    default: // sora-2
      return {
        durations: SORA_2_DURATIONS,
        aspectRatios: SORA_ASPECT_RATIOS,
        sizes: null,
        requiresImage: hasImage,
        supportsOptionalImage: false,
        isStoryboard: false,
        defaultValues: {
          duration: "10s",
          aspectRatio: "landscape",
        } satisfies ProviderFormValues,
      };
  }
}

/* ─── Meta ─── */

export function getSoraMeta(modelId: string): ProviderMeta {
  const cfg = getConfig(modelId);

  return {
    requiresImage: cfg.requiresImage,
    requiresPrompt: !cfg.isStoryboard, // storyboard 不需要 prompt，使用 shots
    getDefaultValues: () => ({ ...cfg.defaultValues }),
    buildPayload: (values: ProviderFormValues): VideoInputPayload => {
      const payload: VideoInputPayload = {
        n_frames: toApiDuration(values.duration), // API 字段名
        duration: toApiDuration(values.duration), // 前端信用分计算强依赖此字段名
        aspect_ratio:
          values.aspectRatio && values.aspectRatio !== "auto"
            ? values.aspectRatio
            : undefined,
        remove_watermark: true, // 文档：所有模型均支持，默认 true
      };

      // size（仅 Pro 系列）
      if (cfg.sizes && values.size) {
        payload.size = values.size;
      }

      // image_urls（文档要求数组格式）
      if (cfg.requiresImage || cfg.supportsOptionalImage) {
        const url = toHttpUrl(values.imageUrl);
        if (url) {
          payload.image_urls = [url];
        }
      }

      // storyboard：使用 shots 数组
      if (cfg.isStoryboard) {
        const shots = values.shots;
        if (shots && shots.length > 0) {
          payload.shots = shots.map((s) => ({
            Scene: s.Scene.trim(),
            duration: s.duration,
          }));
        }
        // storyboard 不使用顶层 prompt
      } else {
        // 非 storyboard：传 prompt
        payload.prompt = values.prompt?.trim() || undefined;
      }

      return payload;
    },
  };
}

/* ─── 组件 ─── */

type SoraFieldsProps = ProviderFieldsProps & { modelId: string };

export default function SoraFields({
  modelId,
  values,
  onChange,
  isPublic,
  onPublicChange,
  t,
}: SoraFieldsProps) {
  const cfg = getConfig(modelId);
  const totalDurationSec = parseDurationToSeconds(values.duration);

  return (
    <div className="space-y-4">
      {/* 图片上传：必填 or 可选 */}
      {(cfg.requiresImage || cfg.supportsOptionalImage) && (
        <ImageUploadField
          imageUrl={values.imageUrl}
          onChange={(v) => onChange({ imageUrl: v })}
          t={t}
        />
      )}

      {/* Storyboard 模式：shots 编辑器 */}
      {cfg.isStoryboard ? (
        <ShotsEditor
          shots={values.shots || makeDefaultShots(totalDurationSec)}
          totalDuration={totalDurationSec}
          onChange={(shots) => onChange({ shots })}
          t={t}
        />
      ) : (
        <PromptField
          prompt={values.prompt}
          onChange={(v) => onChange({ prompt: v })}
          t={t}
        />
      )}

      <DurationSelector
        durations={cfg.durations}
        selected={values.duration}
        onChange={(v) => {
          onChange({ duration: v });
          // 当切换时长时，如果是 storyboard，自动重新均分 shots 的 duration
          if (cfg.isStoryboard && values.shots && values.shots.length > 0) {
            const newTotal = parseDurationToSeconds(v);
            const perShot = Math.round((newTotal / values.shots.length) * 10) / 10;
            const updatedShots = values.shots.map((s, i) => ({
              ...s,
              duration:
                i === values.shots!.length - 1
                  ? Math.round((newTotal - perShot * (values.shots!.length - 1)) * 10) / 10
                  : perShot,
            }));
            onChange({ duration: v, shots: updatedShots });
          }
        }}
        t={t}
      />

      <AspectRatioSelector
        aspectRatios={cfg.aspectRatios}
        selected={values.aspectRatio}
        onChange={(v) => onChange({ aspectRatio: v })}
        t={t}
      />

      {cfg.sizes && (
        <SizeSelector
          sizes={cfg.sizes}
          selected={values.size}
          onChange={(v) => onChange({ size: v })}
          t={t}
        />
      )}

      <AdvancedSettings
        values={values}
        onChange={onChange}
        isPublic={isPublic}
        onPublicChange={onPublicChange}
        t={t}
      />
    </div>
  );
}
