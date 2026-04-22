import { getAdminApiKeys } from "@/actions/apikeys/admin";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import AdminApiKeysManager from "./AdminApiKeysManager";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
                                         params,
                                       }: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AdminApiKeys",
  });

  return constructMetadata({
    page: "Admin API Keys",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/dashboard/apikeys-admin`,
  });
}

export default async function AdminApiKeysPage() {
  const result = await getAdminApiKeys();

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  return <AdminApiKeysManager initialApiKeys={result.data?.apiKeys || []} />;
}
