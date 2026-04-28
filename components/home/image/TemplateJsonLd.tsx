import { getLocale, getTranslations } from "next-intl/server";

import type {
  VideoTemplateFaq,
  VideoTemplateHero,
} from "@/components/home/video/types";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { buildFaqJsonLd } from "@/lib/seo/jsonld";

interface TemplateJsonLdProps {
  templateName: string;
}

export default async function TemplateJsonLd({
  templateName,
}: TemplateJsonLdProps) {
  const locale = await getLocale();
  const t = await getTranslations(templateName);
  const hero = t.raw("hero") as VideoTemplateHero;
  const faq = t.raw("faq") as VideoTemplateFaq;
  const canonicalUrl = buildCanonicalUrl({
    locale,
    path: "/",
  });
  const faqJsonLd = buildFaqJsonLd(faq.items);
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
