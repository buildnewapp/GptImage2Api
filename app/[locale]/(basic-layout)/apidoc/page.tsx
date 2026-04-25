import {
  apiDocEndpoints,
  apiDocStatuses,
  aiVideoStudioModelOptions,
  type ApiDocEndpoint,
  type ApiDocParameter,
} from "@/lib/apidoc/ai-studio-api-docs";
import ApiDocModelFieldExplorer from "@/components/apidoc/ApiDocModelFieldExplorer";
import CopyButton from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import {
  cardHeadingClass,
  moduleCardClass,
  pageShellClass,
  sectionKickerClass,
  sectionTitleClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { BASE_URL } from "@/config/site";
import { Link, type Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Coins,
  FileJson,
  KeyRound,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

type CtaLink = {
  label: string;
  href: string;
};

type IconName =
  | "code"
  | "sparkles"
  | "coins"
  | "workflow"
  | "key"
  | "shield"
  | "terminal"
  | "json";

type Translation = (key: string) => string;

type TableCopy = {
  name: string;
  type: string;
  required: string;
  defaultValue: string;
  options: string;
  description: string;
  yes: string;
  no: string;
  none: string;
};

type CodeLabels = {
  request: string;
  response: string;
  error: string;
  copy: string;
  copied: string;
};

const iconMap: Record<IconName, ComponentType<{ className?: string }>> = {
  code: Code2,
  sparkles: Sparkles,
  coins: Coins,
  workflow: ListChecks,
  key: KeyRound,
  shield: ShieldCheck,
  terminal: TerminalSquare,
  json: FileJson,
};

function replaceDomainToken(input: string, siteUrl: string) {
  return input.replaceAll("https://YOUR_DOMAIN", siteUrl);
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ApiDoc.seo" });
  const metadata = await constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/apidoc",
  });

  return {
    ...metadata,
    keywords: t.raw("keywords") as string[],
  };
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
      <h2
        className={cn(
          sectionTitleClass,
          "mx-auto max-w-4xl text-[clamp(2.1rem,4vw,3.35rem)]",
        )}
      >
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

function CodeBlock({
  label,
  code,
  codeLabels,
}: {
  label: string;
  code: string;
  codeLabels: CodeLabels;
}) {
  return (
    <div
      className={cn(
        moduleCardClass,
        "flex min-h-[260px] h-full cursor-default flex-col overflow-hidden rounded-[1.3rem]",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-slate-900/95 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
          {label}
        </span>
        <CopyButton
          text={code}
          variant="ghost"
          label={codeLabels.copy}
          copiedLabel={codeLabels.copied}
          className="hover:bg-white/10"
        />
      </div>
      <pre className="flex-1 overflow-auto bg-slate-950 p-4 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ParameterTable({
  parameters,
  copy,
  t,
}: {
  parameters: ApiDocParameter[];
  copy: TableCopy;
  t: Translation;
}) {
  if (parameters.length === 0) {
    return (
      <p className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
        {copy.none}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1rem] border border-border/70 bg-background/70">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-card/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">{copy.name}</th>
            <th className="px-4 py-3 font-semibold">{copy.type}</th>
            <th className="px-4 py-3 font-semibold">{copy.required}</th>
            <th className="px-4 py-3 font-semibold">{copy.defaultValue}</th>
            <th className="px-4 py-3 font-semibold">{copy.options}</th>
            <th className="px-4 py-3 font-semibold">{copy.description}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/65">
          {parameters.map((parameter) => (
            <tr key={parameter.name}>
              <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                {parameter.name}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {parameter.type}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {parameter.required ? copy.yes : copy.no}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {parameter.defaultValue}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-muted-foreground">
                {parameter.enumValues?.length ? (
                  <span className="block max-h-20 overflow-hidden font-mono text-xs">
                    {parameter.enumValues.join(", ")}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span>{t(parameter.descriptionKey)}</span>
                {parameter.descriptionAnchorId &&
                parameter.descriptionAnchorLabelKey ? (
                  <a
                    href={`#${parameter.descriptionAnchorId}`}
                    className="ml-1 font-semibold text-primary underline underline-offset-4"
                  >
                    {t(parameter.descriptionAnchorLabelKey)}
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({
  endpoint,
  tableCopy,
  codeLabels,
  t,
}: {
  endpoint: ApiDocEndpoint;
  tableCopy: TableCopy;
  codeLabels: CodeLabels;
  t: Translation;
}) {
  return (
    <article
      className={cn(
        moduleCardClass,
        "cursor-default rounded-[1.5rem] p-5 md:p-6",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-semibold text-white">
              {endpoint.method}
            </span>
            <code className="break-all rounded-full border border-border/70 bg-background/70 px-3 py-1 text-sm text-foreground">
              {endpoint.endpoint}
            </code>
            <CopyButton
              text={endpoint.endpoint}
              variant="ghost"
              label={codeLabels.copy}
              copiedLabel={codeLabels.copied}
            />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t(endpoint.descriptionKey)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("endpointLabels.headers")}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {endpoint.headers.map((header) => (
              <code
                key={header}
                className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground"
              >
                {header}
              </code>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("endpointLabels.parameters")}
          </h3>
          <ParameterTable
            parameters={endpoint.parameters}
            copy={tableCopy}
            t={t}
          />
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <CodeBlock
            label={codeLabels.request}
            code={endpoint.curl}
            codeLabels={codeLabels}
          />
          <CodeBlock
            label={codeLabels.response}
            code={endpoint.responseExample}
            codeLabels={codeLabels}
          />
          <CodeBlock
            label={codeLabels.error}
            code={endpoint.errorExample}
            codeLabels={codeLabels}
          />
        </div>
      </div>
    </article>
  );
}

function CtaButtons({
  links,
  tone = "default",
}: {
  links: CtaLink[];
  tone?: "default" | "inverted";
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      {links.map((link, index) => (
        <Button
          key={link.href}
          asChild
          size="lg"
          variant={index === 0 ? "default" : "outline"}
          className={cn(
            "h-11 cursor-pointer rounded-full px-5",
            index === 0
              ? tone === "inverted"
                ? "bg-white text-slate-950 hover:bg-white/85"
                : "bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] text-white hover:brightness-110 dark:bg-[linear-gradient(135deg,#274f90_0%,#3b82f6_100%)]"
              : "border-border/70 bg-background/70",
          )}
        >
          <Link href={link.href}>
            {link.label}
            {index === 0 ? (
              <ArrowRight className="size-4" aria-hidden="true" />
            ) : null}
          </Link>
        </Button>
      ))}
    </div>
  );
}

export default async function ApiDocPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ApiDoc" });
  const heroCtas = t.raw("hero.ctas") as CtaLink[];
  const bottomCtas = t.raw("finalCta.ctas") as CtaLink[];
  const pricingCtas = t.raw("pricing.ctas") as CtaLink[];
  const valueProps = t.raw("hero.valueProps") as Array<{
    title: string;
    icon: IconName;
  }>;
  const flow = t.raw("flow.steps") as string[];
  const pricingItems = t.raw("pricing.items") as string[];
  const faq = t.raw("faq.items") as Array<{ question: string; answer: string }>;
  const tableCopy = t.raw("table") as TableCopy;
  const codeLabels = t.raw("codeLabels") as CodeLabels;
  const tr: Translation = (key) => String(t.raw(key));
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    BASE_URL ||
    "https://YOUR_DOMAIN"
  ).replace(/\/+$/, "");
  const resolvedEndpoints = apiDocEndpoints.map((endpoint) => ({
    ...endpoint,
    curl: replaceDomainToken(endpoint.curl, siteUrl),
  }));
  const executeEndpoint = resolvedEndpoints.find(
    (endpoint) => endpoint.id === "execute",
  );
  const userEndpoint = resolvedEndpoints.find(
    (endpoint) => endpoint.id === "user",
  );

  return (
    <div className={cn(pageShellClass, "w-full")}>
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className={cn(sectionKickerClass, "mb-6")}>
            <Sparkles className="h-4 w-4" />
            {t("hero.badge")}
          </div>
          <h1 className={cn(sectionTitleClass, "mx-auto max-w-5xl")}>
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8">
            <CtaButtons links={heroCtas} />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-4">
          {valueProps.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <div
                key={item.title}
                className={cn(
                  moduleCardClass,
                  "cursor-default rounded-[1.4rem] p-5 sm:rounded-[1.6rem]",
                )}
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <p className="mt-4 text-sm font-semibold text-foreground">
                  {item.title}
                </p>
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            moduleCardClass,
            "mt-8 cursor-default rounded-[1.5rem] p-2.5 sm:rounded-[2rem] sm:p-4",
          )}
        >
          <div className="overflow-hidden rounded-[1.2rem] bg-slate-950">
            <div className="mb-3 flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="size-3 rounded-full bg-red-400" />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-400" />
              <CopyButton
                text={executeEndpoint?.curl ?? ""}
                variant="ghost"
                label={codeLabels.copy}
                copiedLabel={codeLabels.copied}
                className="ml-auto hover:bg-white/10"
              />
            </div>
            <pre className="overflow-x-auto px-4 pb-4 text-sm leading-6 text-slate-100">
              <code>{executeEndpoint?.curl ?? ""}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <SectionHeader
          kicker={t("flow.kicker")}
          title={t("flow.title")}
          description={t("flow.description")}
        />
        <div className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {flow.map((step, index) => (
            <div
              key={step}
              className={cn(
                moduleCardClass,
                "cursor-default rounded-[1.4rem] p-5 sm:rounded-[1.7rem]",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-foreground">
                  {step}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          kicker={t("auth.kicker")}
          title={t("auth.title")}
          description={t("auth.description")}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className={cn(
              moduleCardClass,
              "cursor-default rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6",
            )}
          >
            <div className="flex items-start gap-3">
              <KeyRound
                className="mt-1 size-5 text-primary"
                aria-hidden="true"
              />
              <div>
                <h3 className={cn(cardHeadingClass, "text-[1.45rem]")}>
                  {t("auth.cardTitle")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("auth.cardDescription")}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-background/70 p-3">
              <code className="min-w-0 break-all font-mono text-sm text-foreground">
                Authorization: Bearer YOUR_API_KEY
              </code>
              <CopyButton
                text="Authorization: Bearer YOUR_API_KEY"
                variant="ghost"
                label={codeLabels.copy}
                copiedLabel={codeLabels.copied}
                className="shrink-0"
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {t("auth.replaceHint")}
            </p>
            <div className="mt-5">
              <Button asChild size="sm" className="h-10 rounded-full px-4">
                <Link href="/dashboard/apikeys">{t("auth.getApiKeyCta")}</Link>
              </Button>
            </div>
          </div>
          <CodeBlock
            label={codeLabels.request}
            code={userEndpoint?.curl ?? ""}
            codeLabels={codeLabels}
          />
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          kicker={t("endpoints.kicker")}
          title={t("endpoints.title")}
          description={t("endpoints.description")}
        />
        <div className="mt-10 space-y-6">
          {resolvedEndpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              tableCopy={tableCopy}
              codeLabels={codeLabels}
              t={tr}
            />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div
            className={cn(
              moduleCardClass,
              "min-w-0 self-start cursor-default rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6",
            )}
          >
            <div className={cn(sectionKickerClass, "mb-5")}>
              {t("models.kicker")}
            </div>
            <h3
              className={cn(
                subsectionTitleClass,
                "text-[1.5rem] sm:text-[1.75rem]",
              )}
            >
              {t("models.title")}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("models.description")}
            </p>
            <div className="mt-6 max-h-[360px] overflow-auto rounded-[1rem] border border-border/70 bg-background/70">
              <table className="w-full min-w-[520px] text-left text-sm sm:min-w-[640px]">
                <thead className="bg-card/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("models.family")}</th>
                    <th className="px-4 py-3">{t("models.version")}</th>
                    <th className="px-4 py-3">{t("models.modelId")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/65">
                  {aiVideoStudioModelOptions.map((model) => (
                    <tr key={model.modelId}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {model.familyLabel}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {model.versionLabel}
                      </td>
                      <td className="break-all px-4 py-3 font-mono text-xs text-foreground">
                        {model.modelId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("statuses.kicker")}
              </div>
              <h4 className="mt-2 text-lg font-semibold text-foreground">
                {t("statuses.title")}
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("statuses.description")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {apiDocStatuses.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-background/70 p-4"
                  >
                    <CheckCircle2
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    <code className="text-sm text-foreground">{status}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <ApiDocModelFieldExplorer
              modelOptions={aiVideoStudioModelOptions}
              siteUrl={siteUrl}
              copyLabel={codeLabels.copy}
              copiedLabel={codeLabels.copied}
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div
          className={cn(
            moduleCardClass,
            "cursor-default rounded-[1.5rem] p-6 md:p-8",
          )}
        >
          <SectionHeader
            kicker={t("pricing.kicker")}
            title={t("pricing.title")}
            description={t("pricing.description")}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pricingItems.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-[1rem] border border-border/70 bg-background/70 p-4"
              >
                <Coins
                  className="mt-1 size-4 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <CtaButtons links={pricingCtas} />
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          kicker={t("faq.kicker")}
          title={t("faq.title")}
          description={t("faq.description")}
        />
        <div
          className={cn(
            moduleCardClass,
            "mt-10 cursor-default divide-y divide-border/60 rounded-[1.5rem]",
          )}
        >
          {faq.map((item) => (
            <details key={item.question} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-foreground">
                {item.question}
                <ArrowRight
                  className="size-4 shrink-0 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[1.8rem] bg-[linear-gradient(140deg,#1f2a44_0%,#253a64_100%)] px-6 py-12 text-center text-white shadow-[0_24px_52px_-28px_rgba(15,23,42,0.7)]">
          <h2
            className={cn(
              subsectionTitleClass,
              "text-[2rem] text-white sm:text-[2.35rem]",
            )}
          >
            {t("finalCta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/78">
            {t("finalCta.description")}
          </p>
          <div className="mt-8">
            <CtaButtons links={bottomCtas} tone="inverted" />
          </div>
        </div>
      </section>
    </div>
  );
}
