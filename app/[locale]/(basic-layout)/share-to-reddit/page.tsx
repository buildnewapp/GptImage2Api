import { Button } from "@/components/ui/button";
import {
  cardHeadingClass,
  displayTitleClass,
  pageShellClass,
  sectionKickerClass,
  sectionTitleClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { BASE_URL, siteConfig } from "@/config/site";
import { manualReviewTasks } from "@/config/task-rewards";
import { Link, type Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  Globe2,
  ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Trophy,
  Vote,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiReddit } from "react-icons/si";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

const rewardCards = [
  {
    key: "website",
    credits: manualReviewTasks.share_reddit_website.credits,
    icon: Globe2,
    accentClass: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  {
    key: "work",
    credits: manualReviewTasks.share_reddit_work.credits,
    icon: ImageIcon,
    accentClass: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  {
    key: "popular",
    credits: manualReviewTasks.reddit_post_popular.credits,
    icon: Trophy,
    accentClass: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  },
] as const;

const steps = [
  { key: "choose", icon: MousePointerClick },
  { key: "publish", icon: SiReddit },
  { key: "capture", icon: Camera },
  { key: "submit", icon: FileCheck2 },
] as const;

const thresholdStats = [
  { key: "views", value: "1,000+", icon: Eye },
  { key: "comments", value: "20+", icon: MessageCircle },
  { key: "upvotes", value: "10+", icon: Vote },
] as const;

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShareToReddit" });

  return constructMetadata({
    title: t("seo.title"),
    description: t("seo.description", { siteName: siteConfig.name }),
    locale: locale as Locale,
    path: "/share-to-reddit",
  });
}

export default async function ShareToRedditPage({
  params,
}: {
  params: Params;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShareToReddit" });
  const siteMessageValues = {
    siteName: siteConfig.name,
    siteUrl: BASE_URL,
  };
  const formatRawSiteCopy = (text: string) =>
    text
      .replaceAll("{siteName}", siteMessageValues.siteName)
      .replaceAll("{siteUrl}", siteMessageValues.siteUrl);
  const totalCredits = rewardCards.reduce(
    (total, reward) => total + reward.credits,
    0,
  );
  const participationEmail = siteConfig.socialLinks?.email?.trim();
  const emailParticipationUrl = participationEmail
    ? `mailto:${participationEmail}?subject=${encodeURIComponent(
        t("hero.emailSubject", siteMessageValues),
      )}&body=${encodeURIComponent(t("hero.emailBody"))}`
    : null;
  const reviewItems = (t.raw("review.items") as string[]).map(
    formatRawSiteCopy,
  );
  const rejectedItems = t.raw("review.rejectedItems") as string[];
  const faqItems = t.raw("faq.items") as Array<{
    question: string;
    answer: string;
  }>;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className={cn(pageShellClass, "overflow-hidden")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="relative border-b border-border/70 px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="absolute -right-32 top-12 size-80 rounded-full bg-orange-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -left-40 bottom-0 size-96 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <div
              className={cn(
                sectionKickerClass,
                "mb-6 normal-case tracking-[0.12em]",
              )}
            >
              <SiReddit className="size-4 text-[#ff4500]" />
              {t("hero.eyebrow", siteMessageValues)}
            </div>
            <h1 className={cn(displayTitleClass, "max-w-4xl")}>
              {t("hero.title", { credits: totalCredits })}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {t("hero.description", siteMessageValues)}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[#c93600] px-7 text-base text-white shadow-[0_16px_36px_-18px_rgba(201,54,0,0.65)] hover:bg-[#aa2e00]"
              >
                <Link href="/dashboard/tasks">
                  {t("hero.primaryCta")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-border/90 bg-card/70 px-7 text-base backdrop-blur-sm"
              >
                <Link href="/dashboard/videos">
                  {t("hero.secondaryCta")}
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
              {emailParticipationUrl && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-border/90 bg-card/70 px-7 text-base backdrop-blur-sm"
                >
                  <a href={emailParticipationUrl}>
                    {t("hero.emailCta")}
                    <Mail className="size-4" />
                  </a>
                </Button>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {(["manual", "once", "organic"] as const).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  {t(`hero.chips.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-[0_34px_90px_-42px_rgba(15,23,42,0.85)] sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#ff4500]">
                    <SiReddit className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {t("hero.mock.community")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("hero.mock.author")}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {t("hero.mock.approved")}
                </span>
              </div>

              <div className="py-5">
                <p className="text-lg font-semibold leading-7 sm:text-xl">
                  {t("hero.mock.title", siteMessageValues)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {t("hero.mock.body")}
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs text-slate-300">
                  <Link2 className="size-4 text-sky-300" />
                  {t("hero.mock.link", siteMessageValues)}
                </div>
              </div>

              <div className="rounded-2xl border border-orange-300/20 bg-orange-400/[0.08] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-200">
                    {t("hero.mock.metricLabel")}
                  </p>
                  <BarChart3 className="size-4 text-orange-300" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thresholdStats.map(({ key, value, icon: Icon }) => (
                    <div
                      key={key}
                      className="rounded-xl bg-white/[0.06] px-2 py-3 text-center"
                    >
                      <Icon className="mx-auto size-4 text-slate-300" />
                      <p className="mt-2 text-base font-bold sm:text-lg">
                        {value}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] text-slate-400 sm:text-xs">
                        {t(`threshold.stats.${key}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-orange-300/25 bg-gradient-to-r from-orange-500/15 to-amber-400/10 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-orange-300">
                    <CircleDollarSign className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-slate-200">
                    {t("hero.maxLabel")}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-white">
                  {t("common.credits", { credits: totalCredits })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className={cn(sectionKickerClass, "mb-5")}>
              <Sparkles className="size-4" />
              {t("rewards.eyebrow")}
            </div>
            <h2 className={sectionTitleClass}>{t("rewards.title")}</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("rewards.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {rewardCards.map(({ key, credits, icon: Icon, accentClass }) => {
              const requirements = (
                t.raw(`rewards.items.${key}.requirements`) as string[]
              ).map(formatRawSiteCopy);

              return (
                <article
                  key={key}
                  className="rounded-[1.75rem] border border-border/75 bg-card/85 p-6 shadow-[0_24px_64px_-48px_rgba(15,23,42,0.5)] backdrop-blur-sm sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-2xl",
                        accentClass,
                      )}
                    >
                      <Icon className="size-6" />
                    </span>
                    <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-sm font-bold text-orange-700 dark:text-orange-300">
                      +{t("common.credits", { credits })}
                    </span>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {t(`rewards.items.${key}.label`)}
                  </p>
                  <h3 className={cn(cardHeadingClass, "mt-2")}>
                    {t(`rewards.items.${key}.title`, siteMessageValues)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t(`rewards.items.${key}.description`, siteMessageValues)}
                  </p>
                  <ul className="mt-5 space-y-3 border-t border-border/70 pt-5">
                    {requirements.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6">
                        <Check className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.07] p-4 text-sm leading-6 text-sky-950 dark:text-sky-100 sm:items-center">
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400 sm:mt-0" />
            <p>{t("rewards.note")}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/45 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className={cn(sectionKickerClass, "mb-5")}>
              <MousePointerClick className="size-4" />
              {t("steps.eyebrow")}
            </div>
            <h2 className={sectionTitleClass}>{t("steps.title")}</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("steps.description")}
            </p>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ key, icon: Icon }, index) => (
              <li
                key={key}
                className="relative rounded-[1.5rem] border border-border/75 bg-background/80 p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-[0.16em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold">
                  {t(`steps.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t(`steps.items.${key}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_38px_90px_-52px_rgba(15,23,42,0.9)] sm:p-10 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-200">
                <Trophy className="size-4" />
                {t("threshold.eyebrow")}
              </div>
              <h2 className={cn(subsectionTitleClass, "mt-5 text-white")}>
                {t("threshold.title")}
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                {t("threshold.description")}
              </p>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                {thresholdStats.map(({ key, value, icon: Icon }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                  >
                    <Icon className="size-6 text-orange-300" />
                    <p className="mt-6 text-3xl font-bold tracking-tight">
                      {value}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {t(`threshold.stats.${key}`)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4 text-sm leading-6 text-emerald-100">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                <p>{t("threshold.note")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/45 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className={cn(sectionKickerClass, "mb-5")}>
              <Camera className="size-4" />
              {t("proof.eyebrow")}
            </div>
            <h2 className={sectionTitleClass}>{t("proof.title")}</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("proof.description")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {(["base", "popular"] as const).map((key) => {
              const items = (t.raw(`proof.cards.${key}.items`) as string[]).map(
                formatRawSiteCopy,
              );
              const Icon = key === "base" ? Link2 : BarChart3;

              return (
                <article
                  key={key}
                  className="rounded-[1.75rem] border border-border/75 bg-background/85 p-6 sm:p-8"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-6" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {t(`proof.cards.${key}.label`)}
                      </p>
                      <h3 className="mt-1 text-xl font-bold">
                        {t(`proof.cards.${key}.title`)}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">
                    {t(`proof.cards.${key}.description`, siteMessageValues)}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-6"
                      >
                        <Check className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {(["link", "screenshot", "context"] as const).map((key) => {
              const icons = {
                link: Link2,
                screenshot: Camera,
                context: FileCheck2,
              };
              const Icon = icons[key];
              return (
                <div
                  key={key}
                  className="flex gap-4 rounded-2xl border border-border/70 bg-card/70 p-5"
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {t(`proof.tips.${key}.title`)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {t(`proof.tips.${key}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
          <div>
            <div className={cn(sectionKickerClass, "mb-5")}>
              <ShieldCheck className="size-4" />
              {t("review.eyebrow")}
            </div>
            <h2 className={sectionTitleClass}>{t("review.title")}</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("review.description")}
            </p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-5">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{t("review.timeline.title")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("review.timeline.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/[0.06] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" />
                </span>
                <h3 className="text-xl font-bold">
                  {t("review.approvedTitle")}
                </h3>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {reviewItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <Check className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/[0.05] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-700 dark:text-red-300">
                  <ShieldCheck className="size-5" />
                </span>
                <h3 className="text-xl font-bold">
                  {t("review.rejectedTitle")}
                </h3>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {rejectedItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-red-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-slate-950 px-4 py-16 text-white sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-8 md:grid-cols-[auto_1fr] md:gap-6">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
            <SiReddit className="size-7" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-orange-300">
              {t("community.eyebrow")}
            </p>
            <h2 className={cn(subsectionTitleClass, "mt-3 text-white")}>
              {t("community.title")}
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
              {t("community.description", siteMessageValues)}
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-6 text-slate-200 sm:grid-cols-3">
              {(["relevant", "transparent", "respectful"] as const).map(
                (key) => (
                  <li key={key} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                    <span>
                      {t(`community.items.${key}`, siteMessageValues)}
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-slate-400">
              {t("community.disclaimer", siteMessageValues)}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className={cn(sectionKickerClass, "mb-5")}>
              <MessageCircle className="size-4" />
              {t("faq.eyebrow")}
            </div>
            <h2 className={sectionTitleClass}>{t("faq.title")}</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("faq.description")}
            </p>
          </div>

          <div className="mt-10 divide-y divide-border/70 overflow-hidden rounded-[1.75rem] border border-border/75 bg-card/80">
            {faqItems.map((item, index) => (
              <details key={item.question} className="group px-5 py-1 sm:px-7">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs font-bold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item.question}</span>
                  </span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-lg font-normal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 pl-8 pr-10 text-sm leading-7 text-muted-foreground sm:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-slate-950 px-6 py-12 text-center text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.8)] sm:px-10 sm:py-16">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10">
            <SiReddit className="size-7 text-orange-300" />
          </span>
          <h2
            className={cn(
              sectionTitleClass,
              "mx-auto mt-6 max-w-4xl text-white",
            )}
          >
            {t("final.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            {t("final.description")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-[#c93600] px-7 text-base text-white hover:bg-[#aa2e00]"
            >
              <Link href="/dashboard/tasks">
                {t("final.primaryCta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-white/[0.06] px-7 text-base text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/videos">{t("final.secondaryCta")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
