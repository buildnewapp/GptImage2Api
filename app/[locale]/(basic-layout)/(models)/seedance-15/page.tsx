import Seedance15Home from "@/components/home/Seedance15Home";

export default async function Seedance15Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <Seedance15Home locale={locale} />;
}
