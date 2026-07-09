import runtimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  type AiVideoStudioFamily,
  type AiVideoStudioVersion,
} from "@/config/ai-video-studio";
import { DEFAULT_LOCALE } from "@/i18n/routing";

type SupportedLocale = "en" | "zh" | "ja";
type PriceUnit = "fixed" | "per_image" | "per_second";

export interface AiVideoModelPricingRow {
  billingNote: string;
  creditPrice: string;
  familyKey: string;
  familyLabel: string;
  isHot: boolean;
  isSpecial: boolean;
  model: string;
  priceRate: number;
  priceUnit: PriceUnit;
  spec: string;
  type: string;
  versionKey: string;
}

export interface AiVideoModelPricingGroup {
  familyKey: string;
  familyLabel: string;
  modelCount: number;
  priceSummary: string;
  rows: AiVideoModelPricingRow[];
}

function resolveLocale(locale: string): SupportedLocale {
  if (locale === "zh" || locale === "ja") {
    return locale;
  }

  return DEFAULT_LOCALE as SupportedLocale;
}

function formatRate(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatCreditsPerSecond(value: number, locale: SupportedLocale) {
  if (locale === "zh") {
    return `${formatRate(value)} 积分/秒`;
  }
  if (locale === "ja") {
    return `${formatRate(value)} クレジット/秒`;
  }
  return `${formatRate(value)} credits/s`;
}

function formatFixedCredits(value: number, locale: SupportedLocale) {
  if (locale === "zh") {
    return `${formatRate(value)} 积分`;
  }
  if (locale === "ja") {
    return `${formatRate(value)} クレジット`;
  }
  return `${formatRate(value)} credits`;
}

function formatCreditsPerImage(value: number, locale: SupportedLocale) {
  if (locale === "zh") {
    return `${formatRate(value)} 积分/张`;
  }
  if (locale === "ja") {
    return `${formatRate(value)} クレジット/枚`;
  }
  return `${formatRate(value)} credits/image`;
}

function formatCreditUnit(unit: PriceUnit, locale: SupportedLocale) {
  if (unit === "per_second") {
    if (locale === "zh") {
      return "积分/秒";
    }
    if (locale === "ja") {
      return "クレジット/秒";
    }
    return "credits/s";
  }

  if (unit === "per_image") {
    if (locale === "zh") {
      return "积分/张";
    }
    if (locale === "ja") {
      return "クレジット/枚";
    }
    return "credits/image";
  }

  if (locale === "zh") {
    return "积分";
  }
  if (locale === "ja") {
    return "クレジット";
  }
  return "credits";
}

function normalizeTypeLabel(value: string, locale: SupportedLocale) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "text-to-video") {
    if (locale === "zh") {
      return "文生视频";
    }
    if (locale === "ja") {
      return "テキストから動画";
    }
    return "Text to Video";
  }

  if (normalized === "image-to-video") {
    if (locale === "zh") {
      return "图生视频";
    }
    if (locale === "ja") {
      return "画像から動画";
    }
    return "Image to Video";
  }

  if (normalized === "text/image-to-video") {
    if (locale === "zh") {
      return "文/图生视频";
    }
    if (locale === "ja") {
      return "テキスト/画像から動画";
    }
    return "Text/Image to Video";
  }

  if (normalized === "text-to-image") {
    if (locale === "zh") {
      return "文生图";
    }
    if (locale === "ja") {
      return "テキストから画像";
    }
    return "Text to Image";
  }

  if (normalized === "image-to-image") {
    if (locale === "zh") {
      return "图生图";
    }
    if (locale === "ja") {
      return "画像から画像";
    }
    return "Image to Image";
  }

  if (normalized === "video-to-video") {
    if (locale === "zh") {
      return "视频转视频";
    }
    if (locale === "ja") {
      return "動画から動画";
    }
    return "Video to Video";
  }

  if (normalized === "storyboard") {
    return "Storyboard";
  }

  return value.trim();
}

function isDurationPricing(priceFinal: string) {
  return /\b(duration|video_duration|audio_duration|n_frames|extend_times)\b/.test(
    priceFinal,
  );
}

function isImageCountPricing(priceFinal: string) {
  return /\b(num_images|image_count|quantity|count)\b/.test(priceFinal);
}

function getPriceUnit(priceFinal: string): PriceUnit {
  if (isImageCountPricing(priceFinal)) {
    return "per_image";
  }

  if (isDurationPricing(priceFinal)) {
    return "per_second";
  }

  return "fixed";
}

function formatCreditPrice(input: {
  locale: SupportedLocale;
  priceFinal: string;
  rate: number;
}) {
  const unit = getPriceUnit(input.priceFinal);

  if (unit === "per_image") {
    return formatCreditsPerImage(input.rate, input.locale);
  }

  if (unit === "per_second") {
    return formatCreditsPerSecond(input.rate, input.locale);
  }

  return formatFixedCredits(input.rate, input.locale);
}

function formatPriceSummary(
  rows: AiVideoModelPricingRow[],
  locale: SupportedLocale,
) {
  const unitOrder: PriceUnit[] = ["per_second", "fixed", "per_image"];

  return unitOrder
    .map((unit) => {
      const rates = rows
        .filter((row) => row.priceUnit === unit)
        .map((row) => row.priceRate);

      if (rates.length === 0) {
        return null;
      }

      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const rateLabel =
        min === max ? formatRate(min) : `${formatRate(min)}-${formatRate(max)}`;

      return `${rateLabel} ${formatCreditUnit(unit, locale)}`;
    })
    .filter(Boolean)
    .join(" / ");
}

function getDynamicPriceNote(input: {
  mode: string | null;
  locale: SupportedLocale;
  priceFinal: string;
  rate: number;
}) {
  const rate = formatRate(input.rate);

  if (input.mode === "with_video" || input.mode === "video-input") {
    if (input.locale === "zh") {
      return `（输入秒数 + 输出秒数）× ${rate}`;
    }
    if (input.locale === "ja") {
      return `（入力秒数 + 出力秒数）× ${rate}`;
    }
    return `(input + output) × ${rate}`;
  }

  if (isImageCountPricing(input.priceFinal)) {
    if (input.locale === "zh") {
      return `图片数量 × ${rate}`;
    }
    if (input.locale === "ja") {
      return `画像数 × ${rate}`;
    }
    return `Images × ${rate}`;
  }

  if (!isDurationPricing(input.priceFinal)) {
    if (input.locale === "zh") {
      return "单次生成固定价格";
    }
    if (input.locale === "ja") {
      return "生成ごとの固定価格";
    }
    return "Fixed per generation";
  }

  if (input.locale === "zh") {
    return `输出秒数 × ${rate}`;
  }
  if (input.locale === "ja") {
    return `出力秒数 × ${rate}`;
  }
  return `Output seconds × ${rate}`;
}

function resolveRuntimeCatalogEntry(version: AiVideoStudioVersion) {
  return runtimeCatalog.items.find((item) => item.id === version.modelId);
}

function getPriceKeyParts(key: string) {
  return key === "default" ? [] : key.split("|").filter(Boolean);
}

function inferBaseType(version: AiVideoStudioVersion) {
  const label = version.label.toLowerCase();

  if (version.modelId.startsWith("image:")) {
    return label.includes("image to image") || label.includes("edit")
      ? "image-to-image"
      : "text-to-image";
  }

  if (label.includes("storyboard")) {
    return "storyboard";
  }

  if (label.includes("image to video")) {
    return "image-to-video";
  }

  if (label.includes("text to video")) {
    return "text-to-video";
  }

  return "text/image-to-video";
}

function inferPriceType(
  parts: string[],
  locale: SupportedLocale,
  version: AiVideoStudioVersion,
) {
  const mode = parts.find((part) =>
    part === "with_video" ||
    part === "video-input" ||
    part === "no_video" ||
    part === "no-video-input",
  ) ?? null;

  if (mode === "with_video" || mode === "video-input") {
    return normalizeTypeLabel("video-to-video", locale);
  }

  return normalizeTypeLabel(inferBaseType(version), locale);
}

function inferPriceSpec(parts: string[]) {
  return parts.find((part) => /p$|x/.test(part)) ?? parts[0] ?? "-";
}

function buildVersionPricingRows(
  family: AiVideoStudioFamily,
  version: AiVideoStudioVersion,
  locale: SupportedLocale,
) {
  const entry = resolveRuntimeCatalogEntry(version);
  if (!entry?.pricing?.price_map) {
    return [];
  }

  const rows: AiVideoModelPricingRow[] = [];
  const seen = new Set<string>();

  for (const [priceKey, rate] of Object.entries(entry.pricing.price_map)) {
    if (!Number.isFinite(rate) || rate <= 0) {
      continue;
    }

    const parts = getPriceKeyParts(priceKey);
    const mode =
      parts.find((part) => part === "with_video" || part === "video-input") ??
      null;
    const priceUnit = getPriceUnit(entry.pricing.price_final);
    const row = {
      billingNote: getDynamicPriceNote({
        mode,
        locale,
        priceFinal: entry.pricing.price_final,
        rate,
      }),
      creditPrice: formatCreditPrice({
        locale,
        priceFinal: entry.pricing.price_final,
        rate,
      }),
      familyKey: family.key,
      familyLabel: family.label,
      isHot: version.isHot === true,
      isSpecial: version.isSpecial === true,
      model: version.label,
      priceRate: rate,
      priceUnit,
      spec: inferPriceSpec(parts),
      type: inferPriceType(parts, locale, version),
      versionKey: version.key,
    } satisfies AiVideoModelPricingRow;

    const key = `${row.model}|${row.type}|${row.spec}|${row.creditPrice}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

export function buildAiVideoModelPricingRows({
  familyKey,
  locale,
}: {
  familyKey?: string;
  locale: string;
}): AiVideoModelPricingRow[] {
  const resolvedLocale = resolveLocale(locale);
  const rows: AiVideoModelPricingRow[] = [];

  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    if (family.selectable === false || (familyKey && family.key !== familyKey)) {
      continue;
    }

    for (const version of family.versions) {
      rows.push(...buildVersionPricingRows(family, version, resolvedLocale));
    }
  }

  return rows;
}

export function buildAiVideoModelPricingGroups({
  locale,
}: {
  locale: string;
}): AiVideoModelPricingGroup[] {
  const resolvedLocale = resolveLocale(locale);
  const rows = buildAiVideoModelPricingRows({ locale });
  const groups: AiVideoModelPricingGroup[] = [];
  const groupMap = new Map<string, AiVideoModelPricingGroup>();

  for (const row of rows) {
    let group = groupMap.get(row.familyKey);
    if (!group) {
      group = {
        familyKey: row.familyKey,
        familyLabel: row.familyLabel,
        modelCount: 0,
        priceSummary: "",
        rows: [],
      };
      groupMap.set(row.familyKey, group);
      groups.push(group);
    }

    group.rows.push(row);
    group.modelCount = new Set(group.rows.map((item) => item.versionKey)).size;
    group.priceSummary = formatPriceSummary(group.rows, resolvedLocale);
  }

  return groups;
}
