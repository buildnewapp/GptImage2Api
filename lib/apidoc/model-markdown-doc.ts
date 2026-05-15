import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";
import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import {
  getCachedAiStudioCatalogDetail,
  normalizeModelHandle,
} from "@/lib/ai-studio/catalog";
import { toPublicDocDetail } from "@/lib/ai-studio/public";
import { NextResponse } from "next/server";

type SupportedLocale = "en" | "zh" | "ja";

const supportedLocales = new Set<string>(["en", "zh", "ja"]);

const copyByLocale = {
  en: {
    apiDocumentation: "API Documentation",
    authentication: "Authentication",
    authIntro: "All requests require an API key in the `Authorization` header.",
    availableModels: "Available models",
    billing: "Billing",
    commonErrors: "Common errors",
    contentType: "Content-Type",
    createEndpointTitle: "Endpoint",
    createTask: "Create generation task",
    defaultExample: "Default / Example",
    description: "Description",
    endpoint: "Endpoint",
    errorDocNotFound: "API doc not found.",
    errorMdOnly: "Only .md API docs are supported.",
    field: "Field",
    fieldsEmpty: "_No fields are configured for this model._",
    inputFields: "Input fields",
    meaning: "Meaning",
    model: "Model",
    modelsHeader: "| modelId | Version | Provider | Runtime model |",
    no: "No",
    options: "Options",
    overview: "Overview",
    overviewBody: (model: string) =>
      `Use the AI Studio API to create ${model} generation tasks and query their status. The flow is asynchronous: create a task first, then poll the task endpoint with the returned \`taskId\`.`,
    payloadFields: "Payload fields",
    price: "Price",
    pricing: "Pricing",
    pricingEmpty: "_No pricing rows are configured for this model._",
    pricingIntro:
      "Credits are reserved when a generation task is created. The `reservedCredits` value in the create-task response is the final amount reserved for that request.",
    queryTask: "Query task status",
    requestExample: "Request example",
    requestFields: "Request fields",
    required: "Required",
    spec: "Spec",
    status: "Status",
    successResponse: "Success response",
    tagline: (model: string) =>
      `Generate videos with the ${model} model through the AI Studio API.`,
    type: "Type",
    yes: "Yes",
  },
  zh: {
    apiDocumentation: "API 文档",
    authentication: "认证方式",
    authIntro: "所有请求都需要在 `Authorization` 请求头中携带 API Key。",
    availableModels: "可用模型",
    billing: "计费方式",
    commonErrors: "常见错误",
    contentType: "内容类型",
    createEndpointTitle: "接口地址",
    createTask: "创建生成任务",
    defaultExample: "默认值 / 示例",
    description: "说明",
    endpoint: "接口",
    errorDocNotFound: "未找到 API 文档。",
    errorMdOnly: "仅支持 .md API 文档。",
    field: "字段",
    fieldsEmpty: "_该模型暂无字段配置。_",
    inputFields: "input 字段",
    meaning: "含义",
    model: "模型",
    modelsHeader: "| modelId | 版本 | 服务商 | 运行模型 |",
    no: "否",
    options: "可选值",
    overview: "概览",
    overviewBody: (model: string) =>
      `使用 AI Studio API 创建 ${model} 生成任务并查询任务状态。接口采用异步流程：先创建任务拿到 \`taskId\`，再通过任务查询接口轮询结果。`,
    payloadFields: "Payload 字段",
    price: "价格",
    pricing: "价格",
    pricingEmpty: "_该模型暂无价格配置。_",
    pricingIntro:
      "创建生成任务时会预扣积分。创建任务响应中的 `reservedCredits` 是本次请求最终预留的积分数量。",
    queryTask: "查询任务状态",
    requestExample: "请求示例",
    requestFields: "请求字段",
    required: "必填",
    spec: "规格",
    status: "状态",
    successResponse: "成功响应",
    tagline: (model: string) =>
      `通过 AI Studio API 使用 ${model} 模型生成视频。`,
    type: "类型",
    yes: "是",
  },
  ja: {
    apiDocumentation: "API ドキュメント",
    authentication: "認証",
    authIntro:
      "すべてのリクエストで `Authorization` ヘッダーに API Key が必要です。",
    availableModels: "利用可能なモデル",
    billing: "課金",
    commonErrors: "一般的なエラー",
    contentType: "Content-Type",
    createEndpointTitle: "エンドポイント",
    createTask: "生成タスクを作成",
    defaultExample: "デフォルト / 例",
    description: "説明",
    endpoint: "エンドポイント",
    errorDocNotFound: "API ドキュメントが見つかりません。",
    errorMdOnly: ".md API ドキュメントのみ対応しています。",
    field: "フィールド",
    fieldsEmpty: "_このモデルのフィールド設定はありません。_",
    inputFields: "input フィールド",
    meaning: "意味",
    model: "モデル",
    modelsHeader: "| modelId | バージョン | プロバイダー | 実行モデル |",
    no: "いいえ",
    options: "選択肢",
    overview: "概要",
    overviewBody: (model: string) =>
      `AI Studio API を使用して ${model} の生成タスクを作成し、タスク状態を確認します。処理は非同期です。まずタスクを作成して \`taskId\` を取得し、その後タスク API で結果を確認します。`,
    payloadFields: "Payload フィールド",
    price: "価格",
    pricing: "価格",
    pricingEmpty: "_このモデルの価格設定はありません。_",
    pricingIntro:
      "生成タスクの作成時にクレジットが予約されます。作成レスポンスの `reservedCredits` が、そのリクエストで予約されたクレジット数です。",
    queryTask: "タスク状態を確認",
    requestExample: "リクエスト例",
    requestFields: "リクエストフィールド",
    required: "必須",
    spec: "仕様",
    status: "ステータス",
    successResponse: "成功レスポンス",
    tagline: (model: string) =>
      `AI Studio API で ${model} モデルを使用して動画を生成します。`,
    type: "タイプ",
    yes: "はい",
  },
} satisfies Record<
  SupportedLocale,
  Record<string, string | ((value: string) => string)>
>;

function resolveLocale(locale: string): SupportedLocale {
  if (supportedLocales.has(locale)) {
    return locale as SupportedLocale;
  }

  return supportedLocales.has(DEFAULT_LOCALE) ? DEFAULT_LOCALE : "en";
}

function getCopy(locale: SupportedLocale) {
  return copyByLocale[locale] ?? copyByLocale.en;
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
          ...(version.aliases ?? []),
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
    familyKey: doc.family.key,
    locale,
  });

  const overviewBody =
    typeof copy.overviewBody === "function"
      ? copy.overviewBody(doc.family.label)
      : copy.overviewBody;
  const tagline =
    typeof copy.tagline === "function"
      ? copy.tagline(doc.family.label)
      : copy.tagline;

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
        statusMode: "poll+callback",
        statusSupported: true,
        mediaUrls: [],
      },
    }),
    "```",
    "",
    `## 2. ${copy.queryTask}`,
    "",
    `### ${copy.endpoint}`,
    "",
    "```http",
    `GET ${origin}/api/ai-studio/tasks/{taskId}?modelId=${encodeURIComponent(primary.version.modelId)}`,
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
