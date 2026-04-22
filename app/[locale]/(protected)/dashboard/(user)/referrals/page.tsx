import { referralConfig } from "@/config/referral";
import { getReferralDashboardData } from "@/actions/referrals/user";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ReferralsClient from "./ReferralsClient";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "DashboardUserReferrals",
  });

  return constructMetadata({
    page: "Referrals",
    title: t("meta.title"),
    description: t("meta.description"),
    locale: locale as Locale,
    path: "/dashboard/referrals",
  });
}

export default async function ReferralsPage() {
  if (!referralConfig.enabled) {
    redirect("/dashboard/settings");
  }

  const result = await getReferralDashboardData();
  if (!result.success || !result.data) {
    redirect("/dashboard/settings");
  }

  return <ReferralsClient data={result.data} />;
}
