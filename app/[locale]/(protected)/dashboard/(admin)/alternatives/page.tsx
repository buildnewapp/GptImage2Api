import { listPostsAction } from "@/actions/posts/posts";
import { PostDataTable } from "@/components/cms/PostDataTable";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { columns } from "./Columns";

const PAGE_SIZE = 20;

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return constructMetadata({
    title: "Alternatives",
    description: "Manage SEO alternative pages.",
    locale: locale as Locale,
    path: `/dashboard/alternatives`,
  });
}

export default async function AdminAlternativesPage() {
  const result = await listPostsAction({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    postType: "alternative",
  });

  if (!result.success) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold">Alternatives</h1>
        <p className="text-destructive">
          Failed to fetch alternatives: {result.error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  const posts = result.data?.posts || [];
  const totalPosts = result.data?.count || 0;
  const pageCount = Math.ceil(totalPosts / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PostDataTable
        config={{
          postType: "alternative",
          columns,
          listAction: listPostsAction,
          createUrl: "/dashboard/alternatives/new",
          enableTags: true,
          searchPlaceholder: "Search alternatives...",
        }}
        initialData={posts}
        initialPageCount={pageCount}
        pageSize={PAGE_SIZE}
        totalPosts={totalPosts}
      />
    </div>
  );
}
