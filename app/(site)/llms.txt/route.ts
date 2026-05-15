import { buildLlmsText } from "@/lib/seo/llms-content";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await buildLlmsText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
