import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  cardHeadingClass,
  moduleCardClass,
  pageShellClass,
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/template2/constants";
import { Link } from "@/i18n/routing";
import { Locale } from "@/i18n/routing";
import { getShowcaseGenerations } from "@/lib/ai-studio/showcase";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ page?: string | string[] }>;

type MetadataProps = {
  params: Params;
};

function parsePositiveInt(value: string | string[] | undefined, fallback: number) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);
  return items;
}

function buildPageHref(page: number) {
  return page <= 1 ? "/showcase" : `/showcase?page=${page}`;
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Showcase" });

  return constructMetadata({
    title: t("list.title"),
    description: t("list.description"),
    locale: locale as Locale,
    path: "/showcase",
  });
}

export default async function ShowcasePage({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params: Params;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Showcase" });
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const data = await getShowcaseGenerations({ page, limit: 12 });
  const paginationItems = buildPaginationItems(data.page, data.totalPages);

  return (
    <div className={pageShellClass}>
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className={cn(sectionKickerClass, "mb-6")}>
            <Sparkles className="h-4 w-4" />
            {t("list.eyebrow")}
          </div>
          <h1 className={cn(sectionTitleClass, "mx-auto max-w-4xl")}>
            {t("list.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("list.description")}
          </p>
        </div>

        {data.records.length === 0 ? (
          <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-border/70 bg-card/80 px-8 py-16 text-center shadow-[0_28px_72px_-48px_rgba(148,163,184,0.36)] backdrop-blur-sm">
            <p className="text-muted-foreground">{t("list.empty")}</p>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.records.map((record) => {
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
                    className={cn(moduleCardClass, "rounded-[1.4rem] sm:rounded-[1.75rem]")}
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
                                alt={`${record.title}-${index + 1}`}
                                className={cn(
                                  "h-full w-full rounded-[0.8rem] object-cover",
                                  previewUrls.length === 3 && index === 0 && "row-span-2",
                                )}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/55">
                          {record.title}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent px-4 pb-3 pt-10 text-white sm:px-5 sm:pb-4 sm:pt-12">
                        <div className="flex items-center gap-2">
                          <Badge className="border-white/12 bg-white/12 text-white hover:bg-white/12">
                            {record.category}
                          </Badge>
                          <span className="text-xs text-white/70">{record.provider}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                      <div>
                        <h2 className={cn(cardHeadingClass, "line-clamp-2 text-[1.3rem] sm:text-[1.5rem]")}>
                          {record.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {record.prompt || record.catalogModelId}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateTime(record.createdAt, locale)}
                        </span>
                        <span className="font-medium text-foreground/85">
                          {t("list.viewDetails")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 sm:mt-12">
              <p className="text-center text-sm text-muted-foreground">
                {t("list.pageLabel", {
                  page: data.page,
                  totalPages: data.totalPages,
                })}
              </p>

              {data.totalPages > 1 ? (
                <Pagination>
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <Link
                        href={buildPageHref(Math.max(1, data.page - 1))}
                        aria-disabled={data.page <= 1}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          data.page <= 1 && "pointer-events-none opacity-40",
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    </PaginationItem>

                    {paginationItems.map((item, index) => (
                      <PaginationItem key={`${item}-${index}`}>
                        {item === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <Link
                            href={buildPageHref(item)}
                            className={cn(
                              buttonVariants({
                                variant: item === data.page ? "outline" : "ghost",
                                size: "sm",
                              }),
                              "min-w-9",
                            )}
                            aria-current={item === data.page ? "page" : undefined}
                          >
                            {item}
                          </Link>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <Link
                        href={buildPageHref(Math.min(data.totalPages, data.page + 1))}
                        aria-disabled={data.page >= data.totalPages}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          data.page >= data.totalPages && "pointer-events-none opacity-40",
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
