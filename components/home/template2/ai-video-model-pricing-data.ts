import runtimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  type AiVideoStudioVersion,
} from "@/config/ai-video-studio";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { calculateSeedanceVideoPricing } from "@/lib/ai-studio/seedance-pricing";

type SupportedLocale = "en" | "zh" | "ja";

type RuntimeCatalogEntry = (typeof runtimeCatalog.items)[number];
type RuntimePricingRow = RuntimeCatalogEntry["pricingRows"][number];

export interface AiVideoModelPricingRow {
  billingNote: string;
  creditPrice: string;
  model: string;
  spec: string;
  type: string;
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

function formatCredits(value: string, locale: SupportedLocale) {
  if (locale === "zh") {
    return `${value} 积分`;
  }
  if (locale === "ja") {
    return `${value} クレジット`;
  }
  return `${value} credits`;
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

function getFixedPriceNote(locale: SupportedLocale) {
  if (locale === "zh") {
    return "按规格固定计费";
  }
  if (locale === "ja") {
    return "仕様ごとの固定料金";
  }
  return "Fixed price by spec";
}

function getDynamicPriceNote(input: {
  hasVideoInput: boolean;
  locale: SupportedLocale;
  rate: number;
}) {
  const rate = formatRate(input.rate);

  if (input.hasVideoInput) {
    if (input.locale === "zh") {
      return `（输入秒数 + 输出秒数）× ${rate}`;
    }
    if (input.locale === "ja") {
      return `（入力秒数 + 出力秒数）× ${rate}`;
    }
    return `(input + output) × ${rate}`;
  }

  if (input.locale === "zh") {
    return `输出秒数 × ${rate}`;
  }
  if (input.locale === "ja") {
    return `出力秒数 × ${rate}`;
  }
  return `Output seconds × ${rate}`;
}

function parseStaticPricingRow(
  modelLabel: string,
  pricingRow: RuntimePricingRow,
  locale: SupportedLocale,
): AiVideoModelPricingRow {
  const segments = pricingRow.modelDescription
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const type = normalizeTypeLabel(segments[1] ?? "", locale);
  const spec = segments.slice(2).join(", ") || "-";

  return {
    billingNote: getFixedPriceNote(locale),
    creditPrice: formatCredits(pricingRow.creditPrice, locale),
    model: modelLabel,
    spec,
    type,
  };
}

function resolveRuntimeCatalogEntry(version: AiVideoStudioVersion) {
  const candidateIds = [version.modelId, ...(version.aliases ?? [])];

  return runtimeCatalog.items.find((item) => candidateIds.includes(item.id));
}

function buildDynamicSeedanceRows(
  version: AiVideoStudioVersion,
  locale: SupportedLocale,
): AiVideoModelPricingRow[] {
  const examples = [
    {
      payload: {
        duration: 1,
        resolution: "480p",
      },
      spec: "480p",
      type: "text/image-to-video",
    },
    {
      payload: {
        duration: 1,
        resolution: "720p",
      },
      spec: "720p",
      type: "text/image-to-video",
    },
    {
      payload: {
        duration: 1,
        resolution: "480p",
        input: {
          video_duration: 1,
          video_url: "https://example.com/input.mp4",
        },
      },
      spec: "480p",
      type: "video-to-video",
    },
    {
      payload: {
        duration: 1,
        resolution: "720p",
        input: {
          video_duration: 1,
          video_url: "https://example.com/input.mp4",
        },
      },
      spec: "720p",
      type: "video-to-video",
    },
  ] as const;

  const rows: Array<AiVideoModelPricingRow | null> = examples.map((example) => {
      const pricing = calculateSeedanceVideoPricing({
        model: version.aliases?.[0] ?? version.modelId,
        payload: example.payload,
      });

      if (!pricing) {
        return null;
      }

      return {
        billingNote: getDynamicPriceNote({
          hasVideoInput: pricing.hasVideoInput,
          locale,
          rate: pricing.rate,
        }),
        creditPrice: formatCreditsPerSecond(pricing.rate, locale),
        model: version.label,
        spec: example.spec,
        type: normalizeTypeLabel(example.type, locale),
      } satisfies AiVideoModelPricingRow;
    })

  return rows.filter((row): row is AiVideoModelPricingRow => row !== null);
}

export function buildAiVideoModelPricingRows({
  locale,
}: {
  locale: string;
}): AiVideoModelPricingRow[] {
  const resolvedLocale = resolveLocale(locale);
  const rows: AiVideoModelPricingRow[] = [];

  for (const family of AI_VIDEO_STUDIO_FAMILIES) {
    if (family.selectable === false) {
      continue;
    }

    for (const version of family.versions) {
      const entry = resolveRuntimeCatalogEntry(version);

      if ((entry?.pricingRows.length ?? 0) > 0) {
        rows.push(
          ...entry!.pricingRows.map((pricingRow) =>
            parseStaticPricingRow(version.label, pricingRow, resolvedLocale),
          ),
        );
        continue;
      }

      rows.push(...buildDynamicSeedanceRows(version, resolvedLocale));
    }
  }

  return rows;
}
