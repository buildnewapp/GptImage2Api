import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import VideoTemplate from "@/components/home/video/VideoTemplate";
import type { VideoTemplatePage } from "@/components/home/video/types";
import { renderToStaticMarkup } from "react-dom/server";

const projectRoot = process.cwd();
const englishPage = JSON.parse(
  readFileSync(
    path.join(projectRoot, "i18n/messages/en/VideoTemplate.json"),
    "utf8",
  ),
) as VideoTemplatePage;

async function renderVideoTemplate() {
  return renderToStaticMarkup(await VideoTemplate());
}

test("renders the key Seedance 2.0 homepage sections and media urls", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /Direct Short-Form Video/);
  assert.match(html, /Transparent Pricing for the Current App/);
  assert.match(html, /Frequently Asked Questions/);
  assert.match(html, /Create Your First Clip Today/);
  assert.match(
    html,
    /https:\/\/cdn\.sdanceai\.com\/sdanceai\/sdance_videos\/4vr3llg33\.mp4/,
  );
});

test("routes video generate entries through the localized dashboard path", async () => {
  const html = await renderVideoTemplate();
  const ctaSource = readFileSync(
    path.join(projectRoot, "components/home/video/CTA.tsx"),
    "utf8",
  );
  const showcaseSource = readFileSync(
    path.join(projectRoot, "components/home/video/Showcase.tsx"),
    "utf8",
  );

  assert.match(html, /href="\/dashboard\/generate"/);
  assert.doesNotMatch(html, /href="\/generate"/);
  assert.match(ctaSource, /from "@\/i18n\/routing"/);
  assert.match(ctaSource, /<I18nLink/);
  assert.match(showcaseSource, /from "@\/i18n\/routing"/);
  assert.match(showcaseSource, /<I18nLink/);
});

test("renders hero video rotator controls for hero-1 through hero-4", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /data-video-hero-rotator/);
  assert.match(html, /Play hero background 1/);
  assert.match(html, /Play hero background 2/);
  assert.match(html, /Play hero background 3/);
  assert.match(html, /Play hero background 4/);
});

test("renders the hero ai video mini studio instead of static placeholder pills", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /data-ai-video-mini-studio/);
  assert.match(html, /data-ai-video-mini-studio-upload/);
  assert.match(html, /data-ai-video-mini-studio-model/);
  assert.match(html, /data-ai-video-mini-studio-aspect-ratio/);
  assert.match(html, /data-ai-video-mini-studio-resolution/);
  assert.match(html, /data-ai-video-mini-studio-price/);
  assert.match(html, /data-ai-video-mini-studio-submit/);
  assert.doesNotMatch(
    html,
    /role="combobox" aria-expanded="false" aria-autocomplete="none"/,
  );
});

test("renders showcase preview triggers for all six sample items", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /Open Camera &amp; Motion Replication preview/);
  assert.match(html, /Open Enhanced Fundamentals preview/);
  assert.match(html, /Open Brand Explainer Sequence preview/);
  assert.match(html, /Open Creative Templates &amp; Effects preview/);
  assert.match(html, /Open Creative Story Completion preview/);
  assert.match(html, /Open Video Extension preview/);
});

test("splits VideoTemplate into video section files", () => {
  const requiredFiles = [
    "components/home/video/VideoTemplate.tsx",
    "components/home/video/types.ts",
    "components/home/video/constants.ts",
    "components/home/video/Header.tsx",
    "components/home/video/HeaderLinks.tsx",
    "components/home/video/MobileMenu.tsx",
    "components/home/video/LocaleSwitcher.tsx",
    "components/home/video/ThemeToggle.tsx",
    "components/home/video/Hero.tsx",
    "components/home/video/Showcase.tsx",
    "components/home/video/Pricing.tsx",
    "components/home/video/FAQ.tsx",
    "components/home/video/CTA.tsx",
    "components/home/video/Media.tsx",
  ];

  for (const relativePath of requiredFiles) {
    assert.equal(
      existsSync(path.join(projectRoot, relativePath)),
      true,
      `Expected ${relativePath} to exist`,
    );
  }

  assert.equal(
    existsSync(path.join(projectRoot, "components/home/video/interactive.tsx")),
    false,
    "Expected components/home/video/interactive.tsx to be removed",
  );
});

test("ships localized VideoTemplate message files with core sections", () => {
  const localeFiles = [
    "i18n/messages/en/VideoTemplate.json",
    "i18n/messages/zh/VideoTemplate.json",
    "i18n/messages/ja/VideoTemplate.json",
  ];

  for (const relativePath of localeFiles) {
    assert.equal(
      existsSync(path.join(projectRoot, relativePath)),
      true,
      `Expected ${relativePath} to exist`,
    );
  }

  const englishMessages = JSON.parse(
    readFileSync(
      path.join(projectRoot, "i18n/messages/en/VideoTemplate.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;

  assert.equal("hero" in englishMessages, true);
  assert.equal("showcase" in englishMessages, true);
  assert.equal("pricing" in englishMessages, true);
  assert.equal("faq" in englishMessages, true);
  assert.equal("cta" in englishMessages, true);
  assert.equal("items" in englishPage.showcase, true);
  assert.equal("videos" in englishPage.showcase, false);
});

test("loads VideoTemplate copy through next-intl instead of manual locale loaders", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/home/video/VideoTemplate.tsx"),
    "utf8",
  );

  assert.match(source, /getTranslations/);
  assert.match(source, /getTranslations\("VideoTemplate"\)/);
  assert.doesNotMatch(source, /pageLoaders/);
  assert.doesNotMatch(source, /LOCALES\.includes/);
});

test("keeps the hero server-renderable by delegating the photo wall to a client motion component", () => {
  const heroSource = readFileSync(
    path.join(projectRoot, "components/home/video/Hero.tsx"),
    "utf8",
  );
  const heroPhotoWallSource = readFileSync(
    path.join(projectRoot, "components/home/video/HeroPhotoWall.tsx"),
    "utf8",
  );
  const globalStylesSource = readFileSync(
    path.join(projectRoot, "styles/globals.css"),
    "utf8",
  );

  assert.match(heroSource, /@\/components\/home\/video\/HeroPhotoWall/);
  assert.doesNotMatch(heroSource, /<style jsx>/);
  assert.match(heroPhotoWallSource, /^"use client";/);
  assert.match(heroPhotoWallSource, /from "framer-motion"/);
  assert.match(heroPhotoWallSource, /useMemo/);
  assert.match(heroPhotoWallSource, /useReducedMotion/);
  assert.doesNotMatch(heroPhotoWallSource, /whileHover/);
  assert.match(
    heroPhotoWallSource,
    /export const HERO_PHOTO_WALL_COLUMN_COUNT =/,
  );
  assert.match(
    heroPhotoWallSource,
    /export const HERO_PHOTO_WALL_CARD_VARIANTS =/,
  );
  assert.match(
    heroPhotoWallSource,
    /export const HERO_PHOTO_WALL_ITEMS_PER_COLUMN =/,
  );
  assert.doesNotMatch(globalStylesSource, /@keyframes image-hero-wall/);
});

test("extracts video header into dedicated components instead of inline nav markup", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/home/video/VideoTemplate.tsx"),
    "utf8",
  );

  assert.match(source, /@\/components\/home\/video\/Header/);
  assert.doesNotMatch(source, /<nav[\s>]/);
});

test("inlines Seedance landing styles instead of relying on semantic global class names", async () => {
  const html = await renderVideoTemplate();

  assert.doesNotMatch(
    html,
    /\b(?:brand-wordmark|feature-title|section-title|subsection-title|card-heading|faq-question-title|display-title|section-kicker|studio-panel|hero-mesh)\b/,
  );
});

test("renders FAQ as collapsed disclosures and keeps the primary CTA legible on white", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:=|>)/);
  assert.match(
    html,
    /class="[^"]*bg-white[^"]*text-slate-950[^"]*"[^>]*>Open Seedance 2\.0/,
  );
});

test("declares dark theme token overrides for the page shell", async () => {
  const html = await renderVideoTemplate();

  assert.match(html, /\[--card:0_0%_100%\]/);
  assert.match(html, /\[--border:216_22%_86%\]/);
  assert.match(html, /dark:\[--background:223_33%_9%\]/);
  assert.match(html, /dark:\[--foreground:214_34%_96%\]/);
  assert.match(html, /dark:\[--card:223_26%_18%\]/);
  assert.match(html, /dark:\[--border:220_16%_28%\]/);
  assert.match(
    html,
    /dark:bg-\[radial-gradient\(circle_at_top_left,hsl\(var\(--primary\)\/0\.18\),transparent_24%\)/,
  );
});

test("uses a consistent card shell for module backgrounds and shadows", async () => {
  const html = await renderVideoTemplate();

  const moduleShell =
    /border border-slate-200\/70 bg-white text-card-foreground shadow-\[0_28px_72px_-48px_rgba\(148,163,184,0\.36\)\] backdrop-blur-md dark:border-white\/10 dark:bg-\[hsl\(223_26%_18%\)\] dark:shadow-\[0_28px_72px_-44px_rgba\(2,8,23,0\.62\)\] group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-\[0_28px_58px_-42px_rgba\(148,163,184,0\.28\)\] dark:hover:shadow-\[0_28px_68px_-42px_rgba\(2,8,23,0\.72\)\]/g;

  assert.ok((html.match(moduleShell) ?? []).length >= 10);
  assert.doesNotMatch(html, /shadow-xl/);
  assert.doesNotMatch(
    html,
    /hover:shadow-\[0_24px_60px_-40px_rgba\(15,23,42,0\.5\)\]/,
  );
  assert.doesNotMatch(html, /transition-shadow/);
});

test("renders current scope mode cards with white-light and blue-black-dark icon surfaces", async () => {
  const html = await renderVideoTemplate();

  assert.match(
    html,
    /border-slate-200\/80 bg-slate-100\/85 shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.95\),0_14px_30px_-24px_rgba\(148,163,184,0\.34\)\] backdrop-blur-sm dark:border-white\/10 dark:bg-white\/\[0\.04\] dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.05\),0_16px_28px_-24px_rgba\(2,8,23,0\.8\)\]/,
  );
});

test("styles only the pricing toggle and CTA buttons to match the reference treatment", async () => {
  const html = await renderVideoTemplate();

  assert.match(
    html,
    /inline-flex items-center rounded-full border border-slate-200\/80 bg-white\/70 p-1\.5 shadow-\[0_18px_38px_-26px_rgba\(148,163,184,0\.4\)\] backdrop-blur-md dark:border-white\/10 dark:bg-white\/\[0\.03\] dark:shadow-\[0_18px_38px_-28px_rgba\(2,8,23,0\.7\)\]/,
  );
  assert.match(
    html,
    /bg-\[linear-gradient\(135deg,#1f2a44_0%,#253a64_100%\)\][^"]*px-8 py-3[^"]*text-white[^"]*shadow-\[0_16px_28px_-20px_rgba\(15,23,42,0\.45\)\][^"]*dark:bg-\[linear-gradient\(135deg,#274f90_0%,#3b82f6_100%\)\]/,
  );
  assert.match(
    html,
    /bg-\[linear-gradient\(135deg,#2f7df4_0%,#3b82f6_100%\)\][^"]*px-5 py-2[^"]*text-white[^"]*shadow-\[0_16px_30px_-20px_rgba\(59,130,246,0\.65\)\][^"]*dark:text-slate-950/,
  );
  assert.match(
    html,
    /bg-\[linear-gradient\(180deg,#dbe4f2_0%,#cfd9ea_100%\)\][^"]*text-slate-900[^"]*shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.85\),0_14px_30px_-24px_rgba\(148,163,184,0\.5\)\][^"]*dark:bg-\[linear-gradient\(180deg,#313a4d_0%,#2a3345_100%\)\][^"]*dark:text-white/,
  );
  assert.match(
    html,
    /bg-\[linear-gradient\(135deg,#1f2a44_0%,#253a64_100%\)\][^"]*text-white[^"]*shadow-\[0_18px_32px_-24px_rgba\(15,23,42,0\.55\)\][^"]*dark:bg-\[linear-gradient\(135deg,#223a69_0%,#274b87_100%\)\]/,
  );
});

test("keeps the Most Popular badge visible above the Pro pricing card", async () => {
  const html = await renderVideoTemplate();

  assert.match(
    html,
    /class="[^"]*overflow-visible[^"]*border-primary[^"]*"[^>]*>\s*<div class="absolute -top-4 left-1\/2 z-10 -translate-x-1\/2"/,
  );
});

test("reserves shared layout space for the fixed video header", () => {
  const source = readFileSync(
    path.join(projectRoot, "app/[locale]/(basic-layout)/layout.tsx"),
    "utf8",
  );

  assert.match(
    source,
    /<main className="flex-1 flex flex-col items-center pt-20">/,
  );
});

test("offsets the homepage back under the shared fixed header", () => {
  const pageSource = readFileSync(
    path.join(projectRoot, "app/[locale]/(basic-layout)/page.tsx"),
    "utf8",
  );
  const templateSource = readFileSync(
    path.join(projectRoot, "components/home/video/VideoTemplate.tsx"),
    "utf8",
  );

  assert.match(`${pageSource}\n${templateSource}`, /-mt-20 w-full/);
});

test("clips horizontal overflow at the homepage shell to avoid page-level sideways scrolling", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/home/video/VideoTemplate.tsx"),
    "utf8",
  );

  assert.match(source, /pageShellClass \+ " -mt-20 w-full overflow-x-hidden"/);
});

test("shares video theme tokens with HeaderShell when header is rendered outside VideoTemplate", () => {
  const constantsSource = readFileSync(
    path.join(projectRoot, "components/home/video/constants.ts"),
    "utf8",
  );
  const headerShellSource = readFileSync(
    path.join(projectRoot, "components/home/video/HeaderShell.tsx"),
    "utf8",
  );

  assert.match(constantsSource, /export const videoThemeVarsClass\s*=/);
  assert.match(
    constantsSource,
    /pageShellClass\s*=\s*`w-full \$\{videoThemeVarsClass\}[\s\S]*`;/,
  );
  assert.match(headerShellSource, /videoThemeVarsClass/);
  assert.match(
    headerShellSource,
    /className=\{cn\(\s*"fixed top-0 z-50 w-full/,
  );
});

test("recomputes video header overlay when the pathname changes", () => {
  const headerShellSource = readFileSync(
    path.join(projectRoot, "components/home/video/HeaderShell.tsx"),
    "utf8",
  );

  assert.match(headerShellSource, /usePathname/);
  assert.match(headerShellSource, /const pathname = usePathname\(\);/);
  assert.match(headerShellSource, /\}, \[pathname\]\);/);
});
