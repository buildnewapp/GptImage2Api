"use client";

import type { VideoInputPayload } from "@/config/model_config";
import {
  AdvancedSettings,
  AspectRatioSelector,
  EndImageUploadField,
  ImageUploadField,
  PromptField,
  toHttpUrl,
  toSeed,
} from "./FieldWidgets";
import type { ProviderFieldsProps, ProviderFormValues, ProviderMeta } from "./types";

const VEO_ASPECT_RATIOS = ["16:9", "9:16", "Auto"];

export function getVeoMeta(modelId: string): ProviderMeta {
  return {
    requiresImage: undefined, // Let VideoStudio fallback to 'mode === "image-to-video"'
    requiresPrompt: true, // Veo API expects prompt for all modes
    getDefaultValues: () => ({
      aspectRatio: "16:9",
      enableTranslation: true,
    }),
    buildPayload: (values: ProviderFormValues): VideoInputPayload => {
      const imageUrls = [values.imageUrl, values.endImageUrl]
        .map((url) => toHttpUrl(url))
        .filter((url): url is string => !!url);

      const payload: VideoInputPayload = {
        prompt: values.prompt?.trim() || undefined,
        model: modelId,
        enableTranslation: values.enableTranslation !== false,
        // Provided dynamically for downstream integrations tracking
        image_url: toHttpUrl(values.imageUrl),
        end_image_url: toHttpUrl(values.endImageUrl),
      };

      if (imageUrls.length > 0) {
        payload.imageUrls = imageUrls;
      }

      if (values.aspectRatio && values.aspectRatio !== "Auto") {
        payload.aspectRatio = values.aspectRatio;
      } else if (values.aspectRatio === "Auto") {
        payload.aspectRatio = "Auto";
      }

      if (values.watermark?.trim()) {
        payload.watermark = values.watermark.trim();
      }

      if (values.seed) {
        payload.seeds = toSeed(values.seed) ? Number(toSeed(values.seed)) : undefined;
        payload.seed = toSeed(values.seed); // Support snake_case if required server-side
      }

      return payload;
    },
  };
}

export default function VeoFields({
  values,
  onChange,
  isPublic,
  onPublicChange,
  t,
  mode,
}: ProviderFieldsProps) {
  const isImageMode = mode === "image-to-video";

  return (
    <div className="space-y-4">
      {isImageMode && (
        <ImageUploadField
          imageUrl={values.imageUrl}
          onChange={(v) => onChange({ imageUrl: v })}
          t={t}
        />
      )}

      {isImageMode && (
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

      <AspectRatioSelector
        aspectRatios={VEO_ASPECT_RATIOS}
        selected={values.aspectRatio}
        onChange={(v) => onChange({ aspectRatio: v })}
        t={t}
      />

      <AdvancedSettings
        values={values}
        onChange={onChange}
        isPublic={isPublic}
        onPublicChange={onPublicChange}
        supportsSeed={true}
        supportsWatermark={true}
        supportsTranslation={true}
        t={t}
      />
    </div>
  );
}
