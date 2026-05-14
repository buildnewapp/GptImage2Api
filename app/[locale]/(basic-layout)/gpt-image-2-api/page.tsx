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
  familyKey: "gpt-image-2",
  messageKey: "gptImage2",
  path: "/gpt-image-2-api",
  showcaseModelIds: [
    "image:gpt-image-2-text-to-image",
    "image:gpt-image-2-image-to-image",
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

export default async function GptImage2ApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
