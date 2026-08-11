import DocsShell from "@/components/docs/DocsShell";
import { getDocsCopy, getDocsNavigation } from "@/components/docs/docs-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, LOCALES, type Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getDocsCopy(locale);

  return constructMetadata({
    title: copy.title,
    description: copy.description,
    locale: locale as Locale,
    path: "/docs",
    availableLocales: LOCALES,
  });
}

export default async function DocsIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  const copy = getDocsCopy(locale);
  const entries = getDocsNavigation(locale).flatMap((group) => group.items);

  return (
    <DocsShell locale={locale}>
      <section className="w-full py-4 sm:py-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Sdance AI</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {copy.description}
          </p>
        </div>

        <div className="mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <Card
              key={entry.href}
              className="group h-full border-border/70 bg-card/80 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg motion-reduce:transition-none"
            >
              <CardHeader className="p-6">
                <CardTitle className="text-lg tracking-tight transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">
                  {entry.title}
                </CardTitle>
                <CardDescription className="mt-1 leading-6">
                  {entry.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <Link
                  href={entry.href}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copy.viewGuide}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </DocsShell>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
