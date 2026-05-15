import { listPublishedPostsAction } from "@/actions/posts/posts";
import { SeoComparePage } from "@/components/cms/public/SeoComparePage";
import { Locale, LOCALES } from "@/i18n/routing";
import { loadLocalizedMetadata } from "@/lib/cms/page-data";
import { constructMetadata } from "@/lib/metadata";
import {
  buildSeoPageOgPath,
  buildSeoPagePath,
  buildSeoPageRelatedLinks,
  getSeoPageCmsModule,
} from "@/lib/seo/page-loader";
import { normalizeCompareMetadata } from "@/lib/seo/content-schema";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string; slug: string }>;
type MetadataProps = { params: Params };

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("compare");
  const path = buildSeoPagePath({ postType: "compare", slug });
  const { currentMetadata: postMetadata, availableLocales } =
    await loadLocalizedMetadata({
      locales: LOCALES,
      currentLocale: locale,
      loadMetadata: (checkLocale) => cms.getPostMetadata(slug, checkLocale),
    });

  if (!postMetadata) {
    return constructMetadata({
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
      path,
    });
  }

  return constructMetadata({
    title: postMetadata.title,
    description: postMetadata.description || undefined,
    images: postMetadata.featuredImageUrl
      ? [postMetadata.featuredImageUrl]
      : [
          buildSeoPageOgPath({
            postType: "compare",
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

export default async function CompareDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("compare");
  const [t, { post }, relatedResult] = await Promise.all([
    getTranslations({ locale, namespace: "SeoContent" }),
    cms.getBySlug(slug, locale),
    listPublishedPostsAction({
      pageIndex: 0,
      pageSize: 4,
      postType: "compare",
      locale,
    }),
  ]);

  if (!post) {
    notFound();
  }

  const relatedLinks = buildSeoPageRelatedLinks({
    postType: "compare",
    currentSlug: post.slug,
    posts: relatedResult.success && relatedResult.data?.posts ? relatedResult.data.posts : [],
  });

  return (
    <SeoComparePage
      locale={locale}
      title={post.title}
      listPath="/compare"
      listLabel={t("compareListLabel")}
      fallbackCtaLabel={t("compareCtaFallback")}
      post={post}
      metadata={normalizeCompareMetadata(post.metadataJsonb ?? {})}
      relatedLinks={relatedLinks}
    />
  );
}
