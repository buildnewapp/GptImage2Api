import { getAiDemoAccessRedirect } from "@/lib/ai-studio/access";
import { isAdmin } from "@/lib/auth/server";
import { redirect } from "next/navigation";

type Params = Promise<{ locale: string }>;

export default async function ImageDemoPage({
  params,
}: {
  params: Params;
}) {
  const { locale } = await params;

  const redirectTo = getAiDemoAccessRedirect(await isAdmin());
  if (redirectTo) {
    redirect(redirectTo);
  }

  redirect(`/${locale}/ai-demo?category=image`);
}
