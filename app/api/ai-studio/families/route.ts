import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { getCachedAiStudioCatalog } from "@/lib/ai-studio/catalog";
import { apiResponse } from "@/lib/api-response";

function formatRate(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function isDurationPricing(priceFinal: string) {
  return /\b(duration|video_duration|audio_duration|n_frames|extend_times)\b/.test(
    priceFinal,
  );
}

function isImageCountPricing(priceFinal: string) {
  return /\b(num_images|image_count|quantity|count)\b/.test(priceFinal);
}

function formatPricingLabel(pricing: {
  price_map?: Record<string, number>;
  price_final?: string;
} | null | undefined) {
  if (!pricing?.price_map || !pricing.price_final) {
    return null;
  }

  const unit = isImageCountPricing(pricing.price_final)
    ? "credits/image"
    : isDurationPricing(pricing.price_final)
      ? "credits/s"
      : "credits";
  const entries = Object.entries(pricing.price_map)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([key, value]) => `${key}: ${formatRate(value)} ${unit}`);

  if (entries.length === 0) {
    return null;
  }

  return entries.join(" · ");
}

export async function GET() {
  try {
    const catalog = await getCachedAiStudioCatalog();
    const pricingByModelId = new Map(
      catalog.map((entry) => [entry.id, formatPricingLabel(entry.pricing)]),
    );
    const families = AI_VIDEO_STUDIO_FAMILIES.map((family) => ({
      ...family,
      versions: family.versions.map((version) => ({
        ...version,
        priceLabel: pricingByModelId.get(version.modelId) ?? null,
      })),
    }));

    return apiResponse.success({
      families,
      total: families.length,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Video Studio families",
    );
  }
}
