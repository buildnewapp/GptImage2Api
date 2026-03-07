import { getReferralAdminOverview } from "@/actions/referrals/admin";
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
