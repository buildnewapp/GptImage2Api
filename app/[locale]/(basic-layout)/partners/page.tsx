import { siteConfig } from "@/config/site";
import {
  cardHeadingClass,
  moduleCardClass,
  pageShellClass,
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

type PartnerHtmlSnippet = {
  key: string;
  html: string;
};

const partnerSnippets: PartnerHtmlSnippet[] = [
  {
    key: "product-hunt",
    html: `<a href="https://www.producthunt.com/" target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label="Visit Product Hunt" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:600;font-size:14px;line-height:1;"><img src="https://cdn.simpleicons.org/producthunt/da552f" alt="Product Hunt" width="20" height="20" /><span>Product Hunt</span></a>`,
  },
];

const panelClass =
  "mx-auto mt-10 max-w-5xl rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[0_28px_72px_-48px_rgba(148,163,184,0.36)] backdrop-blur-sm sm:p-8";

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Partners" });

  return constructMetadata({
    title: t("seo.title"),
    description: t("seo.description"),
    locale: locale as Locale,
    path: "/partners",
  });
}

export default async function PartnersPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Partners" });

  const guidelineItems = t.raw("content.guidelines.items") as string[];
  const noteItems = t.raw("content.notes.items") as string[];
  const contactItems = t.raw("content.contact.items") as string[];
  const supportEmail = siteConfig.socialLinks?.email || "support@sdanceai.com";

  const suggestedHtml = `<a href="${siteConfig.url}" title="${siteConfig.name}">${siteConfig.name}</a>`;

  return (
    <div className={pageShellClass}>
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className={cn(sectionKickerClass, "mb-6")}>
            <Sparkles className="h-4 w-4" />
            {t("hero.eyebrow")}
          </div>
          <h1 className={cn(sectionTitleClass, "mx-auto max-w-4xl")}>
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("hero.description")}
          </p>
        </div>

        <div className={panelClass}>
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.about.title")}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("content.about.paragraph1")}
              </p>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("content.about.paragraph2")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.submission.title")}
              </h2>
              <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
                <li>{t("content.submission.step1")}</li>
                <li>
                  {t("content.submission.step2Prefix")}{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    {supportEmail}
                  </a>{" "}
                  {t("content.submission.step2Suffix")}
                </li>
                <li>{t("content.submission.step3")}</li>
              </ol>
              <div className="overflow-x-auto rounded-2xl border border-border/70 bg-slate-950/95 p-4 text-sm text-slate-100">
                <pre>
                  <code>{suggestedHtml}</code>
                </pre>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.guidelines.title")}
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
                {guidelineItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.notes.title")}
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
                {noteItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.policy.title")}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("content.policy.description")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className={cn(cardHeadingClass, "text-[1.75rem]")}>
                {t("content.contact.title")}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("content.contact.introPrefix")}{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  {supportEmail}
                </a>{" "}
                {t("content.contact.introSuffix")}
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
                {contactItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("content.contact.replyNote")}
              </p>
            </section>
          </div>
        </div>

        <section className={panelClass}>
          <h2 className={cn(cardHeadingClass, "text-[1.95rem]")}>
            {t("partners.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
            {t("partners.description")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {partnerSnippets.map((snippet) => (
              <div
                key={snippet.key}
                className={cn(
                  moduleCardClass,
                  "min-h-[64px] min-w-[150px] cursor-default items-center justify-center rounded-2xl border px-4 py-3 shadow-sm transition-none hover:translate-y-0 hover:shadow-[0_28px_72px_-48px_rgba(148,163,184,0.36)]",
                )}
                dangerouslySetInnerHTML={{ __html: snippet.html }}
              />
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {t("partners.note")}
          </p>
        </section>
      </section>
    </div>
  );
}
