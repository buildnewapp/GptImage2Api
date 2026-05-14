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
  familyKey: "grok-imagine",
  messageKey: "grokVideo",
  path: "/grok-video-api",
  showcaseModelIds: [
    "video:grok-imagine-text-to-video",
    "video:grok-imagine-image-to-video",
    "video:grok-imagine-video-upscale",
    "video:grok-imagine-video-extend",
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

export default async function GrokVideoApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
