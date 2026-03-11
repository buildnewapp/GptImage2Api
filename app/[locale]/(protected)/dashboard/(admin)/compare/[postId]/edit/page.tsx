import { PostEditorClient } from "@/components/cms/PostEditorClient";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Suspense } from "react";

type Params = Promise<{ locale: string; postId: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, postId } = await params;

  return constructMetadata({
    title: "Edit Compare Page",
    description: "Edit an SEO comparison page.",
    locale: locale as Locale,
    path: `/dashboard/compare/${postId}/edit`,
  });
}

export default async function EditComparePage({ params }: MetadataProps) {
  const r2PublicUrl = process.env.R2_PUBLIC_URL || "";
  const { postId } = await params;

  return (
    <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin" />}>
      <PostEditorClient
        postType="compare"
        mode="edit"
        r2PublicUrl={r2PublicUrl}
        postId={postId}
      />
    </Suspense>
  );
}
