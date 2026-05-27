import { getLocale, getTranslations } from "next-intl/server";

import type {
  VideoTemplateFaq,
  VideoTemplateHero,
  VideoTemplatePricing,
  VideoTemplateTestimonials,
} from "@/components/home/video/types";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import {
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo/jsonld";

interface TemplateJsonLdProps {
  templateName: string;
}

function normalizeOfferPrice(price: string) {
  const value = price.replace(/[^\d.]/g, "");
  return value || undefined;
}

export default async function TemplateJsonLd({
  templateName,
}: TemplateJsonLdProps) {
  const locale = await getLocale();
  const t = await getTranslations(templateName);
  const structuredData = await getTranslations("StructuredData");
  const hero = t.raw("hero") as VideoTemplateHero;
  const faq = t.raw("faq") as VideoTemplateFaq;
  const pricing = t.raw("pricing") as VideoTemplatePricing;
  const testimonials = t.raw("testimonials") as VideoTemplateTestimonials;
  const rating = structuredData.raw("rating") as {
    bestRating: string;
    count: string;
    value: string;
    worstRating: string;
  };
  const canonicalUrl = buildCanonicalUrl({
    locale,
    path: "/",
  });
  const pricingUrl = buildCanonicalUrl({
    locale,
    path: "/pricing",
  });
  const faqJsonLd = buildFaqJsonLd(faq.items);
  const offerSources = [
    ...(pricing.plans ?? []),
    ...(pricing.creditPacks ?? []),
  ];
  const offers = offerSources
    .map((offer) => {
      const price = normalizeOfferPrice(offer.price);
      if (!price) {
        return null;
      }

      return {
        name: "name" in offer ? offer.name : offer.title,
        price,
        priceCurrency: "USD",
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
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    ...(supportEmail ? { email: `mailto:${supportEmail}` } : {}),
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: canonicalUrl,
    inLanguage: locale,
    description: hero.description,
  };
  const softwareApplicationJsonLd = buildSoftwareApplicationJsonLd({
    name: `${hero.modelLabel} AI Video Generator`,
    description: hero.description,
    url: canonicalUrl,
    inLanguage: locale,
    logo: `${siteConfig.url}/logo.png`,
    offers,
    aggregateRating: {
      ratingValue: rating.value,
      ratingCount: rating.count,
      bestRating: rating.bestRating,
      worstRating: rating.worstRating,
    },
    reviews: testimonials.items.map((item) => ({
      authorName: item.name,
      reviewBody: item.quote,
      ratingValue: 5,
      bestRating: 5,
      worstRating: 1,
    })),
  });
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${hero.modelLabel} AI Video Generator`,
    description: hero.description,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    url: canonicalUrl,
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
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
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
