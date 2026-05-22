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
  docsHref: "/models/seedance-2.0.md",
  familyKey: "seedance-2.0",
  messageKey: "seedance2",
  path: "/seedance-2-0-api",
  showcaseModelIds: [
    "video:seedance-2-0-vip",
    "video:seedance-2-0-fast-vip",
    "video:seedance-2-0",
    "video:seedance-2-0-fast",
    "video:fal-seedance-2-0",
    "video:fal-seedance-2-0-fast",
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

export default async function Seedance20ApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
