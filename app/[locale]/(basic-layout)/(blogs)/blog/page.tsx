import { listPublishedPostsAction } from "@/actions/posts/posts";
import { listTagsAction } from "@/actions/posts/tags";
import { POST_CONFIGS } from "@/components/cms/post-config";
import { PostList } from "@/components/cms/PostList";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Link, Locale } from "@/i18n/routing";
import { getBlogDataSource } from "@/lib/blog-source";
import { blogCms } from "@/lib/cms";
import { loadPublicListPageData } from "@/lib/cms/page-data";
import { listGeoBlogPosts } from "@/lib/geo/blog";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Tag } from "@/types/cms";
import { ChevronLeft, ChevronRight, TextSearch } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ page?: string | string[] }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blogs" });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/blog`,
  });
}

const SERVER_POST_PAGE_SIZE = 12;

export const revalidate = 3600;

function parsePositiveInt(
  value: string | string[] | undefined,
  fallback: number,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
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

function buildBlogPageHref(page: number) {
  return page <= 1 ? "/blog" : `/blog?page=${page}`;
}

function BlogPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const paginationItems = buildPaginationItems(currentPage, totalPages);

  return (
    <Pagination className="mt-10">
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <Link
            href={buildBlogPageHref(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              currentPage <= 1 && "pointer-events-none opacity-40",
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
                href={buildBlogPageHref(item)}
                className={cn(
                  buttonVariants({
                    variant: item === currentPage ? "outline" : "ghost",
                    size: "sm",
                  }),
                  "min-w-9",
                )}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </Link>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <Link
            href={buildBlogPageHref(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage >= totalPages}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              currentPage >= totalPages && "pointer-events-none opacity-40",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const blogDataSource = getBlogDataSource();
  const currentPage = parsePositiveInt(resolvedSearchParams.page, 1);
  const pageIndex = currentPage - 1;

  if (blogDataSource === "geo") {
    const [t, geoListData] = await Promise.all([
      getTranslations("Blogs"),
      listGeoBlogPosts({
        locale,
        pageIndex,
        pageSize: SERVER_POST_PAGE_SIZE,
      }).catch((error) => {
        console.error("Failed to fetch GEO blog posts:", error);
        return { posts: [], count: 0 };
      }),
    ]);
    const totalPages = Math.max(
      1,
      Math.ceil(geoListData.count / SERVER_POST_PAGE_SIZE),
    );

    if (geoListData.count > 0 && currentPage > totalPages) {
      redirect(buildBlogPageHref(totalPages));
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">{t("title")}</h1>

        {geoListData.count === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <TextSearch className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">
              {t("emptyState.title") || "No blog posts"}
            </h2>
            <p className="text-gray-500 max-w-md">
              {t("emptyState.description") ||
                "We are creating exciting content, please stay tuned!"}
            </p>
          </div>
        ) : (
          <>
            <PostList
              postType="blog"
              baseUrl="/blog"
              localPosts={[]}
              initialPosts={geoListData.posts}
              initialTotal={geoListData.count}
              serverTags={[]}
              locale={locale}
              pageSize={SERVER_POST_PAGE_SIZE}
              showTagSelector={false}
              showCover={POST_CONFIGS.blog.showCoverInList}
              useNativeImages
              enableLoadMore={false}
              emptyMessage="No posts found."
            />
            <BlogPagination currentPage={currentPage} totalPages={totalPages} />
          </>
        )}
      </div>
    );
  }

  const [t, listData] = await Promise.all([
    getTranslations("Blogs"),
    loadPublicListPageData({
      fetchLocalPosts: () => blogCms.getLocalList(locale),
      fetchPosts: () =>
        listPublishedPostsAction({
          pageIndex,
          pageSize: SERVER_POST_PAGE_SIZE,
          postType: "blog",
          locale,
        }),
      fetchTags: () => listTagsAction({ postType: "blog" }),
    }),
  ]);

  if (listData.postsError) {
    console.error("Failed to fetch initial server posts:", listData.postsError);
  }

  const noPostsFound = listData.localPosts.length === 0 && listData.total === 0;
  const totalPages = Math.max(
    1,
    Math.ceil(listData.total / SERVER_POST_PAGE_SIZE),
  );

  if (listData.total > 0 && currentPage > totalPages) {
    redirect(buildBlogPageHref(totalPages));
  }

  if (
    listData.total === 0 &&
    listData.localPosts.length > 0 &&
    currentPage > 1
  ) {
    redirect(buildBlogPageHref(1));
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">{t("title")}</h1>

      {noPostsFound ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <TextSearch className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            {t("emptyState.title") || "No blog posts"}
          </h2>
          <p className="text-gray-500 max-w-md">
            {t("emptyState.description") ||
              "We are creating exciting content, please stay tuned!"}
          </p>
        </div>
      ) : (
        <>
          <PostList
            postType="blog"
            baseUrl="/blog"
            localPosts={currentPage === 1 ? listData.localPosts : []}
            initialPosts={listData.posts}
            initialTotal={listData.total}
            serverTags={listData.tags as Tag[]}
            locale={locale}
            pageSize={SERVER_POST_PAGE_SIZE}
            showTagSelector={true}
            showCover={POST_CONFIGS.blog.showCoverInList}
            enableLoadMore={false}
            emptyMessage="No posts found for this tag."
          />
          <BlogPagination currentPage={currentPage} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
