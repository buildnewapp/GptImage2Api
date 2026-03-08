import { getAdminAiStudioGenerations } from "@/actions/ai-studio/admin";
import AiStudioAdminClient from "./AiStudioAdminClient";

export const metadata = {
  title: "AI Studio Admin",
  description: "Admin tools for AI Studio generations, credits, and refunds.",
};

export default async function AiStudioAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    category?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const data = await getAdminAiStudioGenerations({
    page,
    limit: 20,
    status: params.status,
    category: params.category,
    search: params.search,
  });

  return <AiStudioAdminClient initialData={data} />;
}
