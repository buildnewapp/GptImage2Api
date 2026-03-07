import { getReferralAdminOverview } from "@/actions/referrals/admin";
import { referralConfig } from "@/config/referral";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import ReferralsAdminClient from "./ReferralsAdminClient";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AdminReferrals",
  });

  return constructMetadata({
    page: "Admin Referrals",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/dashboard/referrals-admin",
  });
}

export default async function AdminReferralsPage() {
  if (!referralConfig.enabled) {
    const t = await getTranslations("AdminReferrals");

    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("disabled.description")}</p>
      </div>
    );
  }

  const result = await getReferralAdminOverview();

  if (!result.success || !result.data) {
    return (
      <p className="text-destructive">
        {result.success ? "Failed to load referral admin overview." : result.error}
      </p>
    );
  }

  return <ReferralsAdminClient initialOverview={result.data} />;
}
