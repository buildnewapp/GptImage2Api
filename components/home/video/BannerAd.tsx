import BannerAdClient, {
  type BannerAdItem,
} from "@/components/home/video/BannerAdClient";
import { getTranslations } from "next-intl/server";

export default async function BannerAd({ locale }: { locale: string }) {
  if (process.env.SHOW_BANNER_AD !== "true") {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "BannerAd" });
  const banners: BannerAdItem[] = [
    {
      id: "discount",
      href: t("discount.href"),
      title: t("discount.title"),
      badge: t("discount.badge"),
      description: t("discount.description"),
      cta: t("discount.cta"),
    },
    {
      id: "reddit",
      href: t("reddit.href"),
      title: t("reddit.title"),
      badge: t("reddit.badge"),
      description: t("reddit.description"),
      cta: t("reddit.cta"),
    },
  ];

  return <BannerAdClient banners={banners} closeLabel={t("closeLabel")} />;
}
