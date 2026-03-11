import { PostEditorClient } from "@/components/cms/PostEditorClient";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Suspense } from "react";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return constructMetadata({
    title: "Create Alternative",
    description: "Create a new SEO alternative page.",
    locale: locale as Locale,
    path: `/dashboard/alternatives/new`,
  });
}

export default function CreateAlternativePage() {
  const r2PublicUrl = process.env.R2_PUBLIC_URL || "";

  return (
    <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin" />}>
      <PostEditorClient
        postType="alternative"
        mode="create"
        r2PublicUrl={r2PublicUrl}
      />
    </Suspense>
  );
}
