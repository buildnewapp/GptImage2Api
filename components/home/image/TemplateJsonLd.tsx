import { getLocale, getTranslations } from "next-intl/server";

import type {
  VideoTemplateFaq,
  VideoTemplateHero,
  VideoTemplatePricing,
} from "@/components/home/video/types";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import {
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo/jsonld";

interface TemplateJsonLdProps {
  locale?: string;
  pricing: VideoTemplatePricing;
  templateName: string;
}

function normalizeOfferPrice(price: string) {
  const value = price.replace(/[^\d.]/g, "");
  return value || undefined;
}

export default async function TemplateJsonLd({
  locale: providedLocale,
  pricing,
  templateName,
}: TemplateJsonLdProps) {
  const locale = providedLocale ?? (await getLocale());
  const t = await getTranslations({ locale, namespace: templateName });
  const hero = t.raw("hero") as VideoTemplateHero;
  const faq = t.raw("faq") as VideoTemplateFaq;
  const rating = siteConfig.structuredData?.rating;
  const canonicalUrl = buildCanonicalUrl({
    locale,
    path: "/",
  });
  const pricingUrl = buildCanonicalUrl({
    locale,
    path: "/pricing",
  });
  const faqJsonLd = buildFaqJsonLd(faq.items);
  const recurringPlans = [
    ...(pricing.monthlyPlans ?? []),
    ...(pricing.yearlyPlans?.length ? pricing.yearlyPlans : pricing.plans),
  ];
  const offerSources = [
    ...recurringPlans,
    ...(pricing.creditPacks ?? []),
  ];
  const offers = offerSources
    .map((offer) => {
      const price = normalizeOfferPrice(offer.offerPrice ?? offer.price);
      const priceCurrency =
        offer.currency ?? siteConfig.structuredData?.priceCurrency;
      if (!price || !priceCurrency) {
        return null;
      }

      return {
        name: "name" in offer ? offer.name : offer.title,
        price,
        priceCurrency,
        url: pricingUrl,
      };
    })
    .filter((offer): offer is {
      name: string;
      price: string;
      priceCurrency: string;
      url: string;
    } => Boolean(offer));
  const socialLinks = Object.values(siteConfig.socialLinks ?? {}).filter(
    (value): value is string => typeof value === "string" && value.startsWith("http"),
  );
  const supportEmail = siteConfig.socialLinks?.email?.trim();
  const productName = siteConfig.name.trim() || hero.modelLabel;
  const productDescription = siteConfig.description?.trim() || hero.description;
  const configuredImage =
    siteConfig.structuredData?.image ??
    siteConfig.icons.apple ??
    siteConfig.icons.shortcut ??
    siteConfig.icons.icon;
  const productImage = configuredImage.startsWith("http")
    ? configuredImage
    : `${siteConfig.url}${configuredImage.startsWith("/") ? configuredImage : `/${configuredImage}`}`;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: productImage,
    ...(supportEmail ? { email: `mailto:${supportEmail}` } : {}),
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: canonicalUrl,
    inLanguage: locale,
    description: productDescription,
  };
  const softwareApplicationJsonLd = buildSoftwareApplicationJsonLd({
    name: productName,
    description: productDescription,
    url: canonicalUrl,
    inLanguage: locale,
    logo: productImage,
    applicationCategory:
      siteConfig.structuredData?.applicationCategory,
    operatingSystem: siteConfig.structuredData?.operatingSystem,
    offers,
    aggregateRating: rating
      ? {
          ratingValue: rating.value,
          ratingCount: rating.count,
          bestRating: rating.bestRating,
          worstRating: rating.worstRating,
        }
      : undefined,
  });
  const productJsonLd =
    offers.length > 0 || rating
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${canonicalUrl}#product`,
          name: productName,
          description: productDescription,
          image: productImage,
          brand: {
            "@type": "Brand",
            name: siteConfig.name,
          },
          url: canonicalUrl,
          ...(rating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: rating.value,
                  ratingCount: rating.count,
                  ...(rating.bestRating
                    ? { bestRating: rating.bestRating }
                    : {}),
                  ...(rating.worstRating
                    ? { worstRating: rating.worstRating }
                    : {}),
                },
              }
            : {}),
          ...(offers.length > 0
            ? {
                offers: offers.map((offer) => ({
                  "@type": "Offer",
                  name: offer.name,
                  price: offer.price,
                  priceCurrency: offer.priceCurrency,
                  url: offer.url,
                  availability: "https://schema.org/InStock",
                })),
              }
            : {}),
        }
      : null;

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
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd),
          }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      )}
    </>
  );
}
