import AIVideoStudio from "@/components/ai/AIVideoStudio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cardHeadingClass,
  moduleCardClass,
  pageShellClass,
  sectionKickerClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { Link } from "@/i18n/routing";
import { Locale } from "@/i18n/routing";
import { getShowcaseGenerationById } from "@/lib/ai-studio/showcase";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarDays, ExternalLink, Sparkles } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;

type MetadataProps = {
  params: Params;
};

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Showcase" });
  const record = await getShowcaseGenerationById(id);

  return constructMetadata({
    title: record?.title ?? t("list.title"),
    description: record?.prompt ?? t("list.description"),
    locale: locale as Locale,
    path: `/showcase/${id}`,
  });
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Showcase" });
  const record = await getShowcaseGenerationById(id);

  if (!record) {
    notFound();
  }

  const referenceImages = record.uploadedImages ?? [];
  const referenceVideos = record.inputVideos ?? [];
  const previewUrl =
    record.resultUrls[0] ?? referenceImages[0] ?? record.uploadedImage ?? null;
  const modeLabel =
    record.category === "image"
      ? t("detail.imageGeneration")
      : record.mode === "image-to-video"
        ? t("detail.imageToVideo")
        : t("detail.textToVideo");

  return (
    <div className={pageShellClass}>
      <section className="container mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
        <div className="mb-8">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/showcase">
              <ArrowLeft className="h-4 w-4" />
              {t("detail.back")}
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className={cn(moduleCardClass, "cursor-default rounded-[1.5rem] p-2.5 sm:rounded-[2rem] sm:p-4")}>
              <div className="overflow-hidden rounded-[1.5rem] bg-slate-950">
                {previewUrl ? (
                  record.category === "video" ? (
                    <video
                      src={previewUrl}
                      className="aspect-video w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <div className="flex items-center justify-center p-2 sm:p-4">
                      <img
                        src={previewUrl}
                        alt={record.title}
                        className="max-h-[75vh] w-full object-contain"
                      />
                    </div>
                  )
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-white/60">
                    {record.title}
                  </div>
                )}
              </div>

              {record.resultUrls.length > 1 ? (
                <div className="mt-4 grid gap-2 sm:gap-3 sm:grid-cols-2">
                  {record.resultUrls.slice(1).map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card"
                    >
                      {record.category === "video" ? (
                        <video
                          src={url}
                          className="aspect-video w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex min-h-56 items-center justify-center bg-slate-950 p-2">
                          <img
                            src={url}
                            alt={`${record.title}-${index + 2}`}
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {record.prompt ? (
              <div className={cn(moduleCardClass, "cursor-default rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6")}>
                <h2 className={cn(subsectionTitleClass, "text-[1.55rem]")}>
                  {t("detail.prompt")}
                </h2>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                  {record.prompt}
                </p>
              </div>
            ) : null}

            <div className={cn(moduleCardClass, "cursor-default rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6")}>
              <h2 className={cn(subsectionTitleClass, "text-[1.55rem]")}>
                {t("detail.result")}
              </h2>
              <div className="mt-4 space-y-3">
                {record.resultUrls.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-start justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-background/70 px-4 py-3 text-sm transition hover:border-foreground/20"
                  >
                    <span className="min-w-0 break-all text-left">{url}</span>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={cn(moduleCardClass, "cursor-default rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6")}>
              <div className={cn(sectionKickerClass, "mb-5")}>
                <Sparkles className="h-4 w-4" />
                {record.category}
              </div>
              <h1 className={cn(cardHeadingClass, "text-[2rem] sm:text-[2.35rem]")}>
                {record.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{record.provider}</Badge>
                <Badge variant="outline">{record.catalogModelId}</Badge>
                {modeLabel ? <Badge variant="outline">{modeLabel}</Badge> : null}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {formatDateTime(record.createdAt, locale)}
              </div>
            </div>

            <div className={cn(moduleCardClass, "cursor-default rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6")}>
              <h2 className={cn(subsectionTitleClass, "text-[1.55rem]")}>
                {t("detail.settings")}
              </h2>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <div className="text-muted-foreground">{t("detail.provider")}</div>
                  <div className="mt-1 font-medium">{record.provider}</div>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <div className="text-muted-foreground">{t("detail.model")}</div>
                  <div className="mt-1 break-all font-medium">{record.catalogModelId}</div>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <div className="text-muted-foreground">{t("detail.createdAt")}</div>
                  <div className="mt-1 font-medium">
                    {formatDateTime(record.createdAt, locale)}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <div className="text-muted-foreground">{t("detail.credits")}</div>
                  <div className="mt-1 font-medium">{record.creditsRequired ?? record.creditsUsed}</div>
                </div>
                {modeLabel ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                    <div className="text-muted-foreground">{t("detail.mode")}</div>
                    <div className="mt-1 font-medium">{modeLabel}</div>
                  </div>
                ) : null}
                {record.providerValues?.aspectRatio ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                    <div className="text-muted-foreground">{t("detail.aspectRatio")}</div>
                    <div className="mt-1 font-medium">{record.providerValues.aspectRatio}</div>
                  </div>
                ) : null}
                {record.providerValues?.resolution ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                    <div className="text-muted-foreground">{t("detail.resolution")}</div>
                    <div className="mt-1 font-medium">{record.providerValues.resolution}</div>
                  </div>
                ) : null}
                {record.providerValues?.duration ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                    <div className="text-muted-foreground">{t("detail.duration")}</div>
                    <div className="mt-1 font-medium">{record.providerValues.duration}</div>
                  </div>
                ) : null}
              </div>

              {referenceImages.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-3 text-sm text-muted-foreground">
                    {t("detail.referenceImages")}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {referenceImages.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`${t("detail.referenceImages")} ${index + 1}`}
                        className="h-40 w-full rounded-[1.2rem] border border-border/70 bg-slate-950/5 object-contain p-2 sm:h-48"
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {referenceVideos.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-3 text-sm text-muted-foreground">
                    {t("detail.referenceVideos")}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {referenceVideos.map((url, index) => (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-card"
                      >
                        <video
                          src={url}
                          className="aspect-video w-full object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-14">
          <div className="mb-6 max-w-2xl">
            <h2 className={cn(subsectionTitleClass, "text-[1.8rem]")}>
              {t("detail.continueTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {t("detail.continueDescription")}
            </p>
          </div>
          <AIVideoStudio initialModelId={record.catalogModelId} />
        </div>
      </section>
    </div>
  );
}
