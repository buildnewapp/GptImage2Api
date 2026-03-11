import { listPublishedPostsAction } from "@/actions/posts/posts";
import { listTagsAction } from "@/actions/posts/tags";
import { POST_CONFIGS } from "@/components/cms/post-config";
import { PostList } from "@/components/cms/PostList";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Tag } from "@/types/cms";
import { TextSearch } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

const SERVER_POST_PAGE_SIZE = 48;

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SeoContent" });

  return constructMetadata({
    title: t("compareTitle"),
    description: t("compareDescription"),
    locale: locale as Locale,
    path: `/compare`,
  });
}

export default async function CompareListPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SeoContent" });

  const initialServerPostsResult = await listPublishedPostsAction({
    pageIndex: 0,
    pageSize: SERVER_POST_PAGE_SIZE,
    postType: "compare",
    locale,
  });

  const initialServerPosts =
    initialServerPostsResult.success && initialServerPostsResult.data?.posts
      ? initialServerPostsResult.data.posts
      : [];
  const totalServerPosts =
    initialServerPostsResult.success && initialServerPostsResult.data?.count
      ? initialServerPostsResult.data.count
      : 0;

  const tagsResult = await listTagsAction({ postType: "compare" });
  const serverTags: Tag[] =
    tagsResult.success && tagsResult.data?.tags ? tagsResult.data.tags : [];

  if (initialServerPosts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TextSearch className="mb-4 h-16 w-16 text-gray-400" />
          <h1 className="mb-2 text-3xl font-semibold">{t("compareEmptyTitle")}</h1>
          <p className="max-w-md text-muted-foreground">
            {t("compareEmptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("compareTitle")}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {t("compareIntro")}
        </p>
      </div>

      <PostList
        postType="compare"
        baseUrl="/compare"
        localPosts={[]}
        initialPosts={initialServerPosts}
        initialTotal={totalServerPosts}
        serverTags={serverTags}
        locale={locale}
        pageSize={SERVER_POST_PAGE_SIZE}
        showTagSelector={true}
        showCover={POST_CONFIGS.compare.showCoverInList}
        emptyMessage="No comparisons found for this tag."
      />
    </div>
  );
}
