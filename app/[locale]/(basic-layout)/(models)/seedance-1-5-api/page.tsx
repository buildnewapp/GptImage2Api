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
  docsHref: "/models/seedance-1.5.md",
  familyKey: "seedance-1.5",
  messageKey: "seedance15",
  path: "/seedance-1-5-api",
  showcaseModelIds: ["video:bytedance-seedance-1-5-pro"],
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

export default async function Seedance15ApiPage({ params }: MetadataProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
