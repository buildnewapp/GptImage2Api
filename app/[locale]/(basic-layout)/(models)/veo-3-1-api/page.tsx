import {
  ModelApiPage,
  generateModelApiPageMetadata,
  type ModelApiPageConfig,
} from "@/components/model-api/ModelApiPage";
import type { Metadata } from "next";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

export const revalidate = 300;

const config = {
  docsHref: "/models/veo-3.1.md",
  familyKey: "veo-3.1",
  messageKey: "veo31",
  path: "/veo-3-1-api",
  showcaseModelIds: [
    "video:veo-3.1-lite",
    "video:veo-3.1-fast",
    "video:veo-3.1-quality",
    "video:extend-veo3-1-video",
    "video:get-veo3-1-1080p-video",
    "video:get-veo3-1-4k-video",
  ],
} satisfies ModelApiPageConfig;

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return generateModelApiPageMetadata({
    config,
    locale,
  });
}

export default async function Veo31ApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
