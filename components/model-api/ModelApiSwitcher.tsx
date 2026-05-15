"use client";

import AIVideoStudio from "@/components/ai/AIVideoStudio";
import { AiVideoStudioFamilyIcon } from "@/components/ai/AiVideoStudioFamilyIcon";
import {
  moduleCardClass,
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import type {
  AiVideoStudioFamilyIconKey,
  AiVideoStudioTag,
} from "@/config/ai-video-studio";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileJson,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatusMonitor } from "./StatusMonitor";

type ApiParameter = [name: string, type: string, description: string];

export type ModelApiVersionPanel = {
  key: string;
  label: string;
  modelId: string;
  lowest: string;
  parameters: ApiParameter[];
  pricingRows: string[];
  requestExample: string;
};

export type ModelApiSwitcherLabels = {
  apiDocs: string;
  apiDocsDetail: string;
  apiDocsDetailDescription: string;
  apiInputDescription: string;
  apiInputKicker: string;
  apiInputTitle: string;
  descriptionColumn: string;
  fieldColumn: string;
  lowestCostPrefix: string;
  modelType: string;
  pricingTitle: string;
  requestJson: string;
  runWithApi: string;
  selectedModel: string;
  selectedModelNote: string;
  typeColumn: string;
  useModelForGeneration: string;
};

type ModelApiSwitcherProps = {
  family: {
    key: string;
    icon: AiVideoStudioFamilyIconKey;
    tags?: AiVideoStudioTag[];
  };
  badge: string;
  description: string[];
  docsHref: string;
  labels: ModelApiSwitcherLabels;
  monitor: {
    label: string;
  };
  pricingNote: string;
  versions: ModelApiVersionPanel[];
};

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

function CodePanel({
  requestExample,
  title,
}: {
  requestExample: string;
  title: string;
}) {
  return (
    <div className={cn(moduleCardClass, "rounded-[1.75rem] p-5")}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <FileJson className="h-4 w-4 text-primary" />
        {title}
      </div>
      <pre className="overflow-x-auto rounded-[1.15rem] border border-slate-900/10 bg-slate-950 p-5 text-sm leading-6 text-slate-100 dark:border-white/10">
        <code>{requestExample}</code>
      </pre>
    </div>
  );
}

export function ModelApiSwitcher({
  badge,
  description,
  docsHref,
  family,
  labels,
  monitor,
  pricingNote,
  versions,
}: ModelApiSwitcherProps) {
  const [selectedVersionKey, setSelectedVersionKey] = useState(
    versions[0]?.key ?? "",
  );
  const selectedVersion = useMemo(
    () =>
      versions.find((version) => version.key === selectedVersionKey) ??
      versions[0],
    [selectedVersionKey, versions],
  );

  if (!selectedVersion) {
    return null;
  }

  return (
    <>
      <section className="px-4 pb-8 pt-28 sm:px-6 lg:px-8 lg:pb-12 lg:pt-32">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[1.35rem] border border-border bg-card/84 p-4 shadow-[0_28px_72px_-50px_rgba(15,23,42,0.36)] backdrop-blur sm:rounded-[1.75rem] sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] border border-border bg-background/80 shadow-[0_18px_36px_-24px_rgba(37,99,235,0.5)] md:h-16 md:w-16 md:rounded-[1.25rem]">
                  <AiVideoStudioFamilyIcon icon={family.icon} size={34} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="break-words text-[clamp(2rem,4vw,3.35rem)] font-bold leading-tight tracking-normal text-foreground">
                      <span className="whitespace-nowrap">{family.key}</span>
                    </h1>
                    <span className="inline-flex rounded-full border border-primary/24 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
                      {badge}
                    </span>
                    {family.tags?.map((tag) => (
                      <span
                        key={`${tag.type}-${tag.text}`}
                        className="inline-flex rounded-full border border-border bg-background/78 px-4 py-2 text-sm font-medium text-foreground"
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-wrap justify-start gap-3 lg:justify-end">
                <Link
                  href="#playground"
                  className="inline-flex h-11 min-w-40 cursor-pointer items-center justify-center rounded-[0.8rem] bg-[#2563eb] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_-20px_rgba(37,99,235,0.55)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {labels.runWithApi}
                </Link>
                <Link
                  href={docsHref}
                  className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center rounded-[0.8rem] border border-border bg-background/76 px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {labels.apiDocs}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-8 max-w-6xl space-y-5 text-base leading-8 text-muted-foreground md:mt-10 md:space-y-7 md:text-lg">
              {description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <span className="text-base font-semibold text-foreground">
                {labels.modelType}
              </span>
              {versions.map((version) => {
                const selected = version.key === selectedVersion.key;

                return (
                  <button
                    key={version.key}
                    type="button"
                    onClick={() => setSelectedVersionKey(version.key)}
                    className={cn(
                      "inline-flex h-12 cursor-pointer items-center justify-center rounded-[0.9rem] border px-5 text-base font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_16px_30px_-22px_rgba(37,99,235,0.8)]"
                        : "border-border bg-background/78 text-foreground hover:bg-background",
                    )}
                  >
                    {version.label}
                    {selected ? (
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.4rem] border border-border bg-background/66 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-base font-semibold text-foreground">
                      {labels.pricingTitle}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {labels.lowestCostPrefix}{" "}
                      <span className="font-semibold text-foreground">
                        {selectedVersion.lowest}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="rounded-[0.65rem] border border-orange-500/20 bg-orange-500/8 px-3 py-1 text-xs font-semibold text-orange-600">
                  {labels.selectedModel}
                </span>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {selectedVersion.label}
                </div>
                <div className="space-y-1 text-sm leading-6 text-muted-foreground">
                  {selectedVersion.pricingRows.map((row) => (
                    <p key={row}>{row}</p>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {pricingNote}
              </p>
            </div>

            {false ? (
              <div className="mt-8">
                <StatusMonitor
                  title={monitor.label}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="playground" className="scroll-mt-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px] bg-background text-foreground [font-family:var(--font-sans),sans-serif] [&>main]:max-w-none [&>main]:px-0 [&>main>div]:max-w-none [&>main>div>div]:my-0">
          <AIVideoStudio
            key={selectedVersion.modelId}
            initialModelId={selectedVersion.modelId}
          />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px] space-y-8">
          <SectionHeader
            kicker={labels.apiInputKicker}
            title={labels.apiInputTitle}
            description={labels.apiInputDescription}
          />

          <div className="space-y-5">
            <CodePanel
              requestExample={selectedVersion.requestExample}
              title={labels.requestJson}
            />
            <div className={cn(moduleCardClass, "rounded-[1.75rem] p-6")}>
              <div className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] bg-orange-500/12 text-orange-500">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {labels.useModelForGeneration.replace(
                      "{model}",
                      selectedVersion.label,
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {labels.selectedModelNote}
                  </p>
                  <Link
                    href={docsHref}
                    className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[0.8rem] border border-border bg-background/80 px-4 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {labels.apiDocsDetail}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {labels.apiDocsDetailDescription}{" "}
                    <span className="font-mono text-foreground">
                      {docsHref}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card/80">
              <div className="hidden grid-cols-[minmax(10rem,0.9fr)_minmax(7rem,0.45fr)_minmax(0,2.2fr)] gap-4 border-b border-border bg-muted/55 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid">
                <span>{labels.fieldColumn}</span>
                <span>{labels.typeColumn}</span>
                <span>{labels.descriptionColumn}</span>
              </div>
              {selectedVersion.parameters.map(([name, type, fieldDescription]) => (
                <div
                  key={name}
                  className="grid grid-cols-1 gap-2 border-b border-border/70 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(10rem,0.9fr)_minmax(7rem,0.45fr)_minmax(0,2.2fr)] md:gap-4"
                >
                  <code className="break-words text-sm font-semibold text-foreground">
                    {name}
                  </code>
                  <span className="text-sm text-muted-foreground">{type}</span>
                  <span className="text-sm leading-6 text-muted-foreground">
                    {fieldDescription}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
