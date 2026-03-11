import { listPostsAction } from "@/actions/posts/posts";
import { AdminContentTabs } from "@/components/cms/AdminContentTabs";
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
    title: "Use Cases",
    description: "Manage SEO use case pages.",
    locale: locale as Locale,
    path: `/dashboard/use-cases`,
  });
}

export default async function AdminUseCasesPage() {
  const result = await listPostsAction({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    postType: "use_case",
  });

  if (!result.success) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold">Use Cases</h1>
        <p className="text-destructive">
          Failed to fetch use cases: {result.error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  const posts = result.data?.posts || [];
  const totalPosts = result.data?.count || 0;
  const pageCount = Math.ceil(totalPosts / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AdminContentTabs currentHref="/dashboard/use-cases" />
      <PostDataTable
        config={{
          postType: "use_case",
          columns,
          listAction: listPostsAction,
          createUrl: "/dashboard/use-cases/new",
          enableTags: true,
          searchPlaceholder: "Search use cases...",
        }}
        initialData={posts}
        initialPageCount={pageCount}
        pageSize={PAGE_SIZE}
        totalPosts={totalPosts}
      />
    </div>
  );
}
