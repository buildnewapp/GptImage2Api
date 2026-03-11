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
  type RelatedSeoLink,
  type UseCaseMetadata,
} from "@/lib/seo/content-schema";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonld";
import { PostBase } from "@/types/cms";
import dayjs from "dayjs";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { SeoFaq } from "./SeoFaq";

interface SeoContentPageProps {
  locale: string;
  title: string;
  listPath: string;
  listLabel: string;
  post: PostBase;
  metadata: UseCaseMetadata;
  relatedLinks: RelatedSeoLink[];
}

export function SeoContentPage({
  locale,
  title,
  listPath,
  listLabel,
  post,
  metadata,
  relatedLinks,
}: SeoContentPageProps) {
  const breadcrumbs = buildSeoBreadcrumbs({
    locale,
    listPath,
    slug: post.slug,
    title,
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
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{dayjs(post.publishedAt).format("MMMM D, YYYY")}</span>
              {metadata.targetAudience && <span>For {metadata.targetAudience}</span>}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
                {title}
              </h1>
              {metadata.heroSubtitle && (
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                  {metadata.heroSubtitle}
                </p>
              )}
              {post.description && (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {post.description}
                </p>
              )}
            </div>

            {metadata.ctaLabel && metadata.ctaHref && (
              <div>
                <Button asChild size="lg">
                  <I18nLink href={metadata.ctaHref}>
                    {metadata.ctaLabel}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </I18nLink>
                </Button>
              </div>
            )}
          </div>
        </div>

        {metadata.problemSummary && (
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">Why This Use Case Matters</h2>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              {metadata.problemSummary}
            </p>
          </section>
        )}

        {metadata.benefits.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">What You Get</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {metadata.benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-2xl border p-5">
                  <h3 className="font-medium">{benefit.title}</h3>
                  {benefit.description && (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {benefit.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {metadata.steps.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Suggested Workflow</h2>
            <div className="grid gap-4">
              {metadata.steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-2xl border p-5">
                  <div className="text-sm font-medium text-muted-foreground">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-1 font-medium">{step.title}</h3>
                  {step.description && (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {post.content && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Guide</h2>
            <div className="rounded-3xl border p-6 md:p-8">
              <TiptapRenderer content={post.content} />
            </div>
          </section>
        )}

        <SeoFaq items={metadata.faqs} />

        {relatedLinks.length > 0 && (
          <section className="space-y-4 border-t pt-8">
            <h2 className="text-2xl font-semibold tracking-tight">Related Use Cases</h2>
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
