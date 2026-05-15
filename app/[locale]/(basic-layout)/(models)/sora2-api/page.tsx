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
  docsHref: "/models/sora2.md",
  familyKey: "sora2",
  messageKey: "sora2",
  path: "/sora2-api",
  showcaseModelIds: [
    "video:sora2-text-to-video-standard",
    "video:sora2-image-to-video-standard",
    "video:sora2-text-to-video-stable",
    "video:sora2-image-to-video-stable",
    "video:sora2-pro-text-to-video",
    "video:sora2-pro-image-to-video",
    "video:sora2-pro-storyboard",
    "video:apimart-sora-2-pro",
    "video:apimart-sora-2-vip",
    "video:apimart-sora-2-preview",
    "video:apimart-sora-2-pro-preview",
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

export default async function Sora2Page({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
