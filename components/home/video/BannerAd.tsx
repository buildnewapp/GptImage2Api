import BannerAdClient from "@/components/home/video/BannerAdClient";
import { getTranslations } from "next-intl/server";

export default async function BannerAd() {
  if (process.env.SHOW_BANNER_AD !== "true") {
    return null;
  }

  const t = await getTranslations("BannerAd");

  return (
    <BannerAdClient
      href={t("href")}
      title={t("title")}
      badge={t("badge")}
      description={t("description")}
      cta={t("cta")}
      closeLabel={t("closeLabel")}
    />
  );
}
