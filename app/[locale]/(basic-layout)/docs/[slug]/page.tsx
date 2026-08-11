import DocsShell from "@/components/docs/DocsShell";
import {
  DOCS_SLUGS,
  getDocsItem,
  isDocsSlug,
} from "@/components/docs/docs-config";
import MDXComponents from "@/components/mdx/MDXComponents";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
} from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import fs from "fs/promises";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { notFound } from "next/navigation";
import path from "path";
import remarkGfm from "remark-gfm";

const options = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
};

async function getDocsContent(slug: string, locale: string) {
  const localesToTry = Array.from(new Set([locale, DEFAULT_LOCALE]));

  for (const candidate of localesToTry) {
    const filePath = path.join(
      process.cwd(),
      "content",
      "docs",
      slug,
      `${candidate}.mdx`,
    );

    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      // Fall back to the default locale when a translation is not available.
    }
  }

  return null;
}

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isDocsSlug(slug)) {
    return constructMetadata({
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
      path: `/docs/${slug}`,
    });
  }

  const item = getDocsItem(locale, slug);

  return constructMetadata({
    title: item.title,
    description: item.description,
    locale: locale as Locale,
    path: `/docs/${slug}`,
    availableLocales: LOCALES,
  });
}

export default async function DocsPage({ params }: { params: Params }) {
  const { locale, slug } = await params;

  if (!isDocsSlug(slug)) {
    notFound();
  }

  const content = await getDocsContent(slug, locale);

  if (!content) {
    notFound();
  }

  return (
    <DocsShell locale={locale} currentSlug={slug}>
      <article className="max-w-3xl overflow-hidden [&_a]:break-words [&_blockquote]:border-primary/50 [&_blockquote]:text-muted-foreground [&_h1]:mb-5 [&_h1]:mt-1 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:scroll-mt-28 [&_h2]:border-border [&_h2]:border-b [&_h2]:pb-3 [&_h2]:text-2xl [&_h2]:tracking-tight [&_h3]:scroll-mt-28 [&_h3]:text-xl [&_h3]:tracking-tight [&_hr]:border-border [&_img]:border-border [&_img]:shadow-lg [&_li]:!text-muted-foreground [&_p]:!text-muted-foreground [&_strong]:text-foreground [&_table]:rounded-xl">
        <MDXRemote
          source={content}
          components={MDXComponents}
          options={options}
        />
      </article>
    </DocsShell>
  );
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    DOCS_SLUGS.map((slug) => ({ locale, slug })),
  );
}
