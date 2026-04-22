import { listPublishedPostsAction } from "@/actions/posts/posts";
import { listTagsAction } from "@/actions/posts/tags";
import { POST_CONFIGS } from "@/components/cms/post-config";
import { PostList } from "@/components/cms/PostList";
import { Locale } from "@/i18n/routing";
import { loadPublicListPageData } from "@/lib/cms/page-data";
import { constructMetadata } from "@/lib/metadata";
import { Tag } from "@/types/cms";
import { TextSearch } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

const SERVER_POST_PAGE_SIZE = 48;

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SeoContent" });

  return constructMetadata({
    title: t("templatesTitle"),
    description: t("templatesDescription"),
    locale: locale as Locale,
    path: `/templates`,
  });
}

export default async function TemplatesPage({ params }: { params: Params }) {
  const { locale } = await params;
  const [t, listData] = await Promise.all([
    getTranslations({ locale, namespace: "SeoContent" }),
    loadPublicListPageData({
      fetchPosts: () =>
        listPublishedPostsAction({
          pageIndex: 0,
          pageSize: SERVER_POST_PAGE_SIZE,
          postType: "template",
          locale,
        }),
      fetchTags: () => listTagsAction({ postType: "template" }),
    }),
  ]);

  if (listData.posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TextSearch className="mb-4 h-16 w-16 text-gray-400" />
          <h1 className="mb-2 text-3xl font-semibold">
            {t("templatesEmptyTitle")}
          </h1>
          <p className="max-w-md text-muted-foreground">
            {t("templatesEmptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          {t("templatesTitle")}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {t("templatesIntro")}
        </p>
      </div>

      <PostList
        postType="template"
        baseUrl="/templates"
        localPosts={[]}
        initialPosts={listData.posts}
        initialTotal={listData.total}
        serverTags={listData.tags as Tag[]}
        locale={locale}
        pageSize={SERVER_POST_PAGE_SIZE}
        showTagSelector={true}
        showCover={POST_CONFIGS.template.showCoverInList}
        emptyMessage="No templates found for this tag."
      />
    </div>
  );
}
