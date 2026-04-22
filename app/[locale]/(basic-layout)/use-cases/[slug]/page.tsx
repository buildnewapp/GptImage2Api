import { listPublishedPostsAction } from "@/actions/posts/posts";
import { Locale, LOCALES } from "@/i18n/routing";
import { loadLocalizedMetadata } from "@/lib/cms/page-data";
import { constructMetadata } from "@/lib/metadata";
import { normalizeUseCaseMetadata } from "@/lib/seo/content-schema";
import {
  buildSeoPageOgPath,
  buildSeoPagePath,
  buildSeoPageRelatedLinks,
  getSeoPageCmsModule,
} from "@/lib/seo/page-loader";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SeoContentPage } from "@/components/cms/public/SeoContentPage";

type Params = Promise<{
  locale: string;
  slug: string;
}>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("use_case");
  const path = buildSeoPagePath({ postType: "use_case", slug });
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
            postType: "use_case",
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

export default async function UseCaseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("use_case");
  const [t, { post }, relatedResult] = await Promise.all([
    getTranslations({ locale, namespace: "SeoContent" }),
    cms.getBySlug(slug, locale),
    listPublishedPostsAction({
      pageIndex: 0,
      pageSize: 4,
      postType: "use_case",
      locale,
    }),
  ]);

  if (!post) {
    notFound();
  }

  const relatedLinks = buildSeoPageRelatedLinks({
    postType: "use_case",
    currentSlug: post.slug,
    posts: relatedResult.success && relatedResult.data?.posts
      ? relatedResult.data.posts
      : [],
  });

  return (
    <SeoContentPage
      locale={locale}
      title={post.title}
      listPath="/use-cases"
      listLabel={t("useCasesListLabel")}
      post={post}
      metadata={normalizeUseCaseMetadata(post.metadataJsonb ?? {})}
      relatedLinks={relatedLinks}
    />
  );
}
