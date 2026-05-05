import { PricingByGroup } from "@/components/pricing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link as I18nLink } from "@/i18n/routing";
import {
  ArrowRight,
  Check,
  CirclePause,
  CirclePlay,
  CreditCard,
  Download,
  FolderTree,
  Globe,
  Languages,
  ListTodo,
  Mail,
  Package,
  Sparkles,
  TerminalSquare,
  Upload,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type HeroStat = {
  label: string;
  value: string;
  description: string;
};

type PreviewActionKey =
  | "upload"
  | "projectSettings"
  | "modelSettings"
  | "taskCenter"
  | "startTranslation"
  | "downloadProject";

type PreviewAction = {
  key: PreviewActionKey;
  label: string;
  primary?: boolean;
};

type PreviewTab = {
  locale: string;
  active: boolean;
};

type PreviewPane = {
  eyebrow: string;
  title: string;
  badge: string;
  tags: string[];
  code: string;
};

type HeroContent = {
  badge: string;
  eyebrow: string;
  title: {
    line1: string;
    line2: string;
  };
  description: string;
  primaryCta: string;
  secondaryCta: string;
  stats: HeroStat[];
  preview: {
    eyebrow: string;
    title: string;
    modeBadge: string;
    studioLabel: string;
    studioTitle: string;
    chips: string[];
    actions: PreviewAction[];
    browser: {
      eyebrow: string;
      title: string;
      projectBadge: string;
      tree: string[];
      activeTreeItem: string;
    };
    source: PreviewPane;
    target: PreviewPane & {
      tabs: PreviewTab[];
    };
    summary: string[];
  };
};

type CapabilityCardKey =
  | "workflow"
  | "folderTree"
  | "languages"
  | "upload"
  | "taskCenter"
  | "terminal";

type CapabilityCardContent = {
  key: CapabilityCardKey;
  title: string;
  description: string;
  bullets: string[];
};

type CapabilitiesContent = {
  eyebrow: string;
  title: string;
  description: string;
  cards: CapabilityCardContent[];
};

type PathPattern = {
  title: string;
  path: string;
};

type MappingContent = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  pathPatternsEyebrow: string;
  pathPatterns: PathPattern[];
  zip: {
    title: string;
    description: string;
  };
};

type LanguageModelCardKey = "languages" | "official" | "byok";

type LanguageModelCard = {
  key: LanguageModelCardKey;
  title: string;
  description: string;
};

type LanguageModelContent = {
  badge: string;
  title: string;
  description: string;
  cards: LanguageModelCard[];
};

type WorkspaceColumn = {
  title: string;
  description: string;
  points: string[];
};

type TaskStatusKey = "running" | "queued" | "paused" | "failed";

type TaskStatus = {
  key: TaskStatusKey;
  label: string;
  detail: string;
};

type WorkspaceContent = {
  eyebrow: string;
  title: string;
  description: string;
  columns: WorkspaceColumn[];
  taskCenter: {
    eyebrow: string;
    title: string;
    statuses: TaskStatus[];
    pauseAction: string;
    resumeAction: string;
  };
};

type CliStep = {
  step: string;
  title: string;
  description: string;
};

type CliContent = {
  eyebrow: string;
  title: string;
  description: string;
  commands: string[];
  steps: CliStep[];
};

type PricingContent = {
  eyebrow: string;
  title: string;
  description: string;
};

type AudienceContent = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

type FaqContent = {
  eyebrow: string;
  title: string;
  description: string;
  items: FaqItem[];
};

type ContactContent = {
  badge: string;
  title: string;
  description: string;
  websiteLabel: string;
  websiteUrl: string;
  supportLabel: string;
  supportEmail: string;
  primaryCta: string;
  secondaryCta: string;
};

const capabilityIcons: Record<CapabilityCardKey, LucideIcon> = {
  workflow: Workflow,
  folderTree: FolderTree,
  languages: Languages,
  upload: Upload,
  taskCenter: ListTodo,
  terminal: TerminalSquare,
};

const previewActionIcons: Record<PreviewActionKey, LucideIcon> = {
  upload: Upload,
  projectSettings: FolderTree,
  modelSettings: CreditCard,
  taskCenter: ListTodo,
  startTranslation: Languages,
  downloadProject: Download,
};

const languageModelIcons: Record<LanguageModelCardKey, LucideIcon> = {
  languages: Languages,
  official: Sparkles,
  byok: CreditCard,
};

const taskStatusAccents: Record<TaskStatusKey, string> = {
  running: "bg-emerald-500",
  queued: "bg-amber-500",
  paused: "bg-slate-400",
  failed: "bg-rose-500",
};

const cliPackageUrl = "https://www.npmjs.com/package/jsontranslate-cli";

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700 shadow-sm backdrop-blur dark:border-amber-300/20 dark:bg-slate-950/70 dark:text-amber-200">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2 className="mt-5 font-serif text-3xl leading-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export default async function ToolHomeComponent() {
  const t = await getTranslations("ToolHome");

  const hero = t.raw("hero") as HeroContent;
  const capabilities = t.raw("capabilities") as CapabilitiesContent;
  const mapping = t.raw("mapping") as MappingContent;
  const languageModel = t.raw("languageModel") as LanguageModelContent;
  const workspace = t.raw("workspace") as WorkspaceContent;
  const cli = t.raw("cli") as CliContent;
  const pricing = t.raw("pricing") as PricingContent;
  const faq = t.raw("faq") as FaqContent;
  const audience = t.raw("audience") as AudienceContent;
  const contact = t.raw("contact") as ContactContent;

  return (
    <div className="w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_24%),radial-gradient(circle_at_88%_12%,_rgba(15,23,42,0.12),_transparent_30%),linear-gradient(180deg,_#fffaf1_0%,_#f8f4eb_22%,_#ffffff_56%,_#f3efe6_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_24%),radial-gradient(circle_at_88%_12%,_rgba(56,189,248,0.1),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_24%,_#111827_58%,_#020617_100%)]">
      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),transparent)] dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.08),transparent)]" />

        <div className="space-y-12">
          <div className="mx-auto flex max-w-5xl flex-col items-center space-y-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/85 px-4 py-2  font-medium text-amber-800 shadow-[0_12px_40px_rgba(120,53,15,0.08)] backdrop-blur dark:border-amber-300/20 dark:bg-slate-950/75 dark:text-amber-200 dark:shadow-[0_18px_50px_rgba(2,6,23,0.4)]">
              <Sparkles className="h-4 w-4 md:h-4 md:w-4" />
              {hero.badge}
            </div>

            <div className="space-y-4 sm:space-y-5">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400 sm:text-sm sm:tracking-[0.38em]">
                {hero.eyebrow}
              </p>
              <h1 className="font-serif text-2xl leading-[1.08] text-slate-950 dark:text-slate-50 sm:text-6xl lg:text-7xl">
                {hero.title.line1}
                <br />
                {hero.title.line2}
              </h1>
              <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-xl sm:leading-8">
                {hero.description}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <I18nLink
                href="/dashboard/generate"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(15,23,42,0.24)] transition hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:shadow-[0_22px_60px_rgba(251,191,36,0.18)] dark:hover:bg-amber-300"
              >
                {hero.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </I18nLink>
              <I18nLink
                href="/#pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/25 dark:hover:bg-white/10"
              >
                {hero.secondaryCta}
              </I18nLink>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3">
              {hero.stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/70 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_24px_80px_rgba(2,6,23,0.32)] sm:rounded-[28px] sm:p-5"
                >
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">
                    {item.value}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-6xl">
            <div className="absolute -left-8 top-10 hidden h-40 w-40 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-400/20 lg:block" />
            <div className="absolute -right-10 bottom-8 hidden h-44 w-44 rounded-full bg-slate-300/30 blur-3xl dark:bg-cyan-400/10 lg:block" />

            <div className="relative rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,251,245,0.82))] p-3 shadow-[0_36px_120px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.92))] dark:shadow-[0_40px_120px_rgba(2,6,23,0.5)] sm:rounded-[36px] sm:p-5">
              <div className="rounded-[24px] border border-[#e8dfd0] bg-[#f9f5ee] p-2.5 shadow-inner dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[28px] sm:p-4">
                <div className="mb-4 flex flex-col items-start gap-3 border-b border-[#e4dac9] px-2 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">
                      {hero.preview.eyebrow}
                    </p>
                    <h3 className="mt-2 font-serif text-xl text-slate-950 dark:text-slate-50 sm:text-2xl">
                      {hero.preview.title}
                    </h3>
                  </div>
                  <div className="rounded-full border border-[#deceb4] bg-white px-4 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
                    {hero.preview.modeBadge}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#e1d6c4] bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_12px_40px_rgba(2,6,23,0.3)] sm:rounded-[26px] sm:p-4">
                  <div className="rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_24px_60px_rgba(2,6,23,0.4)] sm:rounded-[22px] sm:p-3">
                    <div className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
                          {hero.preview.studioLabel}
                        </div>
                        <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                          {hero.preview.studioTitle}
                        </h4>
                        <div className="hidden md:flex mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {hero.preview.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/[0.08] dark:text-slate-200"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {hero.preview.actions.map((action) => {
                          const Icon = previewActionIcons[action.key];
                          const actionClass = action.primary
                            ? "inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm dark:bg-emerald-400 dark:text-slate-950"
                            : "inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";

                          return (
                            <div key={action.key} className={actionClass}>
                              <Icon className="h-3.5 w-3.5" />
                              {action.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid min-h-0 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
                      <aside className="order-3 flex min-h-0 flex-col rounded-[18px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70 sm:rounded-[20px] lg:order-none">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
                              {hero.preview.browser.eyebrow}
                            </div>
                            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {hero.preview.browser.title}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                            {hero.preview.browser.projectBadge}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-slate-950">
                          {hero.preview.browser.tree.map((item) => (
                            <div
                              key={item}
                              className={
                                item === hero.preview.browser.activeTreeItem
                                  ? "rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                  : "rounded-lg px-2.5 py-2 text-xs text-slate-600 dark:text-slate-300"
                              }
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </aside>

                      <div className="order-1 flex min-h-0 flex-col rounded-[18px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70 sm:rounded-[20px] lg:order-none">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
                              {hero.preview.source.eyebrow}
                            </div>
                            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {hero.preview.source.title}
                            </div>
                          </div>
                          <div className="hidden md:block rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
                            {hero.preview.source.badge}
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {hero.preview.source.tags.map((tag) => (
                            <div
                              key={tag}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {tag}
                            </div>
                          ))}
                        </div>

                        <pre className="min-h-[180px] overflow-auto whitespace-pre-wrap rounded-[18px] bg-[#161616] p-4 font-mono text-xs leading-6 text-amber-50 shadow-inner sm:min-h-[240px] xl:min-h-[280px] dark:bg-[#0b1120] dark:text-amber-100">
                          <code>{hero.preview.source.code}</code>
                        </pre>
                      </div>

                      <div className="order-2 flex min-h-0 flex-col rounded-[18px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70 sm:rounded-[20px] lg:order-none">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
                              {hero.preview.target.eyebrow}
                            </div>
                            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {hero.preview.target.title}
                            </div>
                          </div>
                          <div className="hidden md:block rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
                            {hero.preview.target.badge}
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {hero.preview.target.tabs.map((tab) => (
                            <div
                              key={tab.locale}
                              className={
                                tab.active
                                  ? "rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white dark:bg-emerald-400 dark:text-slate-950"
                                  : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                              }
                            >
                              {tab.locale}
                            </div>
                          ))}
                        </div>

                        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white dark:bg-white/10">
                          <div className="h-full w-[82%] rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        </div>

                        <pre className="min-h-[180px] overflow-auto whitespace-pre-wrap rounded-[18px] bg-[#102016] p-4 font-mono text-xs leading-6 text-emerald-100 shadow-inner sm:min-h-[240px] xl:min-h-[280px] dark:bg-[#07130d] dark:text-emerald-200">
                          <code>{hero.preview.target.code}</code>
                        </pre>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {hero.preview.target.tags.map((tag) => (
                            <div
                              key={tag}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {tag}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-[24px] border border-[#e4dacb] bg-white/75 p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-3 sm:rounded-[28px] sm:p-4">
                  {hero.preview.summary.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-2xl bg-[#fbf8f2] px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeader
          eyebrow={capabilities.eyebrow}
          title={capabilities.title}
          description={capabilities.description}
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.cards.map((card) => {
            const Icon = capabilityIcons[card.key];

            return (
              <div
                key={card.key}
                className="rounded-[30px] border border-white/80 bg-white/78 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_24px_80px_rgba(2,6,23,0.32)] dark:hover:bg-slate-950/75"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f2937,#475569)] text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {card.description}
                </p>
                <div className="mt-5 space-y-3">
                  {card.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-2xl bg-[#fbf8f2] px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[34px] border border-[#eadfcf] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f1e7_100%)] p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,6,23,0.92)_100%)] dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-8">
            <SectionHeader
              eyebrow={mapping.eyebrow}
              title={mapping.title}
              description={mapping.description}
            />

            <div className="mt-8 space-y-4">
              {mapping.bullets.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[24px] border border-[#e4dacb] bg-white px-5 py-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_20px_60px_rgba(2,6,23,0.32)]">
              <div className="flex items-center gap-3">
                <FolderTree className="h-5 w-5 text-amber-700 dark:text-amber-200" />
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  {mapping.pathPatternsEyebrow}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {mapping.pathPatterns.map((pattern) => (
                  <div
                    key={pattern.title}
                    className="rounded-[22px] break-all bg-[#161616] px-4 py-4 font-mono text-xs leading-6 text-amber-50 dark:bg-[#0b1120] dark:text-amber-100"
                  >
                    <div className="mb-2 font-sans text-sm font-semibold text-white">
                      {pattern.title}
                    </div>
                    {pattern.path}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_20px_60px_rgba(2,6,23,0.32)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <Download className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-50">
                {mapping.zip.title}
              </h4>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {mapping.zip.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] dark:border-white/10 dark:shadow-[0_32px_100px_rgba(2,6,23,0.45)] sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {languageModel.badge}
            </div>
            <h2 className="mt-5 font-serif text-3xl leading-tight text-white sm:text-4xl">
              {languageModel.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
              {languageModel.description}
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {languageModel.cards.map((card) => {
              const Icon = languageModelIcons[card.key];

              return (
                <div
                  key={card.key}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur dark:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-amber-200" />
                    <h4 className="text-lg font-semibold">{card.title}</h4>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="cli"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
      >
        <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="rounded-[34px] border border-white/80 bg-white/78 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-8">
            <SectionHeader
              eyebrow={workspace.eyebrow}
              title={workspace.title}
              description={workspace.description}
            />

            <div className="mt-8 grid gap-4">
              {workspace.columns.map((column) => (
                <div
                  key={column.title}
                  className="rounded-[28px] border border-[#e9dcc8] bg-[#fffdf8] p-5 dark:border-white/10 dark:bg-slate-900/70"
                >
                  <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                    {column.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {column.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {column.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-full border border-[#eadfcf] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#eadfcf] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f1e7_100%)] p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,6,23,0.92)_100%)] dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  {workspace.taskCenter.eyebrow}
                </p>
                <h3 className="mt-1 font-serif text-2xl text-slate-950 dark:text-slate-50">
                  {workspace.taskCenter.title}
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {workspace.taskCenter.statuses.map((status) => (
                <div
                  key={status.key}
                  className="rounded-[24px] border border-[#e4dacb] bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950/70"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${taskStatusAccents[status.key]}`}
                    />
                    <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {status.label}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {status.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-4 text-sm font-medium text-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                <CirclePause className="h-4 w-4 text-amber-600" />
                {workspace.taskCenter.pauseAction}
              </div>
              <div className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-4 text-sm font-medium text-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                <CirclePlay className="h-4 w-4 text-emerald-600" />
                {workspace.taskCenter.resumeAction}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[34px] border border-white/80 bg-white/78 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-8">
            <SectionHeader
              eyebrow={cli.eyebrow}
              title={cli.title}
              description={cli.description}
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {cli.commands.map((command) => (
                <div
                  key={command}
                  className="overflow-x-auto rounded-[22px] bg-[#161616] px-4 py-3 font-mono text-sm text-emerald-100 shadow-inner"
                >
                  $ {command}
                </div>
              ))}
            </div>

            <Link
              href={cliPackageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex flex-col items-start gap-4 rounded-[24px] border border-slate-200 bg-[#fff8ed] px-5 py-4 transition hover:border-amber-300 hover:bg-[#fff3dd] dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-amber-300/30 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    npm package
                  </div>
                  <div className="mt-1 break-all font-mono text-sm text-slate-950 dark:text-slate-50">
                    {cliPackageUrl}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cli.steps.map((item) => (
              <div
                key={item.step}
                className="rounded-[30px] border border-[#eadfcf] bg-[linear-gradient(180deg,#fffdf9_0%,#f6efe2_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,6,23,0.92)_100%)] dark:shadow-[0_20px_60px_rgba(2,6,23,0.32)]"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700/80 dark:text-amber-200/80">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-50">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeader
          eyebrow={pricing.eyebrow}
          title={pricing.title}
          description={pricing.description}
        />
      </section>

      <PricingByGroup />

      <section
        id="faq"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeader
          eyebrow={faq.eyebrow}
          title={faq.title}
          description={faq.description}
        />

        <div className="mx-auto mt-10 max-w-5xl rounded-[34px] border border-[#eadfcf] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f1e7_100%)] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,6,23,0.92)_100%)] dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-4">
          <Accordion
            type="single"
            collapsible
            className="rounded-[28px] border border-white/80 bg-white/82 px-6 py-2 backdrop-blur dark:border-white/10 dark:bg-slate-950/60"
          >
            {faq.items.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="border-[#e7dbc9] dark:border-white/10"
              >
                <AccordionTrigger className="py-5 text-left text-base font-semibold leading-7 text-slate-950 hover:no-underline dark:text-slate-50">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="rounded-[34px] border border-white/80 bg-white/80 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:p-8">
            <SectionHeader
              eyebrow={audience.eyebrow}
              title={audience.title}
              description={audience.description}
            />

            <div className="mt-8 space-y-4">
              {audience.items.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[24px] border border-[#e4dacb] bg-[#fffdf8] px-5 py-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  <Package className="mt-1 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#e6d8bf] bg-[linear-gradient(135deg,#171717_0%,#202020_42%,#6b4f1d_100%)] px-5 py-8 text-white shadow-[0_36px_120px_rgba(15,23,42,0.26)] sm:rounded-[40px] sm:px-10 sm:py-10 lg:px-12 lg:py-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {contact.badge}
            </div>
            <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
              {contact.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-200">
              {contact.description}
            </p>

            <div className="mt-8 space-y-4">
              <Link
                href={contact.websiteUrl}
                className="flex items-start gap-4 rounded-[24px] border border-white/15 bg-white/10 px-5 py-4 transition hover:bg-white/15"
              >
                <Globe className="h-5 w-5 text-amber-200" />
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    {contact.websiteLabel}
                  </div>
                  <div className="mt-1 break-all text-base font-semibold text-white">
                    {contact.websiteUrl}
                  </div>
                </div>
              </Link>

              <Link
                href={`mailto:${contact.supportEmail}`}
                className="flex items-start gap-4 rounded-[24px] border border-white/15 bg-white/10 px-5 py-4 transition hover:bg-white/15"
              >
                <Mail className="h-5 w-5 text-emerald-200" />
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    {contact.supportLabel}
                  </div>
                  <div className="mt-1 break-all text-base font-semibold text-white">
                    {contact.supportEmail}
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <I18nLink
                href="/dashboard/generate"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {contact.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </I18nLink>
              <I18nLink
                href="/#pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {contact.secondaryCta}
              </I18nLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
