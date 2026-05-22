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
  docsHref: "/models/kling.md",
  familyKey: "kling",
  messageKey: "kling",
  path: "/kling-api",
  showcaseModelIds: [
    "video:kling-3-0",
    "video:kling-3-0-motion-control",
    "video:kling-2-6-text-to-video",
    "video:kling-2-6-image-to-video",
    "video:kling-2-6-motion-control",
    "video:kling-v2-5-turbo-text-to-video-pro",
    "video:kling-v2-5-turbo-image-to-video-pro",
    "video:kling-v2-1-master-text-to-video",
    "video:kling-v2-1-master-image-to-video",
    "video:kling-v2-1-pro",
    "video:kling-v2-1-standard",
    "video:kling-ai-avatar-standard",
    "video:kling-ai-avatar-pro",
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

export default async function KlingPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
