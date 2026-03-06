export type GenerationMode = "image-to-video" | "text-to-video";
export type ProviderKey = "office";

export type PricingRule =
  | {
    kind: "table2d";
    unit: "credits";
    axes: {
      resolution: string[];
      duration: string[];
    };
    table: Record<string, Record<string, number>>;
  }
  | {
    kind: "rate_per_second_by_resolution";
    unit: "credits";
    rates: Record<string, number>;
    rounding?: "ceil" | "round";
  }
  | {
    kind: "by_duration";
    unit: "credits";
    values: Record<string, number>;
  }
  | {
    kind: "fixed";
    unit: "credits";
    value: number;
  };


export type ProviderImplementation = {
  providerKey: ProviderKey;
  mode: GenerationMode;
  modelId: string;
  doc?: string;
  pricing?: PricingRule;
};

export type ModelVersion = {
  versionKey: string;
  displayName: string;
  implementations: ProviderImplementation[];
};

export type VideoModelFamily = {
  modelKey: string;
  displayName: string;
  description: string;
  tags?: { text: string; type: string }[];
  selectable?: boolean;
  versions: ModelVersion[];
};

export type SelectionContext = {
  mode: GenerationMode;
  modelKey: string;
  versionKey?: string;
  providerKey?: ProviderKey;
};

export type VideoInputPayload = Record<string, unknown>;

export const VIDEO_MODEL_FAMILIES: VideoModelFamily[] = [
  {
    modelKey: "seedance-1.5",
    displayName: "Seedance 1.5",
    description: "Joint audio-video with multilingual lip-sync",
    tags: [{ text: "HOT", type: "hot" }, { text: "With Audio", type: "audio" }],
    versions: [
      {
        versionKey: "seedance-1.5",
        displayName: "Seedance 1.5",
        implementations: [
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "bytedance/v1-pro-image-to-video",
            pricing: {
              kind: "table2d",
              unit: "credits",
              axes: {
                resolution: ["480p", "720p", "1080p"],
                duration: ["5s", "10s"],
              },
              table: {
                "480p": { "5s": 14, "10s": 28 },
                "720p": { "5s": 30, "10s": 60 },
                "1080p": { "5s": 70, "10s": 140 },
              },
            },
          },
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "bytedance/v1-pro-text-to-video",
            pricing: {
              kind: "rate_per_second_by_resolution",
              unit: "credits",
              rates: { "480p": 3, "720p": 6, "1080p": 14 },
              rounding: "ceil",
            },
          },
        ],
      },
      {
        versionKey: "seedance-1.5-fast",
        displayName: "Seedance 1.5 fast",
        implementations: [
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "bytedance/v1-pro-fast-image-to-video",
            pricing: {
              kind: "table2d",
              unit: "credits",
              axes: {
                resolution: ["720p", "1080p"],
                duration: ["5s", "10s"],
              },
              table: {
                "720p": { "5s": 16, "10s": 36 },
                "1080p": { "5s": 36, "10s": 72 },
              },
            },
          },
        ],
      },
    ],
  },
  {
    modelKey: "seedance-2.0",
    displayName: "Seedance 2.0",
    description: "Open only to invited personnel; if needed, please apply by email",
    tags: [{ text: "Targeted opening", type: "coming-soon" }],
    selectable:false,
    versions: [
      {
        versionKey: "seedance-2.0",
        displayName: "Seedance 2.0",
        implementations: [
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "",
          },
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "",
          },
        ],
      }
    ],
  },
  {
    modelKey: "seedance-1.0",
    displayName: "Seedance 1.0",
    description: "Advanced model with smooth, stable motion",
    versions: [
      {
        versionKey: "seedance-1.0",
        displayName: "Seedance 1.0",
        implementations: [
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "bytedance/v1-lite-image-to-video",
            pricing: {
              kind: "rate_per_second_by_resolution",
              unit: "credits",
              rates: { "480p": 2, "720p": 4.5, "1080p": 10 },
              rounding: "ceil",
            },
          },
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "bytedance/v1-lite-text-to-video",
            pricing: {
              kind: "rate_per_second_by_resolution",
              unit: "credits",
              rates: { "480p": 2, "720p": 4.5, "1080p": 10 },
              rounding: "ceil",
            },
          },
        ],
      },
    ],
  },
  {
    modelKey: "sora-2",
    displayName: "Sora 2",
    description: "OpenAI model with realistic physics",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
      {
        versionKey: "sora-2",
        displayName: "Sora 2",
        implementations: [
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "sora-2-text-to-video",
            pricing: {
              kind: "by_duration",
              unit: "credits",
              values: { "10s": 10, "15s": 14 },
            },
          },
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "sora-2-image-to-video",
            pricing: {
              kind: "by_duration",
              unit: "credits",
              values: { "10s": 10, "15s": 14 },
            },
          },
        ],
      },
      {
        versionKey: "sora-2-pro",
        displayName: "Sora 2 Pro",
        implementations: [
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "sora-2-pro-text-to-video",
            pricing: {
              kind: "by_duration",
              unit: "credits",
              values: { "10s": 75, "15s": 135 },
            },
          },
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "sora-2-pro-image-to-video",
            pricing: {
              kind: "by_duration",
              unit: "credits",
              values: { "10s": 75, "15s": 135 },
            },
          },
        ],
      },
      {
        versionKey: "sora-2-pro-storyboard",
        displayName: "Sora 2 Pro Storyboard",
        implementations: [
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "sora-2-pro-storyboard",
            pricing: {
              kind: "by_duration",
              unit: "credits",
              values: { "10s": 75, "15s": 135, "20s": 135, "25s": 135 },
            },
          },
        ],
      },
    ],
  },
  {
    modelKey: "veo-3.1",
    displayName: "Veo 3.1",
    description: "Google's latest video model with native audio",
    tags: [{ text: "With Audio", type: "audio" }],
    versions: [
      {
        versionKey: "veo-3.1-fast",
        displayName: "Veo 3.1 Fast",
        implementations: [
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "veo3_fast",
            pricing: {
              kind: "fixed",
              unit: "credits",
              value: 20,
            },
          },
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "veo3_fast",
            pricing: {
              kind: "fixed",
              unit: "credits",
              value: 20,
            },
          },
        ],
      },
      {
        versionKey: "veo-3.1-quality",
        displayName: "Veo 3.1 Quality",
        implementations: [
          {
            providerKey: "office",
            mode: "text-to-video",
            modelId: "veo3",
            pricing: {
              kind: "fixed",
              unit: "credits",
              value: 150,
            },
          },
          {
            providerKey: "office",
            mode: "image-to-video",
            modelId: "veo3",
            pricing: {
              kind: "fixed",
              unit: "credits",
              value: 150,
            },
          },
        ],
      }
    ],
  },
];

type ResolvedSelection = {
  family: VideoModelFamily;
  version: ModelVersion;
  implementation: ProviderImplementation;
};

export function getModelFamiliesByMode(mode: GenerationMode): VideoModelFamily[] {
  return VIDEO_MODEL_FAMILIES.filter((family) =>
    family.versions.some((version) =>
      version.implementations.some((impl) => impl.mode === mode),
    ),
  );
}

export function getVersionsByMode(
  modelKey: string,
  mode: GenerationMode,
): ModelVersion[] {
  const family = VIDEO_MODEL_FAMILIES.find((item) => item.modelKey === modelKey);
  if (!family) return [];
  return family.versions.filter((version) =>
    version.implementations.some((impl) => impl.mode === mode),
  );
}

export function resolveSelection(context: SelectionContext): ResolvedSelection | null {
  const family = VIDEO_MODEL_FAMILIES.find((item) => item.modelKey === context.modelKey);
  if (!family) return null;

  const availableVersions = family.versions.filter((version) =>
    version.implementations.some((impl) => impl.mode === context.mode),
  );
  if (availableVersions.length === 0) return null;

  const version =
    (context.versionKey
      ? availableVersions.find((item) => item.versionKey === context.versionKey)
      : null) || availableVersions[0];
  if (!version) return null;

  const providers = version.implementations.filter(
    (impl) =>
      impl.mode === context.mode &&
      (!context.providerKey || impl.providerKey === context.providerKey),
  );
  if (providers.length === 0) return null;

  return {
    family,
    version,
    implementation: providers[0],
  };
}

export function findImplementationByModelId(modelId: string): ResolvedSelection | null {
  for (const family of VIDEO_MODEL_FAMILIES) {
    for (const version of family.versions) {
      const implementation = version.implementations.find(
        (impl) => impl.modelId === modelId,
      );
      if (implementation) {
        return { family, version, implementation };
      }
    }
  }
  return null;
}

function normalizeDuration(value: unknown): string | null {
  if (typeof value === "string") {
    if (/^\d+s$/.test(value)) return value;
    if (/^\d+$/.test(value)) return `${value}s`;
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${Math.floor(value)}s`;
  }
  return null;
}



export function calculateCreditsForImplementation(
  implementation: ProviderImplementation,
  input: VideoInputPayload,
): number | null {
  const pricing = implementation.pricing;
  const resolution = typeof input.resolution === "string" ? input.resolution : null;
  const duration = normalizeDuration(input.duration);

  if (!pricing) return null;

  if (pricing.kind === "fixed") {
    return pricing.value;
  }

  if (pricing.kind === "by_duration") {
    if (!duration) return null;
    return pricing.values[duration] ?? null;
  }

  if (pricing.kind === "table2d") {
    if (!resolution || !duration) return null;
    return pricing.table[resolution]?.[duration] ?? null;
  }

  if (pricing.kind === "rate_per_second_by_resolution") {
    if (!resolution || !duration) return null;
    const rate = pricing.rates[resolution];
    if (rate === undefined) return null;
    const seconds = Number.parseInt(duration.replace("s", ""), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const total = rate * seconds;
    return pricing.rounding === "round" ? Math.round(total) : Math.ceil(total);
  }

  return null;
}

export function getAllModelIds(): string[] {
  return VIDEO_MODEL_FAMILIES.flatMap((family) =>
    family.versions.flatMap((version) =>
      version.implementations.map((impl) => impl.modelId),
    ),
  );
}
