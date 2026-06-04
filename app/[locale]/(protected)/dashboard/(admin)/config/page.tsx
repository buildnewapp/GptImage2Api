import { getAdminPartnerSnippetsAction } from "@/actions/partners/admin";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Locale } from "next-intl";
import ConfigAdminClient from "./ConfigAdminClient";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return constructMetadata({
    page: "Config",
    title: "配置管理",
    description: "后台站点配置管理",
    locale: locale as Locale,
    path: "/dashboard/config",
  });
}

export default async function ConfigPage() {
  const result = await getAdminPartnerSnippetsAction();

  return (
    <ConfigAdminClient
      initialItems={result.success ? result.data ?? [] : []}
      initialError={result.success ? null : result.error}
    />
  );
}
