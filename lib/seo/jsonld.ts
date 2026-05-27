import { FaqSchemaItem, SeoBreadcrumb } from "@/lib/seo/content-schema";

export type SoftwareApplicationOfferJsonLdInput = {
  name: string;
  price: string;
  priceCurrency: string;
  url: string;
};

export type SoftwareApplicationRatingJsonLdInput = {
  ratingValue: number | string;
  ratingCount: number | string;
  bestRating?: number | string;
  worstRating?: number | string;
};

export type SoftwareApplicationReviewJsonLdInput = {
  authorName: string;
  reviewBody: string;
  ratingValue: number | string;
  bestRating?: number | string;
  worstRating?: number | string;
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
  aggregateRating?: SoftwareApplicationRatingJsonLdInput;
  reviews?: SoftwareApplicationReviewJsonLdInput[];
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
  aggregateRating,
  reviews,
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
    ...(aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.ratingValue,
            ratingCount: aggregateRating.ratingCount,
            ...(aggregateRating.bestRating
              ? { bestRating: aggregateRating.bestRating }
              : {}),
            ...(aggregateRating.worstRating
              ? { worstRating: aggregateRating.worstRating }
              : {}),
          },
        }
      : {}),
    ...(reviews && reviews.length > 0
      ? {
          review: reviews.map((review) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: review.authorName,
            },
            reviewBody: review.reviewBody,
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.ratingValue,
              ...(review.bestRating ? { bestRating: review.bestRating } : {}),
              ...(review.worstRating
                ? { worstRating: review.worstRating }
                : {}),
            },
          })),
        }
      : {}),
  };
}
