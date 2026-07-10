import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";
import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import modelMarkdownEn from "@/i18n/messages/en/ModelMarkdown.json";
import commonEn from "@/i18n/messages/en/common.json";
import modelMarkdownJa from "@/i18n/messages/ja/ModelMarkdown.json";
import commonJa from "@/i18n/messages/ja/common.json";
import modelMarkdownZh from "@/i18n/messages/zh/ModelMarkdown.json";
import commonZh from "@/i18n/messages/zh/common.json";
import {
  getCachedAiStudioCatalogDetail,
  normalizeModelHandle,
} from "@/lib/ai-studio/catalog";
import { toPublicDocDetail } from "@/lib/ai-studio/public";
import { NextResponse } from "next/server";

const copyByLocale = {
  en: modelMarkdownEn,
  zh: modelMarkdownZh,
  ja: modelMarkdownJa,
} as const;

const modelPricingCopyByLocale = {
  en: commonEn.VideoPricing.dynamic.modelPricing,
  zh: commonZh.VideoPricing.dynamic.modelPricing,
  ja: commonJa.VideoPricing.dynamic.modelPricing,
} as const;

type SupportedLocale = keyof typeof copyByLocale;

const supportedLocales = new Set<string>(Object.keys(copyByLocale));

function resolveLocale(locale: string): SupportedLocale {
  if (supportedLocales.has(locale)) {
    return locale as SupportedLocale;
  }

  return supportedLocales.has(DEFAULT_LOCALE) ? DEFAULT_LOCALE : "en";
}

function getCopy(locale: SupportedLocale) {
  return copyByLocale[locale] ?? copyByLocale.en;
}

function getModelPricingCopy(locale: SupportedLocale) {
  return modelPricingCopyByLocale[locale] ?? modelPricingCopyByLocale.en;
}

function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

function normalizeLoose(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeSlug(input: string) {
  return input.replace(/\.md$/i, "").replace(/-api$/i, "").trim();
}

function escapeTableCell(value: unknown) {
  return String(value ?? "-")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n+/g, "<br>")
    .trim();
}

function getSchemaType(schema: Record<string, any>) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }

  if (schema.type === "integer") {
    return "number";
  }

  if (schema.type === "array" && schema.items?.type) {
    return `${schema.items.type}[]`;
  }

  return typeof schema.type === "string" ? schema.type : "object";
}

function getDefaultValue(schema: Record<string, any>) {
  if (schema.default !== undefined) {
    return JSON.stringify(schema.default);
  }

  if (schema.examples?.[0] !== undefined) {
    return JSON.stringify(schema.examples[0]);
  }

  return "-";
}

function formatFieldRows(
  schema: Record<string, any> | null | undefined,
  copy: ReturnType<typeof getCopy>,
) {
  if (!schema?.properties || typeof schema.properties !== "object") {
    return copy.fieldsEmpty;
  }

  const required = new Set(
    Array.isArray(schema.required) ? schema.required.map(String) : [],
  );
  const rows = Object.entries(schema.properties as Record<string, any>).map(
    ([rawName, field]) => {
      const name = rawName.trim();
      const enumValues = Array.isArray(field.enum)
        ? field.enum.join(", ")
        : "-";

      return [
        `\`${escapeTableCell(name)}\``,
        escapeTableCell(getSchemaType(field)),
        required.has(rawName) || required.has(name) ? copy.yes : copy.no,
        `\`${escapeTableCell(getDefaultValue(field))}\``,
        escapeTableCell(enumValues),
        escapeTableCell(field.description ?? "-"),
      ].join(" | ");
    },
  );

  return [
    `| ${copy.field} | ${copy.type} | ${copy.required} | ${copy.defaultExample} | ${copy.options} | ${copy.description} |`,
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatPricingRows(
  rows: Array<{
    billingNote: string;
    creditPrice: string;
    model: string;
    spec: string;
    type: string;
  }>,
  copy: ReturnType<typeof getCopy>,
) {
  if (!rows.length) {
    return copy.pricingEmpty;
  }

  const visibleRows = rows.map((row) =>
    [
      escapeTableCell(row.model),
      escapeTableCell(row.type),
      escapeTableCell(row.spec),
      escapeTableCell(row.creditPrice),
      escapeTableCell(row.billingNote),
    ].join(" | "),
  );

  return [
    `| ${copy.model} | ${copy.type} | ${copy.spec} | ${copy.price} | ${copy.billing} |`,
    "| --- | --- | --- | --- | --- |",
    ...visibleRows.map((row) => `| ${row} |`),
  ].join("\n");
}

async function resolveDoc(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const looseSlug = normalizeLoose(normalizedSlug);

  const familyMatch = AI_VIDEO_STUDIO_FAMILIES.find((item) =>
    [item.key, item.label, normalizeModelHandle(item.key)].some(
      (candidate) => normalizeLoose(candidate) === looseSlug,
    ),
  );
  const allVersions = AI_VIDEO_STUDIO_FAMILIES.flatMap((family) =>
    family.versions.map((version) => ({ family, version })),
  );
  const versionMatch = familyMatch
    ? null
    : allVersions.find(({ version }) => {
        const publicHandle = normalizeModelHandle(version.modelId);

        return [
          version.key,
          version.modelId,
          publicHandle,
        ].some((candidate) => normalizeLoose(candidate) === looseSlug);
      });
  const family = familyMatch ?? versionMatch?.family;

  if (!family) {
    return null;
  }

  const versions = versionMatch ? [versionMatch.version] : family.versions;
  const details = (
    await Promise.all(
      versions.map(async (version) => {
        const detail = await getCachedAiStudioCatalogDetail(version.modelId);

        return detail
          ? {
              version,
              detail: toPublicDocDetail(detail),
            }
          : null;
      }),
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!details.length) {
    return null;
  }

  return {
    family,
    details,
  };
}

function buildMarkdown({
  origin,
  doc,
  locale,
}: {
  origin: string;
  doc: NonNullable<Awaited<ReturnType<typeof resolveDoc>>>;
  locale: SupportedLocale;
}) {
  const copy = getCopy(locale);
  const primary = doc.details[0];
  const primaryPayload = primary.detail.examplePayload ?? {};
  const executePayload = {
    modelId: primary.version.modelId,
    isPublic: true,
    payload: primaryPayload,
  };

  const modelRows = doc.details.map(({ version, detail }) =>
    [
      `\`${escapeTableCell(version.modelId)}\``,
      escapeTableCell(version.label),
      escapeTableCell(detail.provider),
      escapeTableCell(detail.modelKeys.join(", ")),
    ].join(" | "),
  );

  const fieldSections = doc.details
    .map(({ version, detail }) => {
      const rootFields = formatFieldRows(detail.requestSchema, copy);
      const inputFields = formatFieldRows(
        detail.requestSchema?.properties?.input,
        copy,
      );

      return [
        `### ${version.label}`,
        "",
        `#### ${copy.payloadFields}`,
        "",
        rootFields,
        "",
        `#### ${copy.inputFields}`,
        "",
        inputFields,
      ].join("\n");
    })
    .join("\n\n");

  const pricingRows = buildAiVideoModelPricingRows({
    copy: getModelPricingCopy(locale),
    familyKey: doc.family.key,
    locale,
  });

  const overviewBody = formatTemplate(copy.overviewBody, {
    model: doc.family.label,
  });
  const tagline = formatTemplate(copy.tagline, {
    model: doc.family.label,
  });

  return [
    `# ${doc.family.label} ${copy.apiDocumentation}`,
    "",
    `> ${tagline}`,
    "",
    `## ${copy.overview}`,
    "",
    overviewBody,
    "",
    `## ${copy.authentication}`,
    "",
    copy.authIntro,
    "",
    "```http",
    "Authorization: Bearer YOUR_API_KEY",
    "```",
    "",
    `## ${copy.availableModels}`,
    "",
    copy.modelsHeader,
    "| --- | --- | --- | --- |",
    ...modelRows.map((row) => `| ${row} |`),
    "",
    `## 1. ${copy.createTask}`,
    "",
    `### ${copy.createEndpointTitle}`,
    "",
    "```http",
    `POST ${origin}/api/ai-studio/execute`,
    "Content-Type: application/json",
    "Authorization: Bearer YOUR_API_KEY",
    "```",
    "",
    `### ${copy.requestExample}`,
    "",
    "```json",
    formatJson(executePayload),
    "```",
    "",
    `### ${copy.successResponse}`,
    "",
    "```json",
    formatJson({
      success: true,
      data: {
        modelId: primary.version.modelId,
        generationId: "generation-id",
        reservedCredits: 20,
        taskId: "provider-task-id",
        state: "queued",
      },
    }),
    "```",
    "",
    `## 2. ${copy.queryTask}`,
    "",
    `### ${copy.endpoint}`,
    "",
    "```http",
    `GET ${origin}/api/ai-studio/tasks/{taskId}`,
    "Authorization: Bearer YOUR_API_KEY",
    "```",
    "",
    `### ${copy.successResponse}`,
    "",
    "```json",
    formatJson({
      success: true,
      data: {
        generationId: "generation-id",
        taskId: "provider-task-id",
        modelId: primary.version.modelId,
        state: "succeeded",
        mediaUrls: ["https://example.com/result.mp4"],
        reservedCredits: 20,
        refundedCredits: 0,
      },
    }),
    "```",
    "",
    `## ${copy.requestFields}`,
    "",
    fieldSections,
    "",
    `## ${copy.pricing}`,
    "",
    copy.pricingIntro,
    "",
    formatPricingRows(pricingRows, copy),
    "",
    `## ${copy.commonErrors}`,
    "",
    `| ${copy.status} | ${copy.meaning} |`,
    "| --- | --- |",
    "| `400` | Invalid request payload |",
    "| `401` | Missing or invalid API key |",
    "| `402` | Insufficient credits or plan limit |",
    "| `404` | Model or task not found |",
    "| `429` | Rate limit exceeded |",
    "| `500` | Server error |",
    "",
  ].join("\n");
}

export async function buildModelMarkdownDocResponse({
  locale,
  request,
  slug,
}: {
  locale: string;
  request: Request;
  slug: string;
}) {
  const decodedSlug = decodeURIComponent(slug);
  const resolvedLocale = resolveLocale(locale);
  const copy = getCopy(resolvedLocale);

  if (!decodedSlug.toLowerCase().endsWith(".md")) {
    return NextResponse.json(
      { success: false, error: copy.errorMdOnly },
      { status: 404 },
    );
  }

  const doc = await resolveDoc(decodedSlug);
  if (!doc) {
    return NextResponse.json(
      { success: false, error: copy.errorDocNotFound },
      { status: 404 },
    );
  }

  const markdown = buildMarkdown({
    origin: new URL(request.url).origin,
    doc,
    locale: resolvedLocale,
  });

  return new NextResponse(markdown, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Content-Language": resolvedLocale,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
