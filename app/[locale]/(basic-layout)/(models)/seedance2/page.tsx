import SeedanceHome from "@/components/home/SeedanceHome";

export default async function Seedance2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <SeedanceHome locale={locale} />;
}
