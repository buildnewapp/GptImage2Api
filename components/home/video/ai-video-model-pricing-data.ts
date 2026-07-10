import runtimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  type AiVideoStudioFamily,
  type AiVideoStudioVersion,
} from "@/config/ai-video-studio";

type PriceUnit = "fixed" | "per_image" | "per_second";

export type AiVideoModelPricingCopy = {
  billingNotes?: {
    fixed?: string;
    imageCount?: string;
    outputSeconds?: string;
    withVideo?: string;
  };
  creditPrices?: {
    fixed?: string;
    perImage?: string;
    perSecond?: string;
  };
  typeLabels?: Record<string, string>;
  units?: {
    fixed?: string;
    perImage?: string;
    perSecond?: string;
  };
};

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

const defaultTypeLabels: Record<string, string> = {
  "image-to-image": "Image to Image",
  "image-to-video": "Image to Video",
  "storyboard": "Storyboard",
  "text-to-image": "Text to Image",
  "text-to-video": "Text to Video",
  "text/image-to-video": "Text/Image to Video",
  "video-to-video": "Video to Video",
};

const defaultCopy = {
  billingNotes: {
    fixed: "Fixed per generation",
    imageCount: "Images × {rate}",
    outputSeconds: "Output seconds × {rate}",
    withVideo: "(input + output) × {rate}",
  },
  creditPrices: {
    fixed: "{value} credits",
    perImage: "{value} credits/image",
    perSecond: "{value} credits/s",
  },
  typeLabels: defaultTypeLabels,
  units: {
    fixed: "credits",
    perImage: "credits/image",
    perSecond: "credits/s",
  },
} as const;

function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

function formatRate(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatCreditsPerSecond(value: number, copy: AiVideoModelPricingCopy) {
  return formatTemplate(
    copy.creditPrices?.perSecond ?? defaultCopy.creditPrices.perSecond,
    { value: formatRate(value) },
  );
}

function formatFixedCredits(value: number, copy: AiVideoModelPricingCopy) {
  return formatTemplate(
    copy.creditPrices?.fixed ?? defaultCopy.creditPrices.fixed,
    { value: formatRate(value) },
  );
}

function formatCreditsPerImage(value: number, copy: AiVideoModelPricingCopy) {
  return formatTemplate(
    copy.creditPrices?.perImage ?? defaultCopy.creditPrices.perImage,
    { value: formatRate(value) },
  );
}

function formatCreditUnit(unit: PriceUnit, copy: AiVideoModelPricingCopy) {
  if (unit === "per_second") {
    return copy.units?.perSecond ?? defaultCopy.units.perSecond;
  }

  if (unit === "per_image") {
    return copy.units?.perImage ?? defaultCopy.units.perImage;
  }

  return copy.units?.fixed ?? defaultCopy.units.fixed;
}

function normalizeTypeLabel(value: string, copy: AiVideoModelPricingCopy) {
  const normalized = value.trim().toLowerCase();

  return copy.typeLabels?.[normalized] ?? defaultCopy.typeLabels[normalized] ?? value.trim();
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
  copy: AiVideoModelPricingCopy;
  priceFinal: string;
  rate: number;
}) {
  const unit = getPriceUnit(input.priceFinal);

  if (unit === "per_image") {
    return formatCreditsPerImage(input.rate, input.copy);
  }

  if (unit === "per_second") {
    return formatCreditsPerSecond(input.rate, input.copy);
  }

  return formatFixedCredits(input.rate, input.copy);
}

function formatPriceSummary(
  rows: AiVideoModelPricingRow[],
  copy: AiVideoModelPricingCopy,
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

      return `${rateLabel} ${formatCreditUnit(unit, copy)}`;
    })
    .filter(Boolean)
    .join(" / ");
}

function getDynamicPriceNote(input: {
  copy: AiVideoModelPricingCopy;
  mode: string | null;
  priceFinal: string;
  rate: number;
}) {
  const rate = formatRate(input.rate);

  if (input.mode === "with_video" || input.mode === "video-input") {
    return formatTemplate(
      input.copy.billingNotes?.withVideo ?? defaultCopy.billingNotes.withVideo,
      { rate },
    );
  }

  if (isImageCountPricing(input.priceFinal)) {
    return formatTemplate(
      input.copy.billingNotes?.imageCount ?? defaultCopy.billingNotes.imageCount,
      { rate },
    );
  }

  if (!isDurationPricing(input.priceFinal)) {
    return input.copy.billingNotes?.fixed ?? defaultCopy.billingNotes.fixed;
  }

  return formatTemplate(
    input.copy.billingNotes?.outputSeconds ?? defaultCopy.billingNotes.outputSeconds,
    { rate },
  );
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
  copy: AiVideoModelPricingCopy,
  version: AiVideoStudioVersion,
) {
  const mode = parts.find((part) =>
    part === "with_video" ||
    part === "video-input" ||
    part === "no_video" ||
    part === "no-video-input",
  ) ?? null;

  if (mode === "with_video" || mode === "video-input") {
    return normalizeTypeLabel("video-to-video", copy);
  }

  return normalizeTypeLabel(inferBaseType(version), copy);
}

function inferPriceSpec(parts: string[]) {
  return parts.find((part) => /p$|x/.test(part)) ?? parts[0] ?? "-";
}

function buildVersionPricingRows(
  family: AiVideoStudioFamily,
  version: AiVideoStudioVersion,
  copy: AiVideoModelPricingCopy,
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
        copy,
        mode,
        priceFinal: entry.pricing.price_final,
        rate,
      }),
      creditPrice: formatCreditPrice({
        copy,
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
      type: inferPriceType(parts, copy, version),
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
  copy = defaultCopy,
  familyKey,
}: {
  copy?: AiVideoModelPricingCopy;
  familyKey?: string;
  locale: string;
}): AiVideoModelPricingRow[] {
  const rows: AiVideoModelPricingRow[] = [];

  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    if (family.selectable === false || (familyKey && family.key !== familyKey)) {
      continue;
    }

    for (const version of family.versions) {
      rows.push(...buildVersionPricingRows(family, version, copy));
    }
  }

  return rows;
}

export function buildAiVideoModelPricingGroups({
  copy = defaultCopy,
  locale,
}: {
  copy?: AiVideoModelPricingCopy;
  locale: string;
}): AiVideoModelPricingGroup[] {
  const rows = buildAiVideoModelPricingRows({ copy, locale });
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
    group.priceSummary = formatPriceSummary(group.rows, copy);
  }

  return groups;
}
