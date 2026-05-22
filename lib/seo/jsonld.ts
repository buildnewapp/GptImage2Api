import { FaqSchemaItem, SeoBreadcrumb } from "@/lib/seo/content-schema";

export type SoftwareApplicationOfferJsonLdInput = {
  name: string;
  price: string;
  priceCurrency: string;
  url: string;
};

export type SoftwareApplicationJsonLdInput = {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  logo?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: SoftwareApplicationOfferJsonLdInput[];
};

export function buildBreadcrumbJsonLd(items: SeoBreadcrumb[]) {
  if (items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href,
    })),
  };
}

export function buildFaqJsonLd(items: FaqSchemaItem[] | null | undefined) {
  if (!items || items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildSoftwareApplicationJsonLd({
  name,
  description,
  url,
  inLanguage,
  logo,
  applicationCategory = "MultimediaApplication",
  operatingSystem = "Web",
  offers,
}: SoftwareApplicationJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    inLanguage,
    ...(logo ? { image: logo } : {}),
    applicationCategory,
    operatingSystem,
    ...(offers && offers.length > 0
      ? {
          offers: offers.map((offer) => ({
            "@type": "Offer",
            name: offer.name,
            price: offer.price,
            priceCurrency: offer.priceCurrency,
            url: offer.url,
          })),
        }
      : {}),
  };
}
