import CopyButton from "@/components/shared/CopyButton";
import {
  getDocsItem,
  type ApiDocsSlug,
} from "@/components/docs/docs-config";
import { BASE_URL } from "@/config/site";
import { Link } from "@/i18n/routing";
import {
  apiDocEndpoints,
  apiDocStatuses,
  aiVideoStudioModelOptions,
} from "@/lib/apidoc/ai-studio-api-docs";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  FileJson,
  KeyRound,
  ListChecks,
  Server,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import ApiEndpointReference, {
  type ApiDocCodeLabels,
  type ApiDocTableCopy,
} from "./ApiEndpointReference";
import ApiModelFieldExplorer from "./ApiModelFieldExplorer";
import ApiPlayground from "./ApiPlayground";

type CtaLink = {
  label: string;
  href: string;
};

type ApiPlaygroundConfig = {
  method: "GET" | "POST";
  initialPath: string;
  initialBody?: string;
  consumesCredits?: boolean;
};

function getPlaygroundConfig(slug: ApiDocsSlug): ApiPlaygroundConfig {
  if (slug === "api-generate") {
    return {
      method: "POST",
      initialPath: "/api/ai-studio/execute",
      initialBody: JSON.stringify(
        {
          modelId: "video:sora2-text-to-video-standard",
          isPublic: true,
          payload: {
            model: "video:sora2-text-to-video-standard",
            input: {
              prompt: "A cinematic video of a cat walking in the rain",
            },
          },
        },
        null,
        2,
      ),
      consumesCredits: true,
    };
  }

  if (slug === "api-models") {
    const modelId =
      aiVideoStudioModelOptions[0]?.modelId ??
      "video:sora2-text-to-video-standard";

    return {
      method: "GET",
      initialPath: `/api/ai-studio/models/${encodeURIComponent(modelId)}`,
    };
  }

  if (slug === "api-task-status") {
    return {
      method: "GET",
      initialPath: "/api/ai-studio/tasks/{taskId}",
    };
  }

  if (slug === "api-history") {
    return {
      method: "GET",
      initialPath: "/api/ai-studio/video-history?page=1&limit=12&status=all",
    };
  }

  return {
    method: "GET",
    initialPath: "/api/auth/user",
  };
}

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 border-b border-border/70 pb-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        <Code2 className="h-4 w-4" aria-hidden="true" />
        <span>AI Studio API</span>
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </header>
  );
}

function ActionLinks({ links }: { links: CtaLink[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link, index) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none ${
            index === 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border bg-background hover:bg-muted"
          }`}
        >
          {link.label}
          {index === 0 ? (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export default async function ApiDocsArticle({
  locale,
  slug,
}: {
  locale: string;
  slug: ApiDocsSlug;
}) {
  const t = await getTranslations({ locale, namespace: "ApiDoc" });
  const item = getDocsItem(locale, slug);
  const tableCopy = t.raw("table") as ApiDocTableCopy;
  const codeLabels = t.raw("codeLabels") as ApiDocCodeLabels;
  const tr = (key: string) => String(t.raw(key));
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    BASE_URL ||
    "https://YOUR_DOMAIN"
  ).replace(/\/+$/, "");
  const endpointProps = {
    siteUrl,
    tableCopy,
    codeLabels,
    t: tr,
  };
  const playgroundConfig = getPlaygroundConfig(slug);
  const playground = (
    <div className="mb-8">
      <ApiPlayground locale={locale} {...playgroundConfig} />
    </div>
  );

  if (slug === "api") {
    const flow = t.raw("flow.steps") as string[];
    const overviewLinks = [
      {
        slug: "api-authentication" as const,
        label: "GET",
        endpoint: "/api/auth/user",
      },
      {
        slug: "api-generate" as const,
        label: "POST",
        endpoint: "/api/ai-studio/execute",
      },
      {
        slug: "api-models" as const,
        label: "GET",
        endpoint: "/api/ai-studio/models/{modelId}",
      },
      {
        slug: "api-task-status" as const,
        label: "GET",
        endpoint: "/api/ai-studio/tasks/{taskId}",
      },
      {
        slug: "api-history" as const,
        label: "GET",
        endpoint: "/api/ai-studio/video-history",
      },
      {
        slug: "api-billing" as const,
        label: "GUIDE",
        endpoint: t("pricing.kicker"),
      },
    ];
    const heroCtas = t.raw("hero.ctas") as CtaLink[];

    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}

        <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Server
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Base URL</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("auth.replaceHint")}
              </p>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-3">
                <code className="min-w-0 flex-1 break-all text-sm">
                  {siteUrl}
                </code>
                <CopyButton
                  text={siteUrl}
                  variant="ghost"
                  label={codeLabels.copy}
                  copiedLabel={codeLabels.copied}
                />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ActionLinks links={heroCtas} />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("flow.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("flow.description")}
          </p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {flow.map((step, index) => (
              <li
                key={step}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium leading-6">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("endpoints.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("endpoints.description")}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {overviewLinks.map((entry) => {
              const target = getDocsItem(locale, entry.slug);

              return (
                <Link
                  key={entry.slug}
                  href={`/docs/${entry.slug}`}
                  className="group cursor-pointer rounded-xl border border-border/70 bg-card/75 p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                      {entry.label}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-4 font-semibold">{target.title}</h3>
                  <code className="mt-2 block break-all text-xs text-muted-foreground">
                    {entry.endpoint}
                  </code>
                </Link>
              );
            })}
          </div>
        </section>
      </article>
    );
  }

  if (slug === "api-authentication") {
    const endpoint = apiDocEndpoints.find((entry) => entry.id === "user")!;

    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <KeyRound
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">{t("auth.cardTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("auth.cardDescription")}
              </p>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-3">
                <code className="min-w-0 flex-1 break-all text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <CopyButton
                  text="Authorization: Bearer YOUR_API_KEY"
                  variant="ghost"
                  label={codeLabels.copy}
                  copiedLabel={codeLabels.copied}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {t("auth.replaceHint")}
              </p>
              <div className="mt-5">
                <ActionLinks
                  links={[
                    {
                      label: t("auth.getApiKeyCta"),
                      href: "/dashboard/apikeys",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
        <ApiEndpointReference endpoint={endpoint} {...endpointProps} />
      </article>
    );
  }

  if (slug === "api-generate") {
    const endpoint = apiDocEndpoints.find((entry) => entry.id === "execute")!;

    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}
        <ApiEndpointReference endpoint={endpoint} {...endpointProps} />
        <div className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.07] p-4 text-sm leading-6 text-muted-foreground">
          {t("parameters.payload")} {" "}
          <Link
            href="/docs/api-models#dynamic-payload-fields-by-model"
            className="cursor-pointer font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("parameters.payloadAnchor")}
          </Link>
        </div>
      </article>
    );
  }

  if (slug === "api-models") {
    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{t("models.title")}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("models.description")}
          </p>
          <div className="mt-5 max-h-[420px] max-w-full overflow-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("models.family")}</th>
                  <th className="px-4 py-3">{t("models.version")}</th>
                  <th className="px-4 py-3">{t("models.modelId")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/65 bg-card/80">
                {aiVideoStudioModelOptions.map((model) => (
                  <tr key={model.modelId}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {model.familyLabel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {model.versionLabel}
                    </td>
                    <td className="break-all px-4 py-3 font-mono text-xs">
                      {model.modelId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ApiModelFieldExplorer
          modelOptions={aiVideoStudioModelOptions}
          siteUrl={siteUrl}
          copyLabel={codeLabels.copy}
          copiedLabel={codeLabels.copied}
        />
      </article>
    );
  }

  if (slug === "api-task-status") {
    const endpoint = apiDocEndpoints.find((entry) => entry.id === "task")!;

    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">{t("statuses.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("statuses.description")}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {apiDocStatuses.map((status) => (
              <div
                key={status}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-background/80 p-4"
              >
                <CheckCircle2
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <code className="text-sm">{status}</code>
              </div>
            ))}
          </div>
        </section>
        <ApiEndpointReference endpoint={endpoint} {...endpointProps} />
      </article>
    );
  }

  if (slug === "api-history") {
    const endpoint = apiDocEndpoints.find(
      (entry) => entry.id === "video-history",
    )!;

    return (
      <article className="min-w-0">
        <PageHeader title={item.title} description={item.description} />
        {playground}
        <ApiEndpointReference endpoint={endpoint} {...endpointProps} />
      </article>
    );
  }

  const pricingItems = t.raw("pricing.items") as string[];
  const pricingCtas = t.raw("pricing.ctas") as CtaLink[];
  const faq = t.raw("faq.items") as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <article className="min-w-0">
      <PageHeader title={item.title} description={item.description} />
      {playground}
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <CircleDollarSign
            className="h-5 w-5 text-primary"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold">{t("pricing.title")}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("pricing.description")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {pricingItems.map((pricingItem) => (
            <div
              key={pricingItem}
              className="flex gap-3 rounded-xl border border-border/70 bg-background/80 p-4"
            >
              <CircleDollarSign
                className="mt-1 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                {pricingItem}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <ActionLinks links={pricingCtas} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("faq.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("faq.description")}
        </p>
        <div className="mt-5 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card/80">
          {faq.map((faqItem) => (
            <details key={faqItem.question} className="group p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {faqItem.question}
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {faqItem.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
