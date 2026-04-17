type ConsumeCreditsMap = Record<string, number>;

export type AiStudioStructuredKiePriceRow = {
  pricingKey: string;
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
  usdPrice: string;
  falPrice: string;
  discountRate: number;
  anchor: string;
  discountPrice: boolean;
  catalogModelId?: string | null;
  runtimeModel?: string | null;
  resolution?: string | null;
  duration?: number | null;
  audio?: boolean | null;
  aspectRatio?: string | null;
  source: "kie";
};

export type AiStudioStructuredKiePriceFile = {
  version: number;
  generatedAt: string;
  rows: AiStudioStructuredKiePriceRow[];
};

type KiePriceRawFile = {
  data?: {
    consumeCreditsMap?: ConsumeCreditsMap;
  };
};

function toCreditPrice(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function createRow(
  pricingKey: string,
  creditPrice: number,
  input: Omit<AiStudioStructuredKiePriceRow, "pricingKey" | "creditPrice" | "source">,
): AiStudioStructuredKiePriceRow {
  return {
    pricingKey,
    creditPrice: toCreditPrice(creditPrice),
    source: "kie",
    ...input,
  };
}

function toResolution(value: string | undefined) {
  return value ? value.toLowerCase() : null;
}

function toAspectRatio(value: string | undefined) {
  return value ? value.toLowerCase() : null;
}

function toDuration(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBytedanceVideoKey(pricingKey: string, creditPrice: number) {
  const match = pricingKey.match(
    /^Market_bytedance_(seedance-1\.5-pro|v1-(?:lite|pro)-(?:text-to-video|image-to-video|fast-image-to-video))_(480p|720p|1080p)_(4|5|8|10|12)(?:_(with-audio|no-audio))?$/i,
  );

  if (!match) {
    return null;
  }

  const [, modelHandle, resolution, duration, audioToken] = match;
  const runtimeModel = `bytedance/${modelHandle}`;
  const provider = modelHandle.startsWith("seedance-1.5")
    ? "ByteDance Seedance 1.5"
    : "ByteDance";

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${runtimeModel}, ${resolution}, ${duration}s${audioToken ? `, ${audioToken}` : ""}`,
    interfaceType: "video",
    provider,
    creditUnit: "per video",
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    runtimeModel,
    resolution: toResolution(resolution),
    duration: toDuration(duration),
    audio:
      audioToken === "with-audio" ? true : audioToken === "no-audio" ? false : null,
  });
}

function parseSeedance2Key(pricingKey: string, creditPrice: number) {
  const match = pricingKey.match(
    /^Market_bytedance_seedance-2(-fast)?_(480p|720p)_(no-video|with-video)$/i,
  );

  if (!match) {
    return null;
  }

  const [, fastToken, resolution, inputMode] = match;
  const catalogModelId = fastToken
    ? "video:seedance-2-0-fast"
    : "video:seedance-2-0";

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${catalogModelId}, ${resolution}, ${inputMode}`,
    interfaceType: "video",
    provider: "ByteDance",
    creditUnit: "per second",
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    catalogModelId,
    resolution: toResolution(resolution),
  });
}

function parseWanVideoKey(pricingKey: string, creditPrice: number) {
  const perSecondMatch = pricingKey.match(
    /^Market_wan_(2-7-(?:text-to-video|image-to-video|r2v|videoedit))_(720p|1080p)$/i,
  );

  if (perSecondMatch) {
    const [, modelHandle, resolution] = perSecondMatch;
    const runtimeModel = `wan/${modelHandle}`;
    return createRow(pricingKey, creditPrice, {
      modelDescription: `${runtimeModel}, ${resolution}`,
      interfaceType: "video",
      provider: "Wan",
      creditUnit: "per second",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      runtimeModel,
      resolution: toResolution(resolution),
    });
  }

  const standardMatch = pricingKey.match(
    /^Market_wan_(2-(?:2-a14b-image-to-video-turbo|2-animate-move|2-animate-replace|5-(?:text-to-video|image-to-video)|6-(?:text-to-video|image-to-video|video-to-video)|6-flash-(?:image-to-video|video-to-video)))_(480p|580p|720p|1080p)(?:_(5|10|15))?(?:_(true|false))?$/i,
  );

  if (!standardMatch) {
    return null;
  }

  const [, modelHandle, resolution, duration, audioToken] = standardMatch;
  const runtimeModel = `wan/${modelHandle}`;
  const creditUnit = duration ? "per video" : "per second";

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${runtimeModel}, ${resolution}${duration ? `, ${duration}s` : ""}${audioToken ? `, ${audioToken}` : ""}`,
    interfaceType: "video",
    provider: "Wan",
    creditUnit,
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    runtimeModel,
    resolution: toResolution(resolution),
    duration: toDuration(duration),
    audio: audioToken === "true" ? true : audioToken === "false" ? false : null,
  });
}

function parseGrokImagineKey(pricingKey: string, creditPrice: number) {
  if (pricingKey === "Market_grok-imagine_upscale") {
    return createRow(pricingKey, creditPrice, {
      modelDescription: "grok-imagine/video-upscale",
      interfaceType: "video",
      provider: "Grok",
      creditUnit: "per video",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      runtimeModel: "grok-imagine/video-upscale",
    });
  }

  const match = pricingKey.match(
    /^Market_grok-imagine_(text-to-video|image-to-video|extend)_(480p|720p)(?:_(6|10|15))?$/i,
  );

  if (!match) {
    return null;
  }

  const [, modelHandle, resolution, duration] = match;
  const runtimeModel = `grok-imagine/${modelHandle}`;

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${runtimeModel}, ${resolution}${duration ? `, ${duration}s` : ""}`,
    interfaceType: "video",
    provider: "Grok",
    creditUnit: duration ? "per video" : "per second",
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    runtimeModel,
    resolution: toResolution(resolution),
    duration: toDuration(duration),
  });
}

function parseHailuoKey(pricingKey: string, creditPrice: number) {
  const match = pricingKey.match(
    /^Market_hailuo_(02-(?:text-to-video-(?:standard|pro)|image-to-video-(?:standard|pro))|2-3-image-to-video-(?:standard|pro))(?:_(512P|768P|1080P))?(?:_(6|10))?$/i,
  );

  if (!match) {
    return null;
  }

  const [, modelHandle, resolution, duration] = match;
  const runtimeModel = `hailuo/${modelHandle}`;

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${runtimeModel}${resolution ? `, ${resolution}` : ""}${duration ? `, ${duration}s` : ""}`,
    interfaceType: "video",
    provider: "Hailuo",
    creditUnit: duration ? "per video" : "per second",
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    runtimeModel,
    resolution: toResolution(resolution),
    duration: toDuration(duration),
  });
}

function parseKlingKey(pricingKey: string, creditPrice: number) {
  const baseV3Match = pricingKey.match(/^kling3_(720p|1080p)_(with|no)_audio$/i);
  if (baseV3Match) {
    const [, resolution, audioToken] = baseV3Match;
    return createRow(pricingKey, creditPrice, {
      modelDescription: `kling-3.0, ${resolution}, ${audioToken === "with" ? "with audio" : "without audio"}`,
      interfaceType: "video",
      provider: "Kling",
      creditUnit: "per video",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      runtimeModel: "kling-3.0",
      resolution: toResolution(resolution),
      audio: audioToken === "with",
    });
  }

  const kling26Match = pricingKey.match(
    /^Market_kling-2\.6_(text-to-video|image-to-video)_(true|false)_(5|10)$/i,
  );
  if (kling26Match) {
    const [, operation, audioToken, durationToken] = kling26Match;
    const runtimeModel = `kling-2.6/${operation}`;
    return createRow(pricingKey, creditPrice, {
      modelDescription: `${runtimeModel}, ${durationToken}s, ${audioToken}`,
      interfaceType: "video",
      provider: "Kling",
      creditUnit: "per video",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      runtimeModel,
      duration: toDuration(durationToken),
      audio: audioToken === "true",
    });
  }

  const motionMatch = pricingKey.match(/^Market_kling-3_motion-control_(720p|1080p)$/i);
  if (motionMatch) {
    const [, resolution] = motionMatch;
    return createRow(pricingKey, creditPrice, {
      modelDescription: `kling-3.0/motion-control, ${resolution}`,
      interfaceType: "video",
      provider: "Kling",
      creditUnit: "per second",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      runtimeModel: "kling-3.0/motion-control",
      resolution: toResolution(resolution),
    });
  }

  const legacyMatch = pricingKey.match(
    /^Market_(kling-(?:2\.6_motion-control|ai-avatar-(?:standard|pro))|kling_v(?:1-avatar-standard|2-1-(?:master-text-to-video|master-image-to-video|pro|standard)|2-5-turbo-(?:text-to-video-pro|image-to-video-pro)))(?:_(720p|1080p|5|10))?(?:_(true|false))?$/i,
  );

  if (!legacyMatch) {
    return null;
  }

  const [, handle, variantToken, audioToken] = legacyMatch;
  const runtimeModel = (() => {
    switch (handle) {
      case "kling-2.6_text-to-video":
        return "kling-2.6/text-to-video";
      case "kling-2.6_image-to-video":
        return "kling-2.6/image-to-video";
      case "kling-2.6_motion-control":
        return "kling-2.6/motion-control";
      case "kling_ai-avatar-standard":
      case "kling_v1-avatar-standard":
        return "kling/ai-avatar-standard";
      case "kling_ai-avatar-pro":
        return "kling/ai-avatar-pro";
      case "kling_v2-1-master-text-to-video":
        return "kling/v2-1-master-text-to-video";
      case "kling_v2-1-master-image-to-video":
        return "kling/v2-1-master-image-to-video";
      case "kling_v2-1-pro":
        return "kling/v2-1-pro";
      case "kling_v2-1-standard":
        return "kling/v2-1-standard";
      case "kling_v2-5-turbo-text-to-video-pro":
        return "kling/v2-5-turbo-text-to-video-pro";
      case "kling_v2-5-turbo-image-to-video-pro":
        return "kling/v2-5-turbo-image-to-video-pro";
      default:
        return null;
    }
  })();

  if (!runtimeModel) {
    return null;
  }

  const resolution =
    variantToken && variantToken.endsWith("p") ? toResolution(variantToken) : null;
  const duration = variantToken && /^\d+$/.test(variantToken) ? toDuration(variantToken) : null;
  const creditUnit = duration || audioToken !== undefined ? "per video" : "per second";

  return createRow(pricingKey, creditPrice, {
    modelDescription: `${runtimeModel}${resolution ? `, ${resolution}` : ""}${duration ? `, ${duration}s` : ""}${audioToken ? `, ${audioToken}` : ""}`,
    interfaceType: "video",
    provider: "Kling",
    creditUnit,
    usdPrice: "",
    falPrice: "",
    discountRate: 0,
    anchor: "",
    discountPrice: false,
    runtimeModel,
    resolution,
    duration,
    audio: audioToken === "true" ? true : audioToken === "false" ? false : null,
  });
}

function createSoraRows(
  pricingKey: string,
  creditPrice: number,
  rows: Array<{
    catalogModelId: string;
    runtimeModel: string;
    duration?: number | null;
    resolution?: string | null;
  }>,
) {
  return rows.map((row) =>
    createRow(pricingKey, creditPrice, {
      modelDescription: `${row.runtimeModel}${row.resolution ? `, ${row.resolution}` : ""}${row.duration ? `, ${row.duration}s` : ""}`,
      interfaceType: "video",
      provider: "OpenAI",
      creditUnit: "per video",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      catalogModelId: row.catalogModelId,
      runtimeModel: row.runtimeModel,
      resolution: row.resolution ?? null,
      duration: row.duration ?? null,
    }),
  );
}

function normalizeSoraDisplayCreditPrice(pricingKey: string, creditPrice: number) {
  switch (pricingKey) {
    case "Market_sora2-remix_NO-WATERMARK_sora2_10":
      return 3;
    case "Market_sora2-remix_NO-WATERMARK_sora2_15":
      return 5;
    case "Market_sora2-remix_WATERMARK_sora2_10":
      return 20;
    case "Market_sora2-remix_WATERMARK_sora2_15":
      return 30;
    case "Market_sora2-remix_sora2pro_standard_10":
      return 75;
    case "Market_sora2-remix_sora2pro_standard_15":
      return 135;
    case "Market_sora2-remix_sora2pro_high_10":
      return 165;
    case "Market_sora2-remix_sora2pro_high_15":
      return 315;
    default:
      return creditPrice;
  }
}

function parseSoraKey(pricingKey: string, creditPrice: number) {
  const normalizedCreditPrice = normalizeSoraDisplayCreditPrice(
    pricingKey,
    creditPrice,
  );

  let match = pricingKey.match(/^Market_SORA2-VIDEO_NO-WATERMARK_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-text-to-video-standard",
        runtimeModel: "sora-2-text-to-video",
        duration: toDuration(match[1]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_SORA2-STABLE-VIDEO_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-text-to-video-stable",
        runtimeModel: "sora-2-text-to-video-stable",
        duration: toDuration(match[1]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_sora2-remix_NO-WATERMARK_sora2_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-image-to-video-standard",
        runtimeModel: "sora-2-image-to-video",
        duration: toDuration(match[1]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_sora2-remix_WATERMARK_sora2_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-image-to-video-stable",
        runtimeModel: "sora-2-image-to-video-stable",
        duration: toDuration(match[1]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_SORA2-VIDEO-PRO_(standard|high)_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-pro-text-to-video",
        runtimeModel: "sora-2-pro-text-to-video",
        resolution: match[1].toLowerCase(),
        duration: toDuration(match[2]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_sora2-remix_sora2pro_(standard|high)_(10|15)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-pro-image-to-video",
        runtimeModel: "sora-2-pro-image-to-video",
        resolution: match[1].toLowerCase(),
        duration: toDuration(match[2]),
      },
    ]);
  }

  match = pricingKey.match(/^Market_SORA2-PRO-STORYBOARD_standard_(10|15|25)$/i);
  if (match) {
    return createSoraRows(pricingKey, normalizedCreditPrice, [
      {
        catalogModelId: "video:sora2-pro-storyboard",
        runtimeModel: "sora-2-pro-storyboard",
        resolution: "standard",
        duration: toDuration(match[1]),
      },
    ]);
  }

  return null;
}

function parseVeoKey(pricingKey: string, creditPrice: number) {
  const createVeoRow = (
    catalogModelIds: string[],
    runtimeModel: string,
    aspectRatio: string | null,
    resolution: string | null,
  ) =>
    catalogModelIds.map((catalogModelId) =>
      createRow(pricingKey, creditPrice, {
        modelDescription: `${catalogModelId}${aspectRatio ? `, ${aspectRatio}` : ""}${resolution ? `, ${resolution}` : ""}`,
        interfaceType: "video",
        provider: "Google",
        creditUnit: "per video",
        usdPrice: "",
        falPrice: "",
        discountRate: 0,
        anchor: "",
        discountPrice: false,
        catalogModelId,
        runtimeModel,
        aspectRatio,
        resolution,
      }),
    );

  let match = pricingKey.match(/^veo-video-fast-generate(?:_(9:16))?(?:_(1080p|4k))?$/i);
  if (match) {
    const [, aspectRatio, resolution] = match;
    return createVeoRow(
      ["video:veo-3.1-fast-text-to-video"],
      "veo3_fast",
      toAspectRatio(aspectRatio),
      toResolution(resolution) ?? "720p",
    );
  }

  match = pricingKey.match(/^veo-material-video-fast-generate(?:_(1080p|4k))?$/i);
  if (match) {
    const [, resolution] = match;
    return createVeoRow(
      ["video:veo-3.1-fast-image-to-video"],
      "veo3_fast",
      null,
      toResolution(resolution) ?? "720p",
    );
  }

  match = pricingKey.match(/^veo-video-generate(?:_(9:16))?(?:_(1080p|4k))?$/i);
  if (match) {
    const [, aspectRatio, resolution] = match;
    return createVeoRow(
      ["video:veo-3.1-quality-text-to-video", "video:veo-3.1-quality-image-to-video"],
      "veo3",
      toAspectRatio(aspectRatio),
      toResolution(resolution) ?? "720p",
    );
  }

  return null;
}

function parseRunwayKey(pricingKey: string, creditPrice: number) {
  if (pricingKey === "runway-aleph-generate") {
    return [
      createRow(pricingKey, creditPrice, {
        modelDescription: "video:generate-aleph-video",
        interfaceType: "video",
        provider: "Runway",
        creditUnit: "per video",
        usdPrice: "",
        falPrice: "",
        discountRate: 0,
        anchor: "",
        discountPrice: false,
        catalogModelId: "video:generate-aleph-video",
      }),
    ];
  }

  const match =
    pricingKey.match(/^runway-duration-(10)-generate$/i) ??
    pricingKey.match(/^runway-generate-(5)s-(720p|1080p)$/i);

  if (!match) {
    return null;
  }

  const duration = match[1];
  const resolution =
    match[0].includes("runway-generate-")
      ? match[2]
      : "720p";

  return [
    createRow(pricingKey, creditPrice, {
      modelDescription: `video:generate-ai-video${resolution ? `, ${resolution}` : ""}${duration ? `, ${duration}s` : ""}`,
      interfaceType: "video",
      provider: "Runway",
      creditUnit: "per video",
      usdPrice: "",
      falPrice: "",
      discountRate: 0,
      anchor: "",
      discountPrice: false,
      catalogModelId: "video:generate-ai-video",
      duration: toDuration(duration),
      resolution: toResolution(resolution ?? undefined),
    }),
  ];
}

function normalizeRows(rows: AiStudioStructuredKiePriceRow[]) {
  const unique = new Map<string, AiStudioStructuredKiePriceRow>();

  for (const row of rows) {
    const key = [
      row.catalogModelId ?? "",
      row.runtimeModel ?? "",
      row.resolution ?? "",
      row.aspectRatio ?? "",
      row.duration ?? "",
      row.audio ?? "",
      row.creditPrice,
      row.creditUnit,
    ].join("|");

    if (!unique.has(key)) {
      unique.set(key, row);
    }
  }

  return [...unique.values()];
}

export function buildAiStudioStructuredKiePrices(
  rawFile: KiePriceRawFile,
): AiStudioStructuredKiePriceFile {
  const consumeCreditsMap = rawFile.data?.consumeCreditsMap ?? {};
  const rows: AiStudioStructuredKiePriceRow[] = [];

  for (const [pricingKey, rawPrice] of Object.entries(consumeCreditsMap)) {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
      continue;
    }

    const parsed =
      parseBytedanceVideoKey(pricingKey, rawPrice) ??
      parseSeedance2Key(pricingKey, rawPrice) ??
      parseWanVideoKey(pricingKey, rawPrice) ??
      parseGrokImagineKey(pricingKey, rawPrice) ??
      parseHailuoKey(pricingKey, rawPrice) ??
      parseKlingKey(pricingKey, rawPrice) ??
      parseSoraKey(pricingKey, rawPrice) ??
      parseVeoKey(pricingKey, rawPrice) ??
      parseRunwayKey(pricingKey, rawPrice);

    if (!parsed) {
      continue;
    }

    if (Array.isArray(parsed)) {
      rows.push(...parsed);
    } else {
      rows.push(parsed);
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    rows: normalizeRows(rows),
  };
}
