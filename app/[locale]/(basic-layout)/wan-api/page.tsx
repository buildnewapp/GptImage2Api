import {
  ModelApiPage,
  generateModelApiPageMetadata,
  type ModelApiPageConfig,
} from "@/components/model-api/ModelApiPage";
import type { Metadata } from "next";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

export const dynamic = "force-dynamic";

const config = {
  docsHref: "/apidoc",
  familyKey: "wan",
  messageKey: "wan",
  path: "/wan-api",
  showcaseModelIds: [
    "video:wan-2-7-text-to-video",
    "video:wan-2-7-image-to-video",
    "video:wan-2-7-video-edit",
    "video:wan-2-7-reference-to-video",
    "video:wan-2-6-text-to-video",
    "video:wan-2-6-image-to-video",
    "video:wan-2-6-video-to-video",
    "video:wan-2-5-text-to-video",
    "video:wan-2-5-image-to-video",
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

export default async function WanApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
