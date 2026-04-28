import { siteConfig } from "@/config/site";
import { Link as I18nLink } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { FooterLink } from "@/types/common";
import { GithubIcon, InstagramIcon, MailIcon, Youtube } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { SiDiscord, SiTiktok } from "react-icons/si";

import { TwitterX } from "@/components/social-icons/icons";
import { studioPanelClass } from "@/components/home/video/constants";

export default async function VideoFooter() {
  const t = await getTranslations("Home");
  const tFooter = await getTranslations("Footer");
  const footerLinks = tFooter.raw("Links.groups") as FooterLink[];

  footerLinks.forEach((group) => {
    const pricingLink = group.links.find((link) => link.id === "pricing");
    if (pricingLink) {
      pricingLink.href = process.env.NEXT_PUBLIC_PRICING_PATH || pricingLink.href;
    }
  });

  const socialLinks = [
    {
      href: siteConfig.socialLinks?.github,
      label: "GitHub",
      icon: <GithubIcon className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: siteConfig.socialLinks?.twitter,
      label: "Twitter",
      icon: <TwitterX className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: siteConfig.socialLinks?.youtube,
      label: "YouTube",
      icon: <Youtube className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: siteConfig.socialLinks?.instagram,
      label: "Instagram",
      icon: <InstagramIcon className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: siteConfig.socialLinks?.tiktok,
      label: "TikTok",
      icon: <SiTiktok className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: siteConfig.socialLinks?.discord,
      label: "Discord",
      icon: <SiDiscord className="h-4 w-4" aria-hidden="true" />,
    },
  ].filter((item) => item.href);


  return (
    <footer className={`pt-8`}>
      <div className="container mx-auto px-4 pb-8">
        <div
          className={cn(
            studioPanelClass,
            "overflow-hidden rounded-[2.2rem] px-6 py-8 sm:px-8 sm:py-10"
          )}
        >
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]">
            <div className="space-y-4">
              <div data-aos="fade-up" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/75 bg-background/72">
                  <Image
                    src="/logo.png"
                    alt={t("title")}
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                </span>
                <span className="[font-family:var(--font-instrument-serif),serif] text-[clamp(1.38rem,1.18rem+0.62vw,1.56rem)] leading-[1.08] tracking-[-0.01em] text-foreground">
                  {t("title")}
                </span>
              </div>

              <p data-aos="fade-up" className="max-w-md text-sm leading-7 text-muted-foreground">
                {t("tagLine")}
              </p>


              <div data-aos="fade-up" className="flex flex-wrap gap-3">
                {socialLinks.length > 0 && socialLinks.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href!}
                        prefetch={false}
                        target="_blank"
                        rel="noreferrer nofollow noopener"
                        aria-label={item.label}
                        title={item.label}
                        className="group transition-transform hover:-translate-y-0.5"
                    >
                    <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-[1.05rem] border border-border/85 bg-[linear-gradient(145deg,hsl(var(--secondary)/0.14),hsl(var(--card))_92%)] text-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)] transition-transform group-hover:scale-[1.03]">
                      <span className="relative z-10">{item.icon}</span>
                    </span>
                    </Link>
                ))}
                {siteConfig.socialLinks?.email && (
                    <a
                        href={`mailto:${siteConfig.socialLinks.email}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary group transition-transform hover:-translate-y-0.5"
                    >
                      <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-[1.05rem] border border-border/85 bg-[linear-gradient(145deg,hsl(var(--secondary)/0.14),hsl(var(--card))_92%)] text-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)] transition-transform group-hover:scale-[1.03]">
                        <span className="relative z-10">
                          <MailIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </span>
                      {siteConfig.socialLinks.email}
                    </a>
                )}
              </div>
            </div>

            {footerLinks.map((section) => (
              <div data-aos="fade-up" key={section.title} className="space-y-4">
                <h3 className="text-lg text-foreground">{section.title}</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.href}`}>
                      {link.href.startsWith("/") && !link.useA ? (
                        <I18nLink
                          href={link.href}
                          title={link.name}
                          prefetch={false}
                          className="transition-colors hover:text-primary"
                          target={link.target || ""}
                          rel={link.rel || ""}
                        >
                          {link.name}
                        </I18nLink>
                      ) : (
                        <Link
                          href={link.href}
                          title={link.name}
                          prefetch={false}
                          className="transition-colors hover:text-primary"
                          target={link.target || ""}
                          rel={link.rel || ""}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>


          <div data-aos="fade-up" className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/70 pt-6 text-sm text-muted-foreground" />

          <div className="mt-6 flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              {tFooter("Copyright", {
                year: new Date().getFullYear(),
                name: siteConfig.name,
              })}
            </p>
            <div className="flex flex-wrap gap-5">
              <Link
                href="/privacy-policy"
                title={tFooter("PrivacyPolicy")}
                prefetch={false}
                className="transition-colors hover:text-primary"
              >
                {tFooter("PrivacyPolicy")}
              </Link>
              <Link
                href="/terms-of-service"
                title={tFooter("TermsOfService")}
                prefetch={false}
                className="transition-colors hover:text-primary"
              >
                {tFooter("TermsOfService")}
              </Link>
              <Link
                href="/refund-policy"
                title={tFooter("RefundPolicy")}
                prefetch={false}
                className="transition-colors hover:text-primary"
              >
                {tFooter("RefundPolicy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
