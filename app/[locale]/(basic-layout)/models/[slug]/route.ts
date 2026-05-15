import { buildModelMarkdownDocResponse } from "@/lib/apidoc/model-markdown-doc";

type Params = Promise<{ locale: string; slug: string }>;

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Params }) {
  const { locale, slug } = await context.params;

  return buildModelMarkdownDocResponse({
    locale,
    request,
    slug,
  });
}
