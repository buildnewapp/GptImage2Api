import { getLocale, getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { buildSoftwareApplicationJsonLd } from "@/lib/seo/jsonld";

type HomeJsonLdProps = {
  applicationCategory?: string;
  description: string;
  name: string;
};

type StructuredDataRating = {
  bestRating: string;
  count: string;
  value: string;
  worstRating: string;
};

export default async function HomeJsonLd({
  applicationCategory = "MultimediaApplication",
  description,
  name,
}: HomeJsonLdProps) {
  const locale = await getLocale();
  const t = await getTranslations("StructuredData");
  const canonicalUrl = buildCanonicalUrl({
    locale,
    path: "/",
  });
  const rating = t.raw("rating") as StructuredDataRating;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: canonicalUrl,
    inLanguage: locale,
    description,
  };
  const softwareApplicationJsonLd = buildSoftwareApplicationJsonLd({
    name,
    description,
    url: canonicalUrl,
    inLanguage: locale,
    logo: `${siteConfig.url}/logo.png`,
    applicationCategory,
    offers: [
      {
        name: t("offer.name"),
        price: "0",
        priceCurrency: "USD",
        url: canonicalUrl,
      },
    ],
    aggregateRating: {
      ratingValue: rating.value,
      ratingCount: rating.count,
      bestRating: rating.bestRating,
      worstRating: rating.worstRating,
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
    </>
  );
}
