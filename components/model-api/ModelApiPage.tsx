import {
  cardHeadingClass,
  moduleCardClass,
  pageShellClass,
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import CTA from "@/components/home/video/CTA";
import type { VideoTemplateCta } from "@/components/home/video/types";
import { Badge } from "@/components/ui/badge";
import {
  ModelApiSwitcher,
  type ModelApiSwitcherLabels,
} from "@/components/model-api/ModelApiSwitcher";
import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";
import runtimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioVersion,
} from "@/config/ai-video-studio";
import { Link, type Locale } from "@/i18n/routing";
import { getShowcaseGenerations } from "@/lib/ai-studio/showcase";
import { normalizeAiVideoStudioSchema } from "@/lib/ai-video-studio/schema";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Code2,
  ImagePlus,
  KeyRound,
  Layers3,
  Music2,
  PlayCircle,
  ShieldCheck,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";

type RuntimeCatalogItem = (typeof runtimeCatalog.items)[number];
type Icon = ComponentType<{ className?: string }>;
type IconKey =
  | "check"
  | "code"
  | "image"
  | "key"
  | "layers"
  | "music"
  | "play"
  | "shield"
  | "sparkles"
  | "video"
  | "zap";

export type ModelApiPageConfig = {
  docsHref: string;
  familyKey: AiVideoStudioFamilyKey;
  messageKey: string;
  path: string;
  showcaseModelIds?: string[];
};

type ModelApiPageLocaleContent = {
  badge: string;
  capabilities: ModelApiFeatureCard[];
  description: string[];
  faqTitle: string;
  faqKicker: string;
  faqs: Array<{
    answer: string;
    question: string;
  }>;
  featuresDescription: string;
  featuresKicker: string;
  featuresTitle: string;
  labels: ModelApiSwitcherLabels;
  communityShowcase: {
    description: string;
    kicker: string;
    title: string;
    viewAll: string;
    viewDetails: string;
  };
  metadata: {
    description: string;
    title: string;
  };
  monitor: {
    label: string;
  };
  pricingNote: string;
  productionKicker: string;
  productionNotes: ModelApiFeatureCard[];
  productionTitle: string;
  quickStartDescription: string;
  quickStartKicker: string;
  quickStartTitle: string;
  title: string;
  useCases: string[];
  useCasesDescription: string;
  useCasesKicker: string;
  useCasesTitle: string;
  cta: VideoTemplateCta;
  workflows: ModelApiFeatureCard[];
};

type ModelApiFeatureCard = {
  body?: string;
  description?: string;
  icon: IconKey;
  title: string;
};

const runtimeCatalogItems = runtimeCatalog.items as RuntimeCatalogItem[];

const icons: Record<IconKey, Icon> = {
  check: CheckCircle2,
  code: Code2,
  image: ImagePlus,
  key: KeyRound,
  layers: Layers3,
  music: Music2,
  play: PlayCircle,
  shield: ShieldCheck,
  sparkles: WandSparkles,
  video: Video,
  zap: Zap,
};

function normalizeModelHandle(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPublicRuntimeCatalogId(item: RuntimeCatalogItem) {
  return item.alias
    ? `${item.category}:${normalizeModelHandle(item.alias)}`
    : item.id;
}

function resolveRuntimeCatalogEntry(version: AiVideoStudioVersion) {
  const candidateIds = new Set([version.modelId, ...(version.aliases ?? [])]);

  return runtimeCatalogItems.find(
    (item) =>
      candidateIds.has(item.id) ||
      candidateIds.has(getPublicRuntimeCatalogId(item)),
  );
}

function formatUsdPerSecond(creditRate: number) {
  const usd = creditRate * 0.005;
  return `$${usd.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}/s`;
}

function parseCreditRate(value: string) {
  const rate = Number.parseFloat(value);
  return Number.isFinite(rate) ? rate : null;
}

function getFieldType(schema: Record<string, any>) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }
  if (schema.type === "integer") {
    return "number";
  }
  if (typeof schema.type === "string") {
    return schema.type;
  }
  return "value";
}

function getFieldDescription(schema: Record<string, any>) {
  const description =
    typeof schema.description === "string"
      ? schema.description.split("\n")[0]?.trim()
      : "";
  const enumValues = Array.isArray(schema.enum)
    ? schema.enum.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];

  if (enumValues.length > 0) {
    return `${description || "Supported values"} (${enumValues.join(", ")})`;
  }

  return description || "Configured by the selected model schema.";
}

function buildParameters(detail: RuntimeCatalogItem | null | undefined) {
  if (!detail) {
    return [];
  }

  const rows: Array<[name: string, type: string, description: string]> = [];
  const existingNames = new Set<string>();
  const normalized = normalizeAiVideoStudioSchema(detail);

  for (const field of normalized.fields) {
    const name = field.key.trim();
    if (!name || existingNames.has(name)) {
      continue;
    }
    existingNames.add(name);
    rows.push([
      name,
      getFieldType(field.schema),
      getFieldDescription(field.schema),
    ]);
  }

  return rows;
}

function buildRequestExample(
  detail: RuntimeCatalogItem | null | undefined,
  version: AiVideoStudioVersion,
) {
  const requestModel = detail?.alias ?? detail?.modelKeys[0] ?? version.key;

  return JSON.stringify(
    {
      model: requestModel,
      input: {
        prompt: "A cinematic product reveal with smooth orbit camera movement",
        reference_image_urls: ["https://example.com/product.png"],
        "reference_video_urls ": [],
        reference_audio_urls: [],
        generate_audio: true,
        resolution: "720p",
        aspect_ratio: "16:9",
        duration: 5,
      },
    },
    null,
    2,
  );
}

async function loadModelApiPageContent(input: {
  config: ModelApiPageConfig;
  locale: string;
}) {
  const t = await getTranslations({
    locale: input.locale,
    namespace: `ModelApi.${input.config.messageKey}`,
  });

  return {
    badge: t("badge"),
    capabilities: t.raw("capabilities") as ModelApiFeatureCard[],
    description: t.raw("description") as string[],
    faqKicker: t("faqKicker"),
    faqTitle: t("faqTitle"),
    faqs: t.raw("faqs") as ModelApiPageLocaleContent["faqs"],
    featuresDescription: t("featuresDescription"),
    featuresKicker: t("featuresKicker"),
    featuresTitle: t("featuresTitle"),
    labels: t.raw("labels") as ModelApiSwitcherLabels,
    communityShowcase: t.raw(
      "communityShowcase",
    ) as ModelApiPageLocaleContent["communityShowcase"],
    metadata: {
      description: t("metadata.description"),
      title: t("metadata.title"),
    },
    monitor: t.raw("monitor") as ModelApiPageLocaleContent["monitor"],
    pricingNote: t("pricingNote"),
    productionKicker: t("productionKicker"),
    productionNotes: t.raw("productionNotes") as ModelApiFeatureCard[],
    productionTitle: t("productionTitle"),
    quickStartDescription: t("quickStartDescription"),
    quickStartKicker: t("quickStartKicker"),
    quickStartTitle: t("quickStartTitle"),
    title: t("title"),
    useCases: t.raw("useCases") as string[],
    useCasesDescription: t("useCasesDescription"),
    useCasesKicker: t("useCasesKicker"),
    useCasesTitle: t("useCasesTitle"),
    cta: t.raw("cta") as VideoTemplateCta,
    workflows: t.raw("workflows") as ModelApiFeatureCard[],
  } satisfies ModelApiPageLocaleContent;
}

async function buildModelPage(input: {
  config: ModelApiPageConfig;
  locale: string;
}) {
  const content = await loadModelApiPageContent(input);
  const modelFamily =
    AI_VIDEO_STUDIO_FAMILIES.find(
      (family) => family.key === input.config.familyKey,
    ) ?? AI_VIDEO_STUDIO_FAMILIES[0];
  const pricingRows = buildAiVideoModelPricingRows({
    familyKey: modelFamily.key,
    locale: input.locale,
  });
  const versions = modelFamily.versions.map((version) => {
    const detail = resolveRuntimeCatalogEntry(version);
    const versionPricingRows = pricingRows.filter(
      (row) => row.model === version.label,
    );
    const versionCreditRates = versionPricingRows
      .map((row) => parseCreditRate(row.creditPrice))
      .filter((rate): rate is number => rate !== null);
    const lowestCreditRate =
      versionCreditRates.length > 0 ? Math.min(...versionCreditRates) : null;

    return {
      key: version.key,
      label: version.label,
      modelId: version.modelId,
      lowest: lowestCreditRate
        ? formatUsdPerSecond(lowestCreditRate)
        : "Custom",
      parameters: buildParameters(detail),
      pricingRows: versionPricingRows.map(
        (row) =>
          `${row.spec}: ${row.creditPrice} - ${row.type} - ${row.billingNote}`,
      ),
      requestExample: buildRequestExample(detail, version),
    };
  });
  const showcaseModelIds =
    input.config.showcaseModelIds ??
    modelFamily.versions.flatMap((version) => [
      version.modelId,
      ...(version.aliases ?? []),
    ]);
  const communityShowcase = await getShowcaseGenerations({
    limit: 6,
    modelIds: showcaseModelIds,
  });

  return {
    content,
    communityShowcase,
    family: modelFamily,
    versions,
  };
}

export async function generateModelApiPageMetadata({
  config,
  locale,
}: {
  config: ModelApiPageConfig;
  locale: string;
}): Promise<Metadata> {
  const content = await loadModelApiPageContent({ config, locale });

  return constructMetadata({
    title: content.metadata.title,
    description: content.metadata.description,
    locale: locale as Locale,
    path: config.path,
  });
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className={cn(sectionKickerClass, "mb-5")}>{kicker}</div>
      <h2 className={cn(sectionTitleClass, "text-[clamp(2.2rem,4vw,3.4rem)]")}>
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export async function ModelApiPage({
  config,
  locale,
}: {
  config: ModelApiPageConfig;
  locale: string;
}) {
  const { content, communityShowcase, family, versions } = await buildModelPage(
    {
      config,
      locale,
    },
  );

  return (
    <div className={pageShellClass + " -mt-20 w-full overflow-x-hidden"}>
      <ModelApiSwitcher
        badge={content.badge}
        description={content.description}
        docsHref={config.docsHref}
        family={family}
        labels={content.labels}
        monitor={content.monitor}
        pricingNote={content.pricingNote}
        versions={versions}
      />

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <SectionHeader
            kicker={content.featuresKicker}
            title={content.featuresTitle}
            description={content.featuresDescription}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {content.capabilities.map((item) => {
              const IconComponent = icons[item.icon];

              return (
                <div
                  key={item.title}
                  className={cn(moduleCardClass, "rounded-[1.5rem] p-6")}
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-border bg-background/76 text-primary">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className={cn(cardHeadingClass, "text-[1.35rem]")}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <SectionHeader
            kicker={content.quickStartKicker}
            title={content.quickStartTitle}
            description={content.quickStartDescription}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {content.workflows.map((item) => {
              const IconComponent = icons[item.icon];

              return (
                <div
                  key={item.title}
                  className={cn(moduleCardClass, "rounded-[1.5rem] p-6")}
                >
                  <IconComponent className="mb-5 h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1400px] gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className={cn(sectionKickerClass, "mb-5")}>
              {content.useCasesKicker}
            </div>
            <h2
              className={cn(
                sectionTitleClass,
                "text-[clamp(2.2rem,4vw,3.4rem)]",
              )}
            >
              {content.useCasesTitle}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              {content.useCasesDescription}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.useCases.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[1.15rem] border border-border bg-card/76 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm leading-6 text-foreground">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {communityShowcase.records.length > 0 ? (
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className={cn(sectionKickerClass, "mb-5")}>
                  {content.communityShowcase.kicker}
                </div>
                <h2
                  className={cn(
                    sectionTitleClass,
                    "text-[clamp(2.2rem,4vw,3.4rem)]",
                  )}
                >
                  {content.communityShowcase.title}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                  {content.communityShowcase.description}
                </p>
              </div>
              <Link
                href="/showcase"
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-[0_16px_34px_-28px_rgba(148,163,184,0.45)] transition hover:-translate-y-0.5 hover:bg-muted md:self-auto"
              >
                {content.communityShowcase.viewAll}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communityShowcase.records.map((record) => {
                const previewUrls =
                  record.resultUrls.length > 0
                    ? record.resultUrls.slice(0, 4)
                    : record.uploadedImage
                      ? [record.uploadedImage]
                      : [];

                return (
                  <Link
                    key={record.id}
                    href={`/showcase/${record.id}`}
                    className={cn(moduleCardClass, "rounded-[1.5rem]")}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-950/85">
                      {previewUrls.length > 0 ? (
                        record.category === "video" ? (
                          <video
                            src={previewUrls[0]}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            playsInline
                            autoPlay
                          />
                        ) : (
                          <div
                            className={cn(
                              "grid h-full w-full gap-1 bg-slate-900 p-1",
                              previewUrls.length === 1
                                ? "grid-cols-1"
                                : previewUrls.length === 2
                                  ? "grid-cols-2"
                                  : "grid-cols-2 grid-rows-2",
                            )}
                          >
                            {previewUrls.map((url, index) => (
                              <img
                                key={`${url}-${index}`}
                                src={url}
                                alt={`${record.title} preview ${index + 1}`}
                                className={cn(
                                  "h-full w-full rounded-[0.8rem] object-cover",
                                  previewUrls.length === 3 &&
                                    index === 0 &&
                                    "row-span-2",
                                )}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center px-5 text-center text-sm text-white/55">
                          {record.title}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent px-4 pb-3 pt-10 text-white sm:px-5 sm:pb-4 sm:pt-12">
                        <div className="flex items-center gap-2">
                          <Badge className="border-white/12 bg-white/12 text-white hover:bg-white/12">
                            {record.category}
                          </Badge>
                          <span className="text-xs text-white/70">
                            {record.provider}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 sm:p-5">
                      <div>
                        <h3
                          className={cn(
                            cardHeadingClass,
                            "line-clamp-2 text-[1.25rem] sm:text-[1.45rem]",
                          )}
                        >
                          {record.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {record.prompt || record.catalogModelId}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateTime(record.createdAt, locale)}
                        </span>
                        <span className="font-medium text-foreground/85">
                          {content.communityShowcase.viewDetails}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <SectionHeader
            kicker={content.productionKicker}
            title={content.productionTitle}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {content.productionNotes.map((item) => {
              const IconComponent = icons[item.icon];

              return (
                <div
                  key={item.title}
                  className={cn(moduleCardClass, "rounded-[1.5rem] p-6")}
                >
                  <IconComponent className="mb-5 h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <SectionHeader kicker={content.faqKicker} title={content.faqTitle} />
          <div className="mx-auto mt-12 max-w-4xl space-y-3">
            {content.faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-[1.25rem] border border-border bg-card/78 p-5"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-foreground">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <ArrowRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTA section={content.cta} />
    </div>
  );
}
