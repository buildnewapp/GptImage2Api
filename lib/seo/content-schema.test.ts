import assert from "node:assert/strict";
import test from "node:test";

import { basePostSchema } from "@/components/cms/post-config";
import {
  normalizeAlternativeMetadata,
  normalizeCompareMetadata,
  buildSeoBreadcrumbs,
  buildTemplatePromptBlocks,
  buildSeoCta,
  buildSeoEditorDefaults,
  buildRelatedSeoLinks,
  buildSeoMetadataFromEditorValues,
  buildFaqSchemaInput,
  buildSeoContentFallbacks,
  normalizeTemplateMetadata,
  normalizeUseCaseMetadata,
} from "@/lib/seo/content-schema";
import { postTypeEnum } from "@/lib/db/schema";

test("normalizes use case metadata with empty defaults for optional arrays", () => {
  const metadata = normalizeUseCaseMetadata({
    heroSubtitle: "Create polished marketing videos faster",
  });

  assert.equal(metadata.heroSubtitle, "Create polished marketing videos faster");
  assert.deepEqual(metadata.benefits, []);
  assert.deepEqual(metadata.steps, []);
  assert.deepEqual(metadata.faqs, []);
  assert.equal(metadata.ctaLabel, null);
  assert.equal(metadata.ctaHref, null);
});

test("normalizes template metadata while preserving prompt, variables, and examples", () => {
  const metadata = normalizeTemplateMetadata({
    prompt: "Generate a product video for {product_name}",
    variables: [
      {
        key: "product_name",
        label: "Product name",
        description: "Used in the opening shot",
      },
    ],
    exampleInput: "A portable espresso maker",
    exampleOutput: "A cinematic 20-second product video brief",
  });

  assert.equal(metadata.prompt, "Generate a product video for {product_name}");
  assert.deepEqual(metadata.variables, [
    {
      key: "product_name",
      label: "Product name",
      description: "Used in the opening shot",
    },
  ]);
  assert.equal(metadata.exampleInput, "A portable espresso maker");
  assert.equal(metadata.exampleOutput, "A cinematic 20-second product video brief");
});

test("strips unsupported metadata fields during normalization", () => {
  const metadata = normalizeUseCaseMetadata({
    heroSubtitle: "Sharpen landing page messaging",
    benefits: [{ title: "Faster copy", description: "Turn ideas into drafts" }],
    unsupportedField: "ignore-me",
  });

  assert.equal("unsupportedField" in metadata, false);
});

test("derives seo fallback fields from title and description", () => {
  const seo = buildSeoContentFallbacks({
    title: "AI Product Video Prompt Template",
    description: "Use this prompt template to generate stronger product demos.",
  });

  assert.equal(seo.seoTitle, "AI Product Video Prompt Template");
  assert.equal(
    seo.seoDescription,
    "Use this prompt template to generate stronger product demos.",
  );
});

test("does not build faq schema input when faq list is empty", () => {
  assert.equal(buildFaqSchemaInput([]), null);
});

test("filters invalid faq items before returning schema input", () => {
  const faq = buildFaqSchemaInput([
    { question: "How long should the prompt be?", answer: "Usually 1-3 sentences." },
    { question: "", answer: "Missing question" },
    { question: "Missing answer", answer: "" },
  ]);

  assert.deepEqual(faq, [
    { question: "How long should the prompt be?", answer: "Usually 1-3 sentences." },
  ]);
});

test("post types include use_case and template", () => {
  assert.equal(postTypeEnum.enumValues.includes("use_case"), true);
  assert.equal(postTypeEnum.enumValues.includes("template"), true);
  assert.equal(postTypeEnum.enumValues.includes("alternative"), true);
  assert.equal(postTypeEnum.enumValues.includes("compare"), true);
});

test("base post schema accepts metadataJsonb for seo content payloads", () => {
  const result = basePostSchema.safeParse({
    language: "en",
    title: "AI product video template",
    slug: "ai-product-video-template",
    content: "Use this template to create short product videos.",
    description: "Prompt template for short product videos.",
    featuredImageUrl: "",
    status: "published",
    visibility: "public",
    metadataJsonb: {
      prompt: "Create a product launch video for {product_name}",
      variables: [{ key: "product_name", label: "Product name" }],
    },
  });

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }
  assert.deepEqual(result.data.metadataJsonb, {
    prompt: "Create a product launch video for {product_name}",
    variables: [{ key: "product_name", label: "Product name" }],
  });
});

test("base post schema still allows legacy content without metadataJsonb", () => {
  const result = basePostSchema.safeParse({
    language: "en",
    title: "How to launch your first AI video",
    slug: "launch-your-first-ai-video",
    content: "Long-form blog content",
    description: "A walkthrough article",
    featuredImageUrl: "",
    status: "published",
    visibility: "public",
  });

  assert.equal(result.success, true);
});

test("builds use case editor defaults from metadata jsonb", () => {
  const defaults = buildSeoEditorDefaults("use_case", {
    heroSubtitle: "Make onboarding videos faster",
    benefits: [
      { title: "Save time", description: "Start from a proven layout" },
      { title: "Higher quality", description: null },
    ],
    faqs: [{ question: "Who is it for?", answer: "Solo founders." }],
    ctaLabel: "Try it free",
    ctaHref: "/pricing",
  });

  assert.equal(defaults.seoHeroSubtitle, "Make onboarding videos faster");
  assert.equal(
    defaults.seoBenefitsText,
    "Save time | Start from a proven layout\nHigher quality",
  );
  assert.equal(defaults.seoFaqsText, "Who is it for? | Solo founders.");
  assert.equal(defaults.seoCtaLabel, "Try it free");
  assert.equal(defaults.seoCtaHref, "/pricing");
});

test("builds template metadata jsonb from editor values", () => {
  const metadata = buildSeoMetadataFromEditorValues("template", {
    seoPrompt: "Create a launch video for {product_name}",
    seoVariablesText:
      "product_name | Product name | Mentioned in the hook\nbrand_style | Brand style",
    seoExampleInput: "Portable espresso maker",
    seoExampleOutput: "A 20-second cinematic launch video brief",
    seoTipsText: "Keep the hook under 10 words\nUse one camera move",
    seoFaqsText: "How many variables should I use? | Usually 1-3 variables.",
    seoCtaLabel: "Generate now",
    seoCtaHref: "/",
  });

  assert.deepEqual(metadata, {
    prompt: "Create a launch video for {product_name}",
    variables: [
      {
        key: "product_name",
        label: "Product name",
        description: "Mentioned in the hook",
      },
      {
        key: "brand_style",
        label: "Brand style",
        description: null,
      },
    ],
    exampleInput: "Portable espresso maker",
    exampleOutput: "A 20-second cinematic launch video brief",
    tips: ["Keep the hook under 10 words", "Use one camera move"],
    faqs: [
      {
        question: "How many variables should I use?",
        answer: "Usually 1-3 variables.",
      },
    ],
    ctaLabel: "Generate now",
    ctaHref: "/",
  });
});

test("builds blank template editor defaults without crashing", () => {
  const defaults = buildSeoEditorDefaults("template", null);

  assert.equal(defaults.seoPrompt, "");
  assert.equal(defaults.seoVariablesText, "");
  assert.equal(defaults.seoFaqsText, "");
});

test("normalizes alternative metadata with structured comparison fields", () => {
  const metadata = normalizeAlternativeMetadata({
    heroSubtitle: "Switch from Canva when you need stronger AI generation controls.",
    incumbentName: "Canva",
    bestFor: "Founders and marketers who need speed with stronger customization.",
    switchReasons: [
      {
        title: "More controllable outputs",
        description: "Tune prompts and output shape more precisely.",
      },
    ],
    advantages: [
      {
        title: "Built for AI-first workflows",
        description: "Less manual design setup before generation.",
      },
    ],
    limitations: [
      {
        title: "Smaller template ecosystem",
        description: "Less breadth than general-purpose design suites.",
      },
    ],
    faqs: [{ question: "Who should switch?", answer: "Teams focused on AI output quality." }],
    ctaLabel: "Try the alternative",
    ctaHref: "/#pricing",
  });

  assert.equal(metadata.incumbentName, "Canva");
  assert.equal(metadata.switchReasons.length, 1);
  assert.equal(metadata.advantages.length, 1);
  assert.equal(metadata.limitations.length, 1);
  assert.equal(metadata.ctaLabel, "Try the alternative");
});

test("normalizes compare metadata with comparison rows and scenario recommendations", () => {
  const metadata = normalizeCompareMetadata({
    heroSubtitle: "A practical head-to-head for AI image generation buyers.",
    leftProduct: "Midjourney",
    rightProduct: "Flux",
    verdict: "Choose Midjourney for aesthetics, Flux for control and flexibility.",
    comparisonRows: [
      {
        label: "Ease of use",
        leftValue: "High",
        rightValue: "Medium",
      },
    ],
    recommendedScenarios: [
      {
        title: "Best for design inspiration",
        description: "Midjourney usually produces stronger first-pass aesthetics.",
      },
    ],
    faqs: [{ question: "Which is better for teams?", answer: "Flux is often easier to adapt." }],
    ctaLabel: "Compare plans",
    ctaHref: "/#pricing",
  });

  assert.equal(metadata.leftProduct, "Midjourney");
  assert.equal(metadata.rightProduct, "Flux");
  assert.equal(metadata.comparisonRows.length, 1);
  assert.equal(metadata.recommendedScenarios.length, 1);
});

test("builds alternative metadata jsonb from editor values", () => {
  const metadata = buildSeoMetadataFromEditorValues("alternative", {
    seoHeroSubtitle: "A faster choice for AI-first marketers",
    seoTargetAudience: "Canva users who need more output control",
    seoBenefitsText:
      "More AI control | Tune output quality more directly\nFaster iteration | Less manual setup",
    seoStepsText:
      "Switch from Canva | Move prompt-driven workflows first\nAdopt core templates | Keep repeatable campaign assets",
    seoFaqsText: "Is it better than Canva? | It depends on whether AI control matters more than design breadth.",
    seoCtaLabel: "Try it now",
    seoCtaHref: "/#pricing",
  });

  assert.equal(metadata.incumbentName, null);
  assert.deepEqual(metadata.switchReasons, [
    {
      title: "More AI control",
      description: "Tune output quality more directly",
    },
    {
      title: "Faster iteration",
      description: "Less manual setup",
    },
  ]);
  assert.deepEqual(metadata.advantages, [
    {
      title: "Switch from Canva",
      description: "Move prompt-driven workflows first",
    },
    {
      title: "Adopt core templates",
      description: "Keep repeatable campaign assets",
    },
  ]);
});

test("builds compare metadata jsonb from editor values", () => {
  const metadata = buildSeoMetadataFromEditorValues("compare", {
    seoHeroSubtitle: "A practical comparison for AI image workflows",
    seoTargetAudience: "Visual creators comparing model choices",
    seoProblemSummary: "Midjourney vs Flux",
    seoBenefitsText: "Image quality | Midjourney\nControl | Flux",
    seoStepsText:
      "Best for inspiration | Midjourney has stronger default aesthetics\nBest for control | Flux is easier to tune",
    seoFaqsText: "Which one is easier? | Midjourney is easier for first outputs.",
    seoCtaLabel: "Start comparing",
    seoCtaHref: "/#pricing",
  });

  assert.equal(metadata.leftProduct, "Midjourney");
  assert.equal(metadata.rightProduct, "Flux");
  assert.equal(metadata.verdict, "Midjourney vs Flux");
  assert.deepEqual(metadata.comparisonRows, [
    {
      label: "Image quality",
      leftValue: "Midjourney",
      rightValue: null,
    },
    {
      label: "Control",
      leftValue: "Flux",
      rightValue: null,
    },
  ]);
});

test("builds localized breadcrumbs for seo detail pages", () => {
  const breadcrumbs = buildSeoBreadcrumbs({
    locale: "zh",
    listPath: "/use-cases",
    slug: "ai-product-videos",
    title: "AI Product Videos",
  });

  assert.deepEqual(breadcrumbs, [
    { label: "Home", href: "/zh" },
    { label: "List", href: "/zh/use-cases" },
    { label: "AI Product Videos", href: "/zh/use-cases/ai-product-videos" },
  ]);
});

test("builds related seo links safely when tags are missing", () => {
  const links = buildRelatedSeoLinks({
    basePath: "/use-cases",
    currentSlug: "current-item",
    posts: [
      {
        slug: "current-item",
        title: "Current",
        description: "Current item",
        tags: null,
      },
      {
        slug: "next-item",
        title: "Next",
        description: "Next item",
        tags: null,
      },
    ],
  });

  assert.deepEqual(links, [
    {
      href: "/use-cases/next-item",
      title: "Next",
      description: "Next item",
      tags: [],
    },
  ]);
});

test("builds template prompt blocks while preserving paragraph breaks", () => {
  const blocks = buildTemplatePromptBlocks(
    "Open with the product in use.\n\nThen show the transformation.\nClose with a CTA.",
  );

  assert.deepEqual(blocks, [
    "Open with the product in use.",
    "Then show the transformation.\nClose with a CTA.",
  ]);
});

test("uses fallback cta values when template metadata does not define them", () => {
  const cta = buildSeoCta(
    {
      ctaLabel: null,
      ctaHref: null,
    },
    {
      fallbackLabel: "Try this template",
      fallbackHref: "/",
    },
  );

  assert.deepEqual(cta, {
    label: "Try this template",
    href: "/",
  });
});
