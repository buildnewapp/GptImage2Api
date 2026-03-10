import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SystemEmailsForm } from "./SystemEmailsForm";

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
    namespace: "SystemEmails",
  });

  return constructMetadata({
    page: "System Emails",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/dashboard/system-emails",
  });
}

export default async function SystemEmailsPage() {
  return <SystemEmailsForm />;
}
