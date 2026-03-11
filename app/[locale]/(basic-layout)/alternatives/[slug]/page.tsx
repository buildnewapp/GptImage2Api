import { listPublishedPostsAction } from "@/actions/posts/posts";
import { SeoAlternativePage } from "@/components/cms/public/SeoAlternativePage";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import {
  buildSeoPageOgPath,
  buildSeoPagePath,
  buildSeoPageRelatedLinks,
  getSeoPageCmsModule,
  resolveSeoPageAvailableLocales,
} from "@/lib/seo/page-loader";
import { normalizeAlternativeMetadata } from "@/lib/seo/content-schema";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string; slug: string }>;
type MetadataProps = { params: Params };

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("alternative");
  const path = buildSeoPagePath({ postType: "alternative", slug });
  const { metadata: postMetadata } = await cms.getPostMetadata(slug, locale);

  if (!postMetadata) {
    return constructMetadata({
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
      path,
    });
  }

  const availableLocales = await resolveSeoPageAvailableLocales({
    postType: "alternative",
    slug,
    locales: LOCALES,
  });

  return constructMetadata({
    title: postMetadata.title,
    description: postMetadata.description || undefined,
    images: postMetadata.featuredImageUrl
      ? [postMetadata.featuredImageUrl]
      : [
          buildSeoPageOgPath({
            postType: "alternative",
            slug,
            locale,
          }),
        ],
    locale: locale as Locale,
    path,
    noIndex: postMetadata.visibility !== "public",
    availableLocales: availableLocales.length > 0 ? availableLocales : undefined,
  });
}

export default async function AlternativeDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "SeoContent" });
  const cms = getSeoPageCmsModule("alternative");
  const { post } = await cms.getBySlug(slug, locale);

  if (!post) {
    notFound();
  }

  const relatedResult = await listPublishedPostsAction({
    pageIndex: 0,
    pageSize: 4,
    postType: "alternative",
    locale,
  });

  const relatedLinks = buildSeoPageRelatedLinks({
    postType: "alternative",
    currentSlug: post.slug,
    posts: relatedResult.success && relatedResult.data?.posts ? relatedResult.data.posts : [],
  });

  return (
    <SeoAlternativePage
      locale={locale}
      title={post.title}
      listPath="/alternatives"
      listLabel={t("alternativesListLabel")}
      fallbackCtaLabel={t("alternativeCtaFallback")}
      post={post}
      metadata={normalizeAlternativeMetadata(post.metadataJsonb ?? {})}
      relatedLinks={relatedLinks}
    />
  );
}
