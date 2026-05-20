import Seedance15Home from "@/components/home/Seedance15Home";
import HomeComponent from "@/components/home";
import HomeTemplate1 from "@/components/home/HomeTemplate1";
import SeedanceHome from "@/components/home/SeedanceHome";
import ImageTemplate from "@/components/home/image/ImageTemplate";
import ToolHomeComponent from "@/components/home/ToolHomeComponent";
import VideoTemplate from "@/components/home/video/VideoTemplate";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export const revalidate = 300;
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // return <Seedance15Home />;
  // return <SeedanceHome />;
  // return <HomeTemplate1 />;
  return <VideoTemplate />;
  // return <ImageTemplate />;
  // return <HomeComponent />;
  // return <ToolHomeComponent />;
}
