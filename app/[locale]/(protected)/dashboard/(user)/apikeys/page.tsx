import { getMyApiKeys } from "@/actions/apikeys/user";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import ApiKeysManager from "./ApiKeysManager";

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
    namespace: "ApiKeys",
  });

  return constructMetadata({
    page: "API Keys",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/dashboard/apikeys`,
  });
}

export default async function ApiKeysPage() {
  const result = await getMyApiKeys();

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  return <ApiKeysManager initialApiKeys={result.data?.apiKeys || []} />;
}
