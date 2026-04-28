import { getPromptGalleryAdminData } from "@/actions/prompts/admin";
import PromptGalleryAdminClient from "./PromptGalleryAdminClient";

const PAGE_SIZE = 20;

export const metadata = {
  title: "Prompt Gallery Admin",
  description: "Manage prompt gallery records.",
};

export default async function PromptGalleryAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const result = await getPromptGalleryAdminData({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  if (!result.success || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Prompt Gallery</h1>
        <p className="text-destructive">
          {result.success
            ? "Failed to load prompt gallery data."
            : result.error}
        </p>
      </div>
    );
  }

  return (
    <PromptGalleryAdminClient
      initialData={result.data}
      locale={locale}
      pageSize={PAGE_SIZE}
    />
  );
}
