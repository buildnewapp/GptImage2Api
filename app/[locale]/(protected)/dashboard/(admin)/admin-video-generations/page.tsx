import { getAdminVideoGenerations } from "@/actions/video-generations/admin";
import { getTranslations } from "next-intl/server";
import { DataTable } from "./DataTable";

export async function generateMetadata() {
  const t = await getTranslations("AdminVideoGenerations");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdminVideoGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("AdminVideoGenerations");
  const page = Number(params.page) || 1;

  const data = await getAdminVideoGenerations({
    page,
    limit: 20,
    status: params.status,
    search: params.search,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <DataTable data={data} />
    </div>
  );
}
