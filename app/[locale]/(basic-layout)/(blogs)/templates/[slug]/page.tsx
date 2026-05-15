import { listPublishedPostsAction } from "@/actions/posts/posts";
import { Locale, LOCALES } from "@/i18n/routing";
import { loadLocalizedMetadata } from "@/lib/cms/page-data";
import { constructMetadata } from "@/lib/metadata";
import { normalizeTemplateMetadata } from "@/lib/seo/content-schema";
import {
  buildSeoPageOgPath,
  buildSeoPagePath,
  buildSeoPageRelatedLinks,
  getSeoPageCmsModule,
} from "@/lib/seo/page-loader";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SeoTemplatePage } from "@/components/cms/public/SeoTemplatePage";

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
  const cms = getSeoPageCmsModule("template");
  const path = buildSeoPagePath({ postType: "template", slug });
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
            postType: "template",
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

export default async function TemplateDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  const cms = getSeoPageCmsModule("template");
  const [t, { post }, relatedResult] = await Promise.all([
    getTranslations({ locale, namespace: "SeoContent" }),
    cms.getBySlug(slug, locale),
    listPublishedPostsAction({
      pageIndex: 0,
      pageSize: 4,
      postType: "template",
      locale,
    }),
  ]);

  if (!post) {
    notFound();
  }

  const relatedLinks = buildSeoPageRelatedLinks({
    postType: "template",
    currentSlug: post.slug,
    posts:
      relatedResult.success && relatedResult.data?.posts
        ? relatedResult.data.posts
        : [],
  });

  return (
    <SeoTemplatePage
      locale={locale}
      title={post.title}
      listPath="/templates"
      listLabel={t("templatesListLabel")}
      fallbackCtaLabel={t("templateCtaFallback")}
      post={post}
      metadata={normalizeTemplateMetadata(
        post.metadataJsonb ?? {
          prompt: post.description || post.title,
        },
      )}
      relatedLinks={relatedLinks}
    />
  );
}
