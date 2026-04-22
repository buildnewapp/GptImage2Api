import { TiptapRenderer } from "@/components/tiptap/TiptapRenderer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link as I18nLink } from "@/i18n/routing";
import {
  buildSeoBreadcrumbs,
  buildSeoCta,
  buildTemplatePromptBlocks,
  type RelatedSeoLink,
  type TemplateMetadata,
} from "@/lib/seo/content-schema";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonld";
import { PostBase } from "@/types/cms";
import dayjs from "dayjs";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { SeoFaq } from "./SeoFaq";

interface SeoTemplatePageProps {
  locale: string;
  title: string;
  listPath: string;
  listLabel: string;
  fallbackCtaLabel: string;
  post: PostBase;
  metadata: TemplateMetadata;
  relatedLinks: RelatedSeoLink[];
}

export function SeoTemplatePage({
  locale,
  title,
  listPath,
  listLabel,
  fallbackCtaLabel,
  post,
  metadata,
  relatedLinks,
}: SeoTemplatePageProps) {
  const breadcrumbs = buildSeoBreadcrumbs({
    locale,
    listPath,
    slug: post.slug,
    title,
  });
  const promptBlocks = buildTemplatePromptBlocks(metadata.prompt);
  const cta = buildSeoCta(metadata, {
    fallbackLabel: fallbackCtaLabel,
    fallbackHref: "/",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    breadcrumbs.map((item) => ({
      ...item,
      href: `${siteConfig.url}${item.href === "/" ? "" : item.href}`,
    })),
  );
  const faqJsonLd = buildFaqJsonLd(metadata.faqs);

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      )}
      <div className="mx-auto max-w-5xl space-y-10">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const label = index === 1 ? listLabel : item.label;

              return (
                <div key={item.href} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <I18nLink href={item.href}>{label}</I18nLink>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm" className="group w-fit">
            <I18nLink href={listPath} prefetch={false}>
              <ArrowLeftIcon className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to {listLabel}
            </I18nLink>
          </Button>

          <div className="space-y-4 rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 p-8 md:p-12">
            <div className="text-sm text-muted-foreground">
              Updated {dayjs(post.publishedAt).format("MMMM D, YYYY")}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
                {title}
              </h1>
              {post.description && (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {post.description}
                </p>
              )}
            </div>
            <div>
              <Button asChild size="lg">
                <I18nLink href={cta.href}>
                  {cta.label}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </I18nLink>
              </Button>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Prompt</h2>
          <div className="space-y-4 rounded-3xl border bg-muted/20 p-6 md:p-8">
            {promptBlocks.map((block, index) => (
              <pre
                key={`${index}-${block.slice(0, 20)}`}
                className="whitespace-pre-wrap break-words rounded-2xl bg-background p-4 font-mono text-sm leading-7"
              >
                {block}
              </pre>
            ))}
          </div>
        </section>

        {metadata.variables.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Variables</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {metadata.variables.map((item) => (
                <div key={item.key} className="rounded-2xl border p-5">
                  <div className="font-mono text-sm text-primary">{item.key}</div>
                  <h3 className="mt-2 font-medium">{item.label}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(metadata.exampleInput || metadata.exampleOutput) && (
          <section className="grid gap-4 md:grid-cols-2">
            {metadata.exampleInput && (
              <div className="space-y-3 rounded-2xl border p-5">
                <h2 className="text-xl font-semibold tracking-tight">Example Input</h2>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-muted-foreground">
                  {metadata.exampleInput}
                </pre>
              </div>
            )}
            {metadata.exampleOutput && (
              <div className="space-y-3 rounded-2xl border p-5">
                <h2 className="text-xl font-semibold tracking-tight">Example Output</h2>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-muted-foreground">
                  {metadata.exampleOutput}
                </pre>
              </div>
            )}
          </section>
        )}

        {metadata.tips.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Tips</h2>
            <ul className="grid gap-3">
              {metadata.tips.map((tip, index) => (
                <li key={`${tip}-${index}`} className="rounded-2xl border p-5 text-sm leading-7 text-muted-foreground">
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {post.content && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
            <div className="rounded-3xl border p-6 md:p-8">
              <TiptapRenderer content={post.content} />
            </div>
          </section>
        )}

        <SeoFaq items={metadata.faqs} />

        {relatedLinks.length > 0 && (
          <section className="space-y-4 border-t pt-8">
            <h2 className="text-2xl font-semibold tracking-tight">Related Templates</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedLinks.map((link) => (
                <I18nLink
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border p-5 transition-colors hover:bg-muted/40"
                >
                  <div className="space-y-2">
                    <h3 className="font-medium">{link.title}</h3>
                    {link.description && (
                      <p className="text-sm leading-7 text-muted-foreground">
                        {link.description}
                      </p>
                    )}
                    {link.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {link.tags.map((tag) => (
                          <span
                            key={`${link.href}-${tag}`}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </I18nLink>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
