import {
  ModelApiPage,
  generateModelApiPageMetadata,
  type ModelApiPageConfig,
} from "@/components/model-api/ModelApiPage";
import type { Metadata } from "next";

type Params = Promise<{ locale: string }>;
type PageProps = { params: Params };

export const revalidate = 300;

const config = {
  docsHref: "/models/seedance-2.5.md",
  familyKey: "seedance-2.5",
  messageKey: "seedance25",
  path: "/seedance-2-5-api",
  showcaseModelIds: ["video:bytedance-seedance-2-5"],
} satisfies ModelApiPageConfig;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return generateModelApiPageMetadata({ config, locale });
}

export default async function Seedance25ApiPage({ params }: PageProps) {
  const { locale } = await params;

  return <ModelApiPage config={config} locale={locale} />;
}
