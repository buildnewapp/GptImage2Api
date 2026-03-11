import { z } from "zod";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const nonEmptyTrimmedString = z.string().trim().min(1);

const benefitSchema = z.object({
  title: nonEmptyTrimmedString,
  description: z.string().trim().optional().nullable().transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  }),
});

const stepSchema = z.object({
  title: nonEmptyTrimmedString,
  description: z.string().trim().optional().nullable().transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  }),
});

const faqItemSchema = z.object({
  question: z.string().trim(),
  answer: z.string().trim(),
});

const promptVariableSchema = z.object({
  key: nonEmptyTrimmedString,
  label: nonEmptyTrimmedString,
  description: z.string().trim().optional().nullable().transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  }),
});

const nullableTrimmedString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const useCaseMetadataSchema = z.object({
  heroSubtitle: nullableTrimmedString,
  targetAudience: nullableTrimmedString,
  problemSummary: nullableTrimmedString,
  benefits: z.array(benefitSchema).optional().default([]),
  steps: z.array(stepSchema).optional().default([]),
  faqs: z.array(faqItemSchema).optional().default([]),
  ctaLabel: nullableTrimmedString,
  ctaHref: nullableTrimmedString,
});

const templateMetadataSchema = z.object({
  prompt: nonEmptyTrimmedString,
  variables: z.array(promptVariableSchema).optional().default([]),
  exampleInput: nullableTrimmedString,
  exampleOutput: nullableTrimmedString,
  tips: z.array(nonEmptyTrimmedString).optional().default([]),
  faqs: z.array(faqItemSchema).optional().default([]),
  ctaLabel: nullableTrimmedString,
  ctaHref: nullableTrimmedString,
});

const alternativeMetadataSchema = z.object({
  heroSubtitle: nullableTrimmedString,
  incumbentName: nullableTrimmedString,
  bestFor: nullableTrimmedString,
  switchReasons: z.array(benefitSchema).optional().default([]),
  advantages: z.array(benefitSchema).optional().default([]),
  limitations: z.array(benefitSchema).optional().default([]),
  faqs: z.array(faqItemSchema).optional().default([]),
  ctaLabel: nullableTrimmedString,
  ctaHref: nullableTrimmedString,
});

const comparisonRowSchema = z.object({
  label: nonEmptyTrimmedString,
  leftValue: nullableTrimmedString,
  rightValue: nullableTrimmedString,
});

const compareMetadataSchema = z.object({
  heroSubtitle: nullableTrimmedString,
  leftProduct: nullableTrimmedString,
  rightProduct: nullableTrimmedString,
  verdict: nullableTrimmedString,
  comparisonRows: z.array(comparisonRowSchema).optional().default([]),
  recommendedScenarios: z.array(stepSchema).optional().default([]),
  faqs: z.array(faqItemSchema).optional().default([]),
  ctaLabel: nullableTrimmedString,
  ctaHref: nullableTrimmedString,
});

export type UseCaseMetadata = z.infer<typeof useCaseMetadataSchema>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;
export type AlternativeMetadata = z.infer<typeof alternativeMetadataSchema>;
export type CompareMetadata = z.infer<typeof compareMetadataSchema>;
export type FaqSchemaItem = { question: string; answer: string };
export type SeoEditorPostType =
  | "use_case"
  | "template"
  | "alternative"
  | "compare";
export type SeoEditorValues = {
  seoHeroSubtitle?: string;
  seoTargetAudience?: string;
  seoProblemSummary?: string;
  seoBenefitsText?: string;
  seoStepsText?: string;
  seoFaqsText?: string;
  seoPrompt?: string;
  seoVariablesText?: string;
  seoExampleInput?: string;
  seoExampleOutput?: string;
  seoTipsText?: string;
  seoCtaLabel?: string;
  seoCtaHref?: string;
};
export type SeoBreadcrumb = { label: string; href: string };
export type RelatedSeoLink = {
  href: string;
  title: string;
  description: string | null;
  tags: string[];
};
export type SeoCta = {
  label: string;
  href: string;
};

export function normalizeUseCaseMetadata(input: unknown): UseCaseMetadata {
  return useCaseMetadataSchema.parse(input ?? {});
}

export function normalizeTemplateMetadata(input: unknown): TemplateMetadata {
  return templateMetadataSchema.parse(input);
}

export function normalizeAlternativeMetadata(input: unknown): AlternativeMetadata {
  return alternativeMetadataSchema.parse(input ?? {});
}

export function normalizeCompareMetadata(input: unknown): CompareMetadata {
  return compareMetadataSchema.parse(input ?? {});
}

export function buildSeoContentFallbacks(input: {
  title: string;
  description?: string | null;
}) {
  return {
    seoTitle: input.title.trim(),
    seoDescription: input.description?.trim() || null,
  };
}

export function buildFaqSchemaInput(
  faqItems: Array<{ question: string; answer: string }> | null | undefined,
): FaqSchemaItem[] | null {
  if (!faqItems || faqItems.length === 0) {
    return null;
  }

  const normalized = faqItems
    .map((item) => faqItemSchema.parse(item))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);

  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

function splitMultilineText(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinTitleDescriptionLines(
  items: Array<{ title: string; description: string | null }>,
) {
  return items
    .map((item) =>
      item.description ? `${item.title} | ${item.description}` : item.title,
    )
    .join("\n");
}

function joinFaqLines(items: Array<{ question: string; answer: string }>) {
  return items.map((item) => `${item.question} | ${item.answer}`).join("\n");
}

function parseTitleDescriptionLines(value?: string) {
  return splitMultilineText(value)
    .map((line) => {
      const [title, ...descriptionParts] = line.split("|");
      const normalizedTitle = title?.trim() ?? "";
      const description = descriptionParts.join("|").trim();

      if (!normalizedTitle) {
        return null;
      }

      return {
        title: normalizedTitle,
        description: description || null,
      };
    })
    .filter((item): item is { title: string; description: string | null } =>
      Boolean(item),
    );
}

function parseFaqLines(value?: string) {
  return splitMultilineText(value)
    .map((line) => {
      const [question, ...answerParts] = line.split("|");
      const normalizedQuestion = question?.trim() ?? "";
      const answer = answerParts.join("|").trim();

      if (!normalizedQuestion || !answer) {
        return null;
      }

      return {
        question: normalizedQuestion,
        answer,
      };
    })
    .filter((item): item is { question: string; answer: string } =>
      Boolean(item),
    );
}

function parseVariableLines(value?: string) {
  return splitMultilineText(value)
    .map((line) => {
      const [key, label, ...descriptionParts] = line.split("|");
      const normalizedKey = key?.trim() ?? "";
      const normalizedLabel = label?.trim() ?? "";
      const description = descriptionParts.join("|").trim();

      if (!normalizedKey || !normalizedLabel) {
        return null;
      }

      return {
        key: normalizedKey,
        label: normalizedLabel,
        description: description || null,
      };
    })
    .filter(
      (
        item,
      ): item is { key: string; label: string; description: string | null } =>
        Boolean(item),
    );
}

function parseComparisonRowsText(value?: string) {
  return splitMultilineText(value)
    .map((line) => {
      const [label, leftValue, ...rightValueParts] = line.split("|");
      const normalizedLabel = label?.trim() ?? "";
      const normalizedLeftValue = leftValue?.trim() ?? "";
      const rightValue = rightValueParts.join("|").trim();

      if (!normalizedLabel || !normalizedLeftValue) {
        return null;
      }

      return {
        label: normalizedLabel,
        leftValue: normalizedLeftValue,
        rightValue: rightValue || null,
      };
    })
    .filter(
      (
        item,
      ): item is { label: string; leftValue: string; rightValue: string | null } =>
        Boolean(item),
    );
}

function deriveCompareProducts(value?: string | null) {
  const normalized = value?.trim() ?? "";
  const match = normalized.match(/^(.+?)\s+vs\s+(.+)$/i);

  if (!match) {
    return {
      leftProduct: null,
      rightProduct: null,
    };
  }

  return {
    leftProduct: match[1]?.trim() || null,
    rightProduct: match[2]?.trim() || null,
  };
}

export function buildSeoEditorDefaults(
  postType: "use_case",
  metadataJsonb: unknown,
): Required<SeoEditorValues>;
export function buildSeoEditorDefaults(
  postType: "template",
  metadataJsonb: unknown,
): Required<SeoEditorValues>;
export function buildSeoEditorDefaults(
  postType: "alternative",
  metadataJsonb: unknown,
): Required<SeoEditorValues>;
export function buildSeoEditorDefaults(
  postType: "compare",
  metadataJsonb: unknown,
): Required<SeoEditorValues>;
export function buildSeoEditorDefaults(
  postType: SeoEditorPostType,
  metadataJsonb: unknown,
): Required<SeoEditorValues>;
export function buildSeoEditorDefaults(
  postType: SeoEditorPostType,
  metadataJsonb: unknown,
): Required<SeoEditorValues> {
  const defaults: Required<SeoEditorValues> = {
    seoHeroSubtitle: "",
    seoTargetAudience: "",
    seoProblemSummary: "",
    seoBenefitsText: "",
    seoStepsText: "",
    seoFaqsText: "",
    seoPrompt: "",
    seoVariablesText: "",
    seoExampleInput: "",
    seoExampleOutput: "",
    seoTipsText: "",
    seoCtaLabel: "",
    seoCtaHref: "",
  };

  if (postType === "use_case") {
    const metadata = normalizeUseCaseMetadata(metadataJsonb ?? {});

    return {
      ...defaults,
      seoHeroSubtitle: metadata.heroSubtitle ?? "",
      seoTargetAudience: metadata.targetAudience ?? "",
      seoProblemSummary: metadata.problemSummary ?? "",
      seoBenefitsText: joinTitleDescriptionLines(metadata.benefits),
      seoStepsText: joinTitleDescriptionLines(metadata.steps),
      seoFaqsText: joinFaqLines(metadata.faqs),
      seoCtaLabel: metadata.ctaLabel ?? "",
      seoCtaHref: metadata.ctaHref ?? "",
    };
  }

  if (postType === "alternative") {
    const metadata = normalizeAlternativeMetadata(metadataJsonb ?? {});

    return {
      ...defaults,
      seoHeroSubtitle: metadata.heroSubtitle ?? "",
      seoTargetAudience: metadata.bestFor ?? "",
      seoProblemSummary: metadata.incumbentName ?? "",
      seoBenefitsText: joinTitleDescriptionLines(metadata.switchReasons),
      seoStepsText: joinTitleDescriptionLines(metadata.advantages),
      seoFaqsText: joinFaqLines(metadata.faqs),
      seoCtaLabel: metadata.ctaLabel ?? "",
      seoCtaHref: metadata.ctaHref ?? "",
    };
  }

  if (postType === "compare") {
    const metadata = normalizeCompareMetadata(metadataJsonb ?? {});

    return {
      ...defaults,
      seoHeroSubtitle: metadata.heroSubtitle ?? "",
      seoTargetAudience:
        metadata.leftProduct && metadata.rightProduct
          ? `${metadata.leftProduct} vs ${metadata.rightProduct}`
          : "",
      seoProblemSummary: metadata.verdict ?? "",
      seoBenefitsText: metadata.comparisonRows
        .map((item) =>
          item.rightValue
            ? `${item.label} | ${item.leftValue ?? ""} | ${item.rightValue}`
            : `${item.label} | ${item.leftValue ?? ""}`,
        )
        .join("\n"),
      seoStepsText: joinTitleDescriptionLines(metadata.recommendedScenarios),
      seoFaqsText: joinFaqLines(metadata.faqs),
      seoCtaLabel: metadata.ctaLabel ?? "",
      seoCtaHref: metadata.ctaHref ?? "",
    };
  }

  const parsedTemplateMetadata = templateMetadataSchema.safeParse(metadataJsonb);
  const metadata = parsedTemplateMetadata.success
    ? parsedTemplateMetadata.data
    : {
        prompt: "",
        variables: [],
        exampleInput: null,
        exampleOutput: null,
        tips: [],
        faqs: [],
        ctaLabel: null,
        ctaHref: null,
      };

  return {
    ...defaults,
    seoPrompt: metadata.prompt,
    seoVariablesText: metadata.variables
      .map((item) =>
        item.description
          ? `${item.key} | ${item.label} | ${item.description}`
          : `${item.key} | ${item.label}`,
      )
      .join("\n"),
    seoExampleInput: metadata.exampleInput ?? "",
    seoExampleOutput: metadata.exampleOutput ?? "",
    seoTipsText: metadata.tips.join("\n"),
    seoFaqsText: joinFaqLines(metadata.faqs),
    seoCtaLabel: metadata.ctaLabel ?? "",
    seoCtaHref: metadata.ctaHref ?? "",
  };
}

export function buildSeoMetadataFromEditorValues(
  postType: "use_case",
  values: SeoEditorValues,
): UseCaseMetadata;
export function buildSeoMetadataFromEditorValues(
  postType: "template",
  values: SeoEditorValues,
): TemplateMetadata;
export function buildSeoMetadataFromEditorValues(
  postType: "alternative",
  values: SeoEditorValues,
): AlternativeMetadata;
export function buildSeoMetadataFromEditorValues(
  postType: "compare",
  values: SeoEditorValues,
): CompareMetadata;
export function buildSeoMetadataFromEditorValues(
  postType: SeoEditorPostType,
  values: SeoEditorValues,
): UseCaseMetadata | TemplateMetadata | AlternativeMetadata | CompareMetadata;
export function buildSeoMetadataFromEditorValues(
  postType: SeoEditorPostType,
  values: SeoEditorValues,
) {
  if (postType === "use_case") {
    return normalizeUseCaseMetadata({
      heroSubtitle: values.seoHeroSubtitle,
      targetAudience: values.seoTargetAudience,
      problemSummary: values.seoProblemSummary,
      benefits: parseTitleDescriptionLines(values.seoBenefitsText),
      steps: parseTitleDescriptionLines(values.seoStepsText),
      faqs: parseFaqLines(values.seoFaqsText),
      ctaLabel: values.seoCtaLabel,
      ctaHref: values.seoCtaHref,
    });
  }

  if (postType === "alternative") {
    return normalizeAlternativeMetadata({
      heroSubtitle: values.seoHeroSubtitle,
      incumbentName: values.seoProblemSummary,
      bestFor: values.seoTargetAudience,
      switchReasons: parseTitleDescriptionLines(values.seoBenefitsText),
      advantages: parseTitleDescriptionLines(values.seoStepsText),
      limitations: [],
      faqs: parseFaqLines(values.seoFaqsText),
      ctaLabel: values.seoCtaLabel,
      ctaHref: values.seoCtaHref,
    });
  }

  if (postType === "compare") {
    const productNames = deriveCompareProducts(values.seoProblemSummary);
    const comparisonRows = parseComparisonRowsText(values.seoBenefitsText);

    return normalizeCompareMetadata({
      heroSubtitle: values.seoHeroSubtitle,
      leftProduct: productNames.leftProduct,
      rightProduct: productNames.rightProduct,
      verdict: values.seoProblemSummary,
      comparisonRows,
      recommendedScenarios: parseTitleDescriptionLines(values.seoStepsText),
      faqs: parseFaqLines(values.seoFaqsText),
      ctaLabel: values.seoCtaLabel,
      ctaHref: values.seoCtaHref,
    });
  }

  return normalizeTemplateMetadata({
    prompt: values.seoPrompt,
    variables: parseVariableLines(values.seoVariablesText),
    exampleInput: values.seoExampleInput,
    exampleOutput: values.seoExampleOutput,
    tips: splitMultilineText(values.seoTipsText),
    faqs: parseFaqLines(values.seoFaqsText),
    ctaLabel: values.seoCtaLabel,
    ctaHref: values.seoCtaHref,
  });
}

export function buildSeoBreadcrumbs(input: {
  locale: string;
  listPath: string;
  slug: string;
  title: string;
}): SeoBreadcrumb[] {
  const localePrefix = input.locale === DEFAULT_LOCALE ? "" : `/${input.locale}`;
  const normalizedListPath = input.listPath.startsWith("/")
    ? input.listPath
    : `/${input.listPath}`;
  const detailPath = `${normalizedListPath}/${input.slug}`.replace(/\/+/g, "/");

  return [
    { label: "Home", href: `${localePrefix || "/"}`.replace(/\/+/g, "/") },
    { label: "List", href: `${localePrefix}${normalizedListPath}` },
    { label: input.title, href: `${localePrefix}${detailPath}` },
  ];
}

export function buildRelatedSeoLinks(input: {
  basePath: string;
  currentSlug: string;
  posts: Array<{
    slug: string;
    title: string;
    description?: string | null;
    tags?: string | null;
  }>;
}): RelatedSeoLink[] {
  return input.posts
    .filter((post) => post.slug !== input.currentSlug)
    .slice(0, 3)
    .map((post) => ({
      href: `${input.basePath}/${post.slug}`.replace(/\/+/g, "/"),
      title: post.title,
      description: post.description ?? null,
      tags: post.tags
        ? post.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    }));
}

export function buildTemplatePromptBlocks(prompt: string): string[] {
  return prompt
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function buildSeoCta(
  metadata: {
    ctaLabel?: string | null;
    ctaHref?: string | null;
  },
  fallback: {
    fallbackLabel: string;
    fallbackHref: string;
  },
): SeoCta {
  return {
    label: metadata.ctaLabel || fallback.fallbackLabel,
    href: metadata.ctaHref || fallback.fallbackHref,
  };
}
