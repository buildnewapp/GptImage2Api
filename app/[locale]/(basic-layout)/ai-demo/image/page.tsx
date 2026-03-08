import { redirect } from "next/navigation";

type Params = Promise<{ locale: string }>;

export default async function ImageDemoPage({
  params,
}: {
  params: Params;
}) {
  const { locale } = await params;
  redirect(`/${locale}/ai-demo?category=image`);
}
