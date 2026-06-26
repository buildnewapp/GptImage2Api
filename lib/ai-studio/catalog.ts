import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import bundledAiStudioRuntimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  type AiStudioDynamicPricingConfig,
  isAiStudioBillingAdapter,
} from "@/lib/ai-studio/runtime";
import { getErrorMessage } from "@/lib/error-utils";

export type AiStudioCategory = "image" | "video" | "music" | "chat";

export interface AiStudioCatalogSeedEntry {
  id: string;
  category: AiStudioCategory;
  title: string;
  docUrl: string;
  provider: string;
  alias?: string | null;
}

export type AiStudioPricingConfig = AiStudioDynamicPricingConfig;

export interface AiStudioResultArtifactRule {
  kind: string;
  path: string;
  labelPath?: string | null;
  targetField?: string | null;
}

export interface AiStudioDocDetail extends AiStudioCatalogSeedEntry {
  vendor?: string;
  endpoint: string;
  method: string;
  modelKeys: string[];
  requestSchema: Record<string, any> | null;
  examplePayload: Record<string, any>;
  statusEndpoint?: string | null;
  formUi?: AiStudioFormUiModelOverride;
  pricing?: AiStudioPricingConfig;
  resultArtifacts?: AiStudioResultArtifactRule[];
}

export interface AiStudioCatalogEntry extends AiStudioCatalogSeedEntry {
  pricing?: AiStudioPricingConfig;
}

export interface AiStudioUpstreamCatalogFile {
  version: number;
  generatedAt: string;
  items: AiStudioDocDetail[];
}

export interface AiStudioCompiledCatalogFile {
  version: number;
  generatedAt: string;
  items: AiStudioDocDetail[];
}

export interface AiStudioModelOverride {
  enabled?: boolean;
  alias?: string | null;
  title?: string;
  provider?: string;
  schemaModel?: string;
  splitModels?: AiStudioSplitModelOverride[];
  resultArtifacts?: AiStudioResultArtifactRule[];
}

export interface AiStudioSplitModelOverride {
  id: string;
  title: string;
  alias?: string | null;
  provider?: string;
  schemaModel: string;
}

export interface AiStudioModelOverridesFile {
  models: Record<string, AiStudioModelOverride>;
}

export interface AiStudioPricingOverrideBucket {
  docUrl?: string;
  price_txt?: string;
  billing_adapter?: string;
  price_key?: string;
  price_map?: Record<string, number>;
  price_final?: string;
  notes?: string;
}

export interface AiStudioPricingOverridesFile {
  models: Record<string, AiStudioPricingOverrideBucket>;
}

export interface AiStudioFormUiModelOverride {
  fieldOrder?: string[];
  advancedFields?: string[];
  hiddenFields?: string[];
}

export interface AiStudioFormUiOverridesFile {
  models: Record<string, AiStudioFormUiModelOverride>;
}

export interface AiStudioSchemaModelOverride {
  replace?: Record<string, unknown> | null;
  set?: Record<string, unknown>;
}

export interface AiStudioSchemaOverridesFile {
  models: Record<string, AiStudioSchemaModelOverride>;
}

export type AiStudioFalModelConfig =
  | string
  | AiStudioFalModelConfigObject;

export interface AiStudioFalModelConfigObject {
  id: string;
  endpointId?: string;
  category?: AiStudioCategory;
  title?: string;
  provider?: string;
  alias?: string | null;
  enabled?: boolean;
}

export interface AiStudioFalModelsFile {
  version: number;
  models: AiStudioFalModelConfig[];
  prices?: Record<string, string>;
}

type CompileRuntimeCatalogInput = {
  upstream: AiStudioUpstreamCatalogFile;
  modelOverrides: AiStudioModelOverridesFile;
  pricingOverrides: AiStudioPricingOverridesFile;
  formUiOverrides?: AiStudioFormUiOverridesFile;
  schemaOverrides?: AiStudioSchemaOverridesFile;
};

const LLMS_INDEX_URL = "https://docs.kie.ai/llms.txt";
const APIMART_LLMS_INDEX_URL = "https://docs.apimart.ai/llms.txt";
const APIMART_LLMS_FULL_URL = "https://docs.apimart.ai/llms-full.txt";
const FAL_MODELS_URL = "https://api.fal.ai/v1/models";
const DOC_LINE_PATTERN =
  /^- (?:(Image|Video|Music|Chat)\s+Models?\s+>\s+.+?|4o Image API|Flux Kontext API|Runway API(?: > Aleph)?|Veo3\.1 API|Suno API(?: > .+?)?) \[(.+?)\]\((https:\/\/docs\.kie\.ai\/(?!cn\/)[^)]+\.md)\):/;
const SUPPORTED_KIE_DOC_PATH_PREFIXES = [
  "/4o-image-api/",
  "/flux-kontext-api/",
  "/market/",
  "/runway-api/",
  "/suno-api/",
  "/veo3-api/",
];
const APIMART_DOC_LINE_PATTERN =
  /^- \[(.+?)\]\((https:\/\/docs\.apimart\.ai\/en\/api-reference\/(?:audios|images|texts|videos)\/[^)]+\.md)\):/;
const APIMART_SECTION_PATTERN =
  /^# (.+?)\nSource: (https:\/\/docs\.apimart\.ai\/en\/api-reference\/(?:audios|images|texts|videos)\/[^\n]+)\n([\s\S]*?)(?=^# |\s*(?![\s\S]))/gm;
const APIMART_STATUS_ENDPOINT = "/v1/tasks/{taskId}?language=en";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Nexty AiStudio Catalog Sync/1.0; +https://google.dev)";
const DEFAULT_AI_STUDIO_DATA_DIR = path.join(process.cwd(), "config", "ai-studio");
const DEFAULT_AI_STUDIO_FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_AI_STUDIO_FETCH_ATTEMPTS = 1;
const DEFAULT_AI_STUDIO_FETCH_RETRY_WAIT_MAX_MS = 1_000;
const DEFAULT_AI_STUDIO_FETCH_CONCURRENCY_WITH_KEY = 2;
const DEFAULT_AI_STUDIO_FETCH_CONCURRENCY_WITHOUT_KEY = 1;
const DEFAULT_AI_STUDIO_FETCH_INTERVAL_MS = 3_000;
const DEFAULT_AI_STUDIO_FETCH_MAX_FAILURE_RATIO = 0.5;
const DEFAULT_AI_STUDIO_CATALOG_MIN_REPLACEMENT_RATIO = 0.75;

type RuntimeCatalogCache = {
  filePath: string;
  mtimeMs: number;
  file: AiStudioCompiledCatalogFile;
};
let runtimeCatalogCache: RuntimeCatalogCache | null = null;
const BUNDLED_AI_STUDIO_RUNTIME_CATALOG_CACHE_KEY = "__bundled_ai_studio_runtime_catalog__";

function getBundledAiStudioRuntimeCatalog(): AiStudioCompiledCatalogFile {
  return bundledAiStudioRuntimeCatalog as AiStudioCompiledCatalogFile;
}

export function getAiStudioCatalogPaths() {
  return {
    upstreamCatalogPath:
      process.env.AI_STUDIO_UPSTREAM_CATALOG_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "catalog.json"),
    apimartCatalogPath:
      process.env.AI_STUDIO_APIMART_CATALOG_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "apimart.json"),
    falCatalogPath:
      process.env.AI_STUDIO_FAL_CATALOG_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "fal.json"),
    falModelsPath:
      process.env.AI_STUDIO_FAL_MODELS_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "fal-models.json"),
    modelOverridesPath:
      process.env.AI_STUDIO_MODEL_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "models.json"),
    pricingOverridesPath:
      process.env.AI_STUDIO_PRICING_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "pricing.json"),
    formUiOverridesPath:
      process.env.AI_STUDIO_FORM_UI_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "form-ui.json"),
    schemaOverridesPath:
      process.env.AI_STUDIO_SCHEMA_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "schema.json"),
    runtimeCatalogPath:
      process.env.AI_STUDIO_RUNTIME_CATALOG_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "runtime", "catalog.json"),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLoose(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeModelHandle(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sortAiStudioCatalogItems<T extends Pick<AiStudioDocDetail, "id">>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

export function assertAiStudioCatalogCanReplaceExisting(
  next: Pick<AiStudioUpstreamCatalogFile, "items">,
  existing: Pick<AiStudioUpstreamCatalogFile, "items">,
  filePath: string,
  minReplacementRatio = DEFAULT_AI_STUDIO_CATALOG_MIN_REPLACEMENT_RATIO,
) {
  const nextCount = next.items.length;
  const existingCount = existing.items.length;

  if (
    existingCount >= 50 &&
    nextCount < Math.ceil(existingCount * minReplacementRatio)
  ) {
    throw new Error(
      `Refusing to overwrite ${filePath}: new AI Studio catalog has ${nextCount} items, existing has ${existingCount}. ` +
        "This usually means the upstream sync only partially succeeded. Set AI_STUDIO_ALLOW_CATALOG_SHRINK=1 to allow an intentional shrink.",
    );
  }
}

export function getAiStudioPublicModelId(
  entry: Pick<AiStudioCatalogSeedEntry, "id" | "category" | "alias">,
) {
  if (!entry.alias) {
    return entry.id;
  }

  return `${entry.category}:${normalizeModelHandle(entry.alias)}`;
}

function stripApiSuffix(input: string) {
  return input.replace(/\bapi\b/gi, " ").replace(/\s+/g, " ").trim();
}

function inferCategory(source: string, docUrl: string): AiStudioCategory | null {
  const sourceLower = source.toLowerCase();
  const urlLower = docUrl.toLowerCase();

  if (sourceLower.startsWith("image")) {
    return "image";
  }

  if (sourceLower.startsWith("video") || sourceLower.startsWith("veo3.1")) {
    return "video";
  }

  if (sourceLower.startsWith("music") || sourceLower.startsWith("suno")) {
    return "music";
  }

  if (sourceLower.startsWith("chat")) {
    return "chat";
  }

  if (
    urlLower.includes("/4o-image-api/") ||
    urlLower.includes("/flux-kontext-api/") ||
    urlLower.includes("/market/google/") ||
    urlLower.includes("/market/seedream/") ||
    urlLower.includes("/market/qwen/") ||
    urlLower.includes("/market/ideogram/") ||
    urlLower.includes("/market/recraft/") ||
    urlLower.includes("/market/topaz/image") ||
    urlLower.includes("/market/z-image/") ||
    urlLower.includes("/market/gpt-image/") ||
    urlLower.includes("/market/flux2/") ||
    urlLower.includes("/market/grok-imagine/") && urlLower.includes("image")
  ) {
    return "image";
  }

  if (
    sourceLower.startsWith("runway") ||
    urlLower.includes("/veo3-api/") ||
    urlLower.includes("/runway-api/") ||
    urlLower.includes("/market/kling/") ||
    urlLower.includes("/market/bytedance/") ||
    urlLower.includes("/market/hailuo/") ||
    urlLower.includes("/market/sora2/") ||
    urlLower.includes("/market/sora-2-") ||
    urlLower.includes("/market/wan/") ||
    urlLower.includes("/market/infinitalk/") ||
    urlLower.includes("/market/topaz/video") ||
    (urlLower.includes("/market/grok-imagine/") && urlLower.includes("video"))
  ) {
    return "video";
  }

  if (
    urlLower.includes("/suno-api/") ||
    urlLower.includes("/market/elevenlabs/")
  ) {
    return "music";
  }

  if (
    urlLower.includes("/market/chat/") ||
    urlLower.includes("/market/claude/") ||
    urlLower.includes("/market/gemini/") ||
    urlLower.includes("/market/gpt-5") ||
    urlLower.includes("/market/gpt/")
  ) {
    return "chat";
  }

  return null;
}

function shouldIncludeCatalogEntry(title: string, docUrl: string): boolean {
  const blockedTitlePrefixes = [
    "Get ",
    "Query ",
    "Quickstart",
    "Webhook",
  ];
  const blockedTitleFragments = [
    " Callbacks",
    " Callback",
    "Download URL",
    "Get 1080P",
    "Get 4K",
    "Get Direct Download URL",
    "Get Task Details",
    "Integration Guide",
    "使用指南",
  ];
  const blockedUrlFragments = [
    "/quickstart",
    "/callbacks",
    "-callback",
    "/get-",
    "/download-url",
    "/webhook-verification",
  ];

  const pathname = new URL(docUrl).pathname;

  return (
    SUPPORTED_KIE_DOC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !blockedTitlePrefixes.some((prefix) => title.startsWith(prefix)) &&
    !blockedTitleFragments.some((fragment) => title.includes(fragment)) &&
    !blockedUrlFragments.some((fragment) => docUrl.includes(fragment))
  );
}

function toProvider(source: string, title: string): string {
  const first = source.split(">").at(-1)?.trim() || title.split(" - ")[0] || title;
  return first.replace(/\s+/g, " ").trim();
}

function firstPath(openapiDoc: Record<string, any>) {
  const [endpoint, pathDef] = Object.entries(openapiDoc.paths ?? {})[0] ?? [];
  if (!endpoint || !pathDef || typeof pathDef !== "object") {
    throw new Error("Unable to parse OpenAPI path from official doc");
  }

  const [method, methodDef] = Object.entries(pathDef as Record<string, any>)[0] ?? [];
  if (!method || !methodDef || typeof methodDef !== "object") {
    throw new Error("Unable to parse OpenAPI method from official doc");
  }

  return {
    endpoint,
    method: method.toUpperCase(),
    methodDef: methodDef as Record<string, any>,
  };
}

function extractYamlCodeBlock(markdown: string): string {
  const match = markdown.match(/```yaml\s*([\s\S]*?)```/i);
  if (!match?.[1]) {
    throw new Error("Unable to locate OpenAPI yaml block");
  }
  return match[1];
}

function extractRequestSchema(methodDef: Record<string, any>) {
  return (
    methodDef.requestBody?.content?.["application/json"]?.schema ??
    methodDef.requestBody?.content?.["application/json"]?.example ??
    null
  );
}

function resolveOpenApiRef(openapiDoc: Record<string, any>, ref: string) {
  const segments = ref.replace(/^#\//, "").split("/").filter(Boolean);
  let current: unknown = openapiDoc;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current && typeof current === "object"
    ? (current as Record<string, any>)
    : null;
}

function dereferenceOpenApiSchema(
  openapiDoc: Record<string, any>,
  schema: unknown,
  seen = new Set<string>(),
): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => dereferenceOpenApiSchema(openapiDoc, item, seen));
  }

  const record = schema as Record<string, any>;
  if (typeof record.$ref === "string") {
    if (seen.has(record.$ref)) {
      return {};
    }

    const resolved = resolveOpenApiRef(openapiDoc, record.$ref);
    if (!resolved) {
      return structuredClone(record);
    }

    return dereferenceOpenApiSchema(
      openapiDoc,
      {
        ...resolved,
        ...Object.fromEntries(
          Object.entries(record).filter(([key]) => key !== "$ref"),
        ),
      },
      new Set([...seen, record.$ref]),
    );
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      dereferenceOpenApiSchema(openapiDoc, value, seen),
    ]),
  );
}

function normalizeFalSchema(schema: Record<string, any> | null) {
  if (!schema) {
    return null;
  }

  return {
    ...schema,
    ...(Array.isArray(schema["x-fal-order-properties"]) && !schema["x-apidog-orders"]
      ? { "x-apidog-orders": schema["x-fal-order-properties"] }
      : {}),
  };
}

function getSchemaType(schema: Record<string, any>) {
  if (typeof schema.type === "string") {
    return schema.type;
  }

  const nonNullAnyOf = Array.isArray(schema.anyOf)
    ? schema.anyOf.find(
        (item: unknown): item is Record<string, any> =>
          Boolean(item) &&
          typeof item === "object" &&
          (item as Record<string, any>).type !== "null",
      )
    : null;

  return typeof nonNullAnyOf?.type === "string" ? nonNullAnyOf.type : null;
}

function exampleValueFromSchema(schema: Record<string, any>): unknown {
  if (schema.default !== undefined) {
    return structuredClone(schema.default);
  }

  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return structuredClone(schema.examples[0]);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return structuredClone(schema.enum[0]);
  }

  const type = getSchemaType(schema);
  if (type === "array") {
    return [];
  }
  if (type === "object") {
    return {};
  }
  if (type === "boolean") {
    return false;
  }
  if (type === "integer" || type === "number") {
    return 0;
  }

  return "";
}

function buildExamplePayloadFromSchema(schema: Record<string, any> | null) {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties as Record<string, Record<string, any>>).map(
      ([key, value]) => [key, exampleValueFromSchema(value)],
    ),
  );
}

function findFalSubmitPath(openapiDoc: Record<string, any>) {
  for (const [endpoint, pathDef] of Object.entries(openapiDoc.paths ?? {})) {
    if (!pathDef || typeof pathDef !== "object") {
      continue;
    }

    const methods = pathDef as Record<string, any>;
    const methodDef = methods.post ?? methods.put ?? methods.get;
    const method = methods.post ? "POST" : methods.put ? "PUT" : methods.get ? "GET" : null;
    if (!method || !methodDef || typeof methodDef !== "object") {
      continue;
    }

    if (methodDef.requestBody?.content?.["application/json"]?.schema) {
      return {
        endpoint,
        method,
        methodDef: methodDef as Record<string, any>,
      };
    }
  }

  throw new Error("Unable to parse fal submit endpoint from OpenAPI doc");
}

function findFalStatusEndpoint(openapiDoc: Record<string, any>) {
  return (
    Object.keys(openapiDoc.paths ?? {}).find((endpoint) =>
      /\/requests\/\{request_id\}\/status$/.test(endpoint),
    ) ?? null
  );
}

function buildFalQueueStatusEndpoint(submitEndpoint: string) {
  const parts = submitEndpoint.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  return `/${parts[0]}/${parts[1]}/requests/{request_id}/status`;
}

function normalizeFalEndpointId(config: AiStudioFalModelConfig) {
  return typeof config === "string" ? config : config.endpointId ?? config.id;
}

function isFalModelConfigEnabled(config: AiStudioFalModelConfig) {
  return typeof config === "string" || config.enabled !== false;
}

function inferFalCategory(endpointId: string, model: FalApiModel): AiStudioCategory {
  const category = model.metadata?.category?.toLowerCase() ?? "";
  const source = `${category} ${endpointId}`.toLowerCase();

  if (source.includes("video")) {
    return "video";
  }
  if (source.includes("image")) {
    return "image";
  }
  if (source.includes("audio") || source.includes("music")) {
    return "music";
  }
  return "chat";
}

function inferFalProvider(endpointId: string, model: FalApiModel) {
  const metadataGroup =
    typeof model.metadata?.group === "string" ? model.metadata.group : null;
  const providerKey =
    metadataGroup ??
    (endpointId.startsWith("fal-ai/")
      ? endpointId.split("/")[1]
      : endpointId.split("/")[0]);
  const providerMap: Record<string, string> = {
    alibaba: "Alibaba",
    blackforestlabs: "Black Forest Labs",
    bytedance: "ByteDance",
    google: "Google",
    ideogram: "Ideogram",
    openai: "OpenAI",
    qwen: "Qwen",
    xai: "xAI",
  };
  const normalizedProvider = normalizeLoose(providerKey ?? "");
  return providerMap[normalizedProvider] ?? providerKey ?? "fal";
}

function getFalCatalogModelId(endpointId: string, category: AiStudioCategory) {
  return `${category}:fal-${slugify(endpointId)}`;
}

function normalizeFalTitle(title: string) {
  return stripApiSuffix(title).replace(/\s+/g, " ").trim();
}

export function extractFalPricingTextFromLlms(content: string) {
  const pricingHeadingMatch = /^## Pricing\s*$/m.exec(content);
  if (!pricingHeadingMatch) {
    return null;
  }

  const sectionStart = pricingHeadingMatch.index + pricingHeadingMatch[0].length;
  const remaining = content.slice(sectionStart).replace(/^\s*\n/, "");
  const nextHeadingMatch = /^##\s/m.exec(remaining);
  const section = nextHeadingMatch
    ? remaining.slice(0, nextHeadingMatch.index)
    : remaining;

  const paragraphs = section
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);

  const pricingParagraphs = paragraphs.filter(
    (paragraph) =>
      !/^For more details\b/i.test(paragraph) &&
      !/fal\.ai\/pricing/i.test(paragraph),
  );

  return pricingParagraphs.length > 0 ? pricingParagraphs.join("\n\n") : null;
}

function extractRequestExample(methodDef: Record<string, any>) {
  const content = methodDef.requestBody?.content?.["application/json"];
  const example = content?.example ?? content?.schema?.example;
  if (example && typeof example === "object") {
    return example as Record<string, any>;
  }
  return {};
}

function extractModelKeysFromSchema(
  schema: Record<string, any> | null,
  endpoint: string,
): string[] {
  const modelProperty = schema?.properties?.model;
  const enumValues = Array.isArray(modelProperty?.enum)
    ? modelProperty.enum.filter((value: unknown): value is string => typeof value === "string")
    : [];

  if (enumValues.length > 0) {
    return enumValues;
  }

  if (typeof modelProperty?.default === "string") {
    return [modelProperty.default];
  }

  const endpointModel = endpoint.match(/^\/([^/]+)\/v\d+\//)?.[1];
  return endpointModel ? [endpointModel] : [];
}

function inferApimartCategory(docUrl: string): AiStudioCategory | null {
  if (docUrl.includes("/images/")) {
    return "image";
  }
  if (docUrl.includes("/videos/")) {
    return "video";
  }
  if (docUrl.includes("/texts/")) {
    return "chat";
  }
  if (docUrl.includes("/audios/")) {
    return "music";
  }
  return null;
}

function parseTagAttributes(input: string) {
  const attrs: Record<string, string | true> = {};
  const attrPattern = /([a-zA-Z_:-]+)(?:="([^"]*)")?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(input))) {
    const name = match[1];
    if (!name || name === "ParamField") {
      continue;
    }
    attrs[name] = match[2] ?? true;
  }

  return attrs;
}

function stripMarkdownForDescription(input: string) {
  return input
    .split("\n")
    .map((line) =>
      line
        .replace(/<\/?(?:Note|Warning|Expandable)[^>]*>/g, "")
        .replace(/```[a-zA-Z0-9 ={}-]*/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .trim(),
    )
    .filter((line) => line && !line.startsWith("```"))
    .join("\n");
}

function getApimartFieldTokens(fieldName: string) {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function isApimartUrlField(fieldName: string, body = "") {
  const tokens = getApimartFieldTokens(fieldName);
  const normalizedBody = body.toLowerCase();

  return (
    tokens.includes("url") ||
    tokens.includes("urls") ||
    normalizedBody.includes("asset://") ||
    normalizedBody.includes("data:image/")
  );
}

function getApimartArrayMaxItems(fieldName: string, body: string) {
  if (!isApimartUrlField(fieldName, body)) {
    return undefined;
  }

  const normalized = stripMarkdownForDescription(body)
    .replace(/[*_]/g, "")
    .toLowerCase();
  const resourcePattern = "(?:reference\\s+)?(?:images?|audios?|videos?|urls?|items?)";
  const patterns = [
    new RegExp(`max(?:imum)?[^\\d]{0,24}(\\d+)[^\\n]{0,48}${resourcePattern}`, "i"),
    new RegExp(`(?:up to|≤|<=)[^\\d]{0,12}(\\d+)[^\\n]{0,48}${resourcePattern}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const parsed = match?.[1] ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function toJsonSchemaType(type: string, fieldName = "", body = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("array")) {
    const itemSchema =
      normalized.includes("object")
        ? { type: "object" }
        : normalized.includes("string") ||
            normalized.includes("url") ||
            isApimartUrlField(fieldName, body)
          ? {
              type: "string",
              ...(normalized.includes("url") || isApimartUrlField(fieldName, body)
                ? { format: "uri" }
                : {}),
            }
          : {};

    return {
      type: "array",
      items: itemSchema,
    };
  }
  if (normalized.includes("integer")) {
    return { type: "integer" };
  }
  if (normalized.includes("number") || normalized.includes("float")) {
    return { type: "number" };
  }
  if (normalized.includes("boolean")) {
    return { type: "boolean" };
  }
  if (normalized.includes("object")) {
    return { type: "object" };
  }
  return { type: "string" };
}

function parseDefaultValue(value: string | true | undefined, type: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = type.toLowerCase();
  if (normalized.includes("integer")) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (normalized.includes("number") || normalized.includes("float")) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (normalized.includes("boolean")) {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

function extractBacktickValues(input: string) {
  const values = new Set<string>();
  const pattern = /`([^`\n]+)`/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input))) {
    const value = match[1]?.trim().replace(/^["']|["']$/g, "");
    if (!value || value.includes(" ") || value.includes("://")) {
      continue;
    }
    values.add(value);
  }

  return [...values];
}

function stripJsonComments(input: string) {
  return input
    .split("\n")
    .map((line) => line.replace(/\s+#.*$/, ""))
    .join("\n");
}

function extractFirstJsonPayload(markdown: string) {
  const curlData = markdown.match(/--data\s+'([\s\S]*?)'\s*(?:\\|\n\s*```)/i)?.[1];
  const fencedJson = markdown.match(/```json[^\n]*\n([\s\S]*?)```/i)?.[1];
  const raw = curlData ?? fencedJson;
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(stripJsonComments(raw)) as Record<string, any>;
  } catch {
    return {};
  }
}

function toSchemaFromExampleValue(key: string, value: unknown) {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: isApimartUrlField(key)
        ? { type: "string", format: "uri" }
        : {},
    };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
  }
  if (typeof value === "boolean") {
    return { type: "boolean" };
  }
  if (value && typeof value === "object") {
    return { type: "object" };
  }
  return { type: "string" };
}

function mergeExamplePayloadIntoSchema(
  schema: { type: string; required: string[]; properties: Record<string, any> },
  examplePayload: Record<string, any>,
) {
  for (const [key, value] of Object.entries(examplePayload)) {
    schema.properties[key] ??= toSchemaFromExampleValue(key, value);
  }
  return schema;
}

function shouldSkipApimartRequestField(name: string) {
  return name === "n";
}

function omitSkippedApimartRequestFields(payload: Record<string, any>) {
  const next = { ...payload };
  delete next.n;
  return next;
}

function extractApimartModelKeys(
  markdown: string,
  examplePayload: Record<string, any>,
) {
  const fieldBlocks = [...markdown.matchAll(/^<ParamField[^>]*>\n([\s\S]*?)^<\/ParamField>/gm)]
    .map((match) => match[1] ?? "");
  const modelBlock = fieldBlocks.find((block) => /model name|supported models|available models|fixed as/i.test(block));
  const values = modelBlock ? extractBacktickValues(modelBlock) : [];
  const modelValues = values.filter((value) => /[a-zA-Z]/.test(value));

  if (modelValues.length > 0) {
    return modelValues;
  }
  if (typeof examplePayload.model === "string") {
    return [examplePayload.model];
  }
  return [];
}

function parseApimartRequestSchema(markdown: string, examplePayload: Record<string, any>) {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  const fieldPattern = /^<ParamField\s+(.+)>\n([\s\S]*?)^<\/ParamField>/gm;
  let match: RegExpExecArray | null;

  while ((match = fieldPattern.exec(markdown))) {
    const rawAttrs = match[1] ?? "";
    const body = match[2] ?? "";
    const attrs = parseTagAttributes(rawAttrs);
    const name = typeof attrs.body === "string" ? attrs.body : undefined;
    if (!name || shouldSkipApimartRequestField(name)) {
      continue;
    }

    const rawType = typeof attrs.type === "string" ? attrs.type : "string";
    const property: Record<string, any> = {
      ...toJsonSchemaType(rawType, name, body),
      description: stripMarkdownForDescription(body),
    };
    const defaultValue = parseDefaultValue(attrs.default, rawType);
    const maxItems = getApimartArrayMaxItems(name, body);

    if (defaultValue !== undefined) {
      property.default = defaultValue;
    }

    if (property.type === "array" && maxItems !== undefined) {
      property.maxItems = maxItems;
    }

    properties[name] = property;
    if (attrs.required === true) {
      required.push(name);
    }
  }

  return mergeExamplePayloadIntoSchema({
    type: "object",
    required,
    properties,
  }, omitSkippedApimartRequestFields(examplePayload));
}

function inferApimartProvider(title: string) {
  return title
    .replace(/\s+(?:Image|Video|Audio|Text).*/i, "")
    .replace(/\s+Generation.*$/i, "")
    .replace(/\s+API.*$/i, "")
    .trim() || "APIMart";
}

function extractApimartEndpoint(body: string) {
  const directMatch = body.match(/^([A-Z]+)\s+https:\/\/api\.apimart\.ai([^\s]+)/m);
  if (directMatch?.[1] && directMatch?.[2]) {
    return {
      method: directMatch[1],
      endpoint: directMatch[2],
    };
  }

  const curlMethod = body.match(/--request\s+([A-Z]+)/i)?.[1];
  const curlEndpoint = body.match(/--url\s+https:\/\/api\.apimart\.ai([^\s\\]+)/i)?.[1];
  if (curlMethod && curlEndpoint) {
    return {
      method: curlMethod.toUpperCase(),
      endpoint: curlEndpoint,
    };
  }

  return null;
}

function toApimartModelId(category: AiStudioCategory, modelKey: string) {
  const handle = normalizeModelHandle(modelKey)
    .replace(/^doubao-seedance-/, "seedance-")
    .replace(/-apimart$/, "");
  return `${category}:ama-${handle}`;
}

function rewriteApimartSchemaForModel(
  schema: Record<string, any>,
  modelKey: string,
) {
  return {
    ...schema,
    required: Array.isArray(schema.required) ? [...schema.required] : [],
    properties: {
      ...schema.properties,
      model: {
        ...(schema.properties?.model ?? { type: "string" }),
        enum: [modelKey],
        default: modelKey,
      },
    },
  };
}

function buildApimartDetailsFromSection(
  title: string,
  docUrl: string,
  body: string,
): AiStudioDocDetail[] {
  const category = inferApimartCategory(docUrl);
  const endpoint = extractApimartEndpoint(body);
  if (!category || !endpoint) {
    return [];
  }

  const examplePayload = extractFirstJsonPayload(body);
  const requestSchema = parseApimartRequestSchema(body, examplePayload);
  const modelKeys =
    requestSchema.properties.model?.enum ??
    (typeof requestSchema.properties.model?.default === "string"
      ? [requestSchema.properties.model.default]
      : extractApimartModelKeys(body, examplePayload));
  const keys = modelKeys.length > 0 ? modelKeys : [slugify(title)];

  return keys.map((modelKey: string) => ({
    id: toApimartModelId(category, modelKey),
    vendor: "apimart",
    category,
    title: keys.length > 1 ? `${title} - ${modelKey}` : title,
    docUrl,
    provider: inferApimartProvider(title),
    endpoint: endpoint.endpoint,
    method: endpoint.method,
    statusEndpoint:
      category === "image" || category === "video" ? APIMART_STATUS_ENDPOINT : null,
    modelKeys: [modelKey],
    requestSchema: rewriteApimartSchemaForModel(requestSchema, modelKey),
    examplePayload: {
      ...omitSkippedApimartRequestFields(examplePayload),
      model: modelKey,
    },
  }));
}

export interface AiStudioApimartDocSeed {
  title: string;
  docUrl: string;
}

function toApimartPublicDocUrl(markdownDocUrl: string) {
  return markdownDocUrl.replace(/\.md$/, "");
}

export function parseApimartLlmsIndex(content: string): AiStudioApimartDocSeed[] {
  const entries: AiStudioApimartDocSeed[] = [];
  const seen = new Set<string>();

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(APIMART_DOC_LINE_PATTERN);
    const title = match?.[1]?.trim();
    const docUrl = match?.[2]?.trim();
    if (!title || !docUrl || seen.has(docUrl)) {
      continue;
    }

    seen.add(docUrl);
    entries.push({
      title,
      docUrl,
    });
  }

  return entries;
}

export function parseApimartDocMarkdown(
  title: string,
  markdownDocUrl: string,
  markdown: string,
): AiStudioDocDetail[] {
  return buildApimartDetailsFromSection(
    title,
    toApimartPublicDocUrl(markdownDocUrl),
    markdown,
  );
}

export function parseApimartLlmsFull(content: string): AiStudioUpstreamCatalogFile {
  const items: AiStudioDocDetail[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = APIMART_SECTION_PATTERN.exec(content))) {
    const title = match[1]?.trim();
    const docUrl = match[2]?.trim();
    const body = match[3] ?? "";
    if (!title || !docUrl) {
      continue;
    }

    for (const detail of buildApimartDetailsFromSection(title, docUrl, body)) {
      if (seen.has(detail.id)) {
        continue;
      }
      seen.add(detail.id);
      items.push(detail);
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

export function parseLlmsIndex(content: string): AiStudioCatalogSeedEntry[] {
  const entries: AiStudioCatalogSeedEntry[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(DOC_LINE_PATTERN);
    if (!match) {
      continue;
    }

    const source = line.slice(2, line.indexOf("[")).trim();
    const title = match[2]?.trim();
    const docUrl = match[3]?.trim();
    if (!title || !docUrl || !shouldIncludeCatalogEntry(title, docUrl)) {
      continue;
    }

    const category = inferCategory(source, docUrl);
    if (!category) {
      continue;
    }

    entries.push({
      id: `${category}:${slugify(title)}`,
      category,
      title,
      docUrl,
      provider: toProvider(source, title),
    });
  }

  return entries;
}

export function parseApiDocMarkdown(
  entry: Pick<AiStudioCatalogSeedEntry, "category" | "title" | "docUrl">,
  markdown: string,
): AiStudioDocDetail {
  const openapiDoc = YAML.parse(extractYamlCodeBlock(markdown)) as Record<string, any>;
  const { endpoint, method, methodDef } = firstPath(openapiDoc);
  const schema = extractRequestSchema(methodDef);
  const examplePayload = extractRequestExample(methodDef);
  const modelKeys = extractModelKeysFromSchema(schema, endpoint);

  const providerFromTitle = entry.title.split(" - ")[0] || entry.title;

  return {
    id: `${entry.category}:${slugify(entry.title)}`,
    category: entry.category,
    title: entry.title,
    docUrl: entry.docUrl,
    provider: providerFromTitle,
    endpoint,
    method,
    modelKeys,
    requestSchema: schema,
    examplePayload,
  };
}

async function fetchText(url: string): Promise<string> {
  const source = url.includes("docs.kie.ai")
    ? "kie"
    : url.includes("docs.apimart.ai")
      ? "apimart"
      : "upstream";

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
  } catch (error) {
    console.log(
      `[AI Studio ${source}] 连接: ${url} 失败: ${getErrorMessage(error)}`,
    );
    throw error;
  }

  if (response.ok) {
    console.log(`[AI Studio ${source}] 连接: ${url} 成功: ${response.status}`);
    return response.text();
  }

  const responseText = await response.clone().text().catch(() => "");
  const reason =
    responseText.trim().replace(/\s+/g, " ").slice(0, 240) ||
    response.statusText ||
    `HTTP ${response.status}`;
  console.log(
    `[AI Studio ${source}] 连接: ${url} 失败: ${response.status} ${reason}`,
  );
  throw new Error(`Failed to fetch ${url}: ${response.status}`);
}

export async function fetchAiStudioCatalogSeeds() {
  const indexContent = await fetchText(LLMS_INDEX_URL);
  return parseLlmsIndex(indexContent);
}

export async function getAiStudioCatalog(): Promise<AiStudioCatalogEntry[]> {
  const seeds = await fetchAiStudioCatalogSeeds();

  return seeds.map((seed) => ({ ...seed }));
}

export async function getAiStudioCatalogDetail(
  entry: AiStudioCatalogEntry,
): Promise<AiStudioDocDetail> {
  const markdown = await fetchText(entry.docUrl);
  try {
    return parseApiDocMarkdown(entry, markdown);
  } catch (error) {
    throw new Error(
      `Failed to parse AI Studio catalog doc "${entry.title}" (${entry.docUrl}): ${getErrorMessage(error)}`,
    );
  }
}

export async function buildAiStudioUpstreamCatalog(): Promise<AiStudioUpstreamCatalogFile> {
  const entries = await getAiStudioCatalog();
  const results = await mapWithConcurrency(
    entries,
    getAiStudioFetchConcurrency(),
    (entry) => getAiStudioCatalogDetail(entry),
    getAiStudioFetchIntervalMs(),
  );
  const items: AiStudioDocDetail[] = [];
  const failures: string[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      items.push(result.value);
      continue;
    }

    const entry = entries[index];
    failures.push(
      entry
        ? `${entry.title} (${entry.docUrl}): ${getErrorMessage(result.reason)}`
        : getErrorMessage(result.reason),
    );
  }

  if (failures.length > 0) {
    console.warn(
      `Skipped ${failures.length} AI Studio catalog docs that could not be parsed:`,
    );
    for (const failure of failures) {
      console.warn(`- ${failure}`);
    }
  }

  if (entries.length > 0 && items.length === 0) {
    throw new Error("Unable to build AI Studio upstream catalog: all docs failed to parse");
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items: sortAiStudioCatalogItems(items),
  };
}

export async function buildAiStudioApimartCatalog(): Promise<AiStudioUpstreamCatalogFile> {
  const content = await fetchText(APIMART_LLMS_INDEX_URL);
  const seeds = parseApimartLlmsIndex(content);
  const details = await Promise.all(
    seeds.map(async (seed) => {
      const markdown = await fetchText(seed.docUrl);
      return parseApimartDocMarkdown(seed.title, seed.docUrl, markdown);
    }),
  );

  const items: AiStudioDocDetail[] = [];
  const seen = new Set<string>();
  for (const detail of details.flat()) {
    if (seen.has(detail.id)) {
      continue;
    }
    seen.add(detail.id);
    items.push(detail);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

type FalApiModel = {
  endpoint_id?: string;
  metadata?: {
    display_name?: string;
    category?: string;
    group?: string;
  };
  openapi?: Record<string, any>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPositiveNumberEnv(names: string[]) {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function getRatioEnv(names: string[]) {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value >= 0 && value <= 1) {
      return value;
    }
  }

  return null;
}

function getAiStudioFetchTimeoutMs() {
  return getPositiveNumberEnv([
    "AI_STUDIO_FETCH_TIMEOUT_MS",
  ]) ?? DEFAULT_AI_STUDIO_FETCH_TIMEOUT_MS;
}

function getAiStudioFetchRetryWaitMaxMs() {
  return getPositiveNumberEnv([
    "AI_STUDIO_FETCH_RETRY_WAIT_MAX_MS",
  ]) ?? DEFAULT_AI_STUDIO_FETCH_RETRY_WAIT_MAX_MS;
}

function getAiStudioFetchAttempts() {
  return Math.floor(getPositiveNumberEnv([
    "AI_STUDIO_FETCH_ATTEMPTS",
  ]) ?? DEFAULT_AI_STUDIO_FETCH_ATTEMPTS);
}

function getFalApiKey() {
  return process.env.FAL_API_KEY || process.env.FAL_KEY;
}

function getAiStudioFetchConcurrency(hasApiKey = false) {
  return Math.floor(getPositiveNumberEnv([
    "AI_STUDIO_FETCH_CONCURRENCY",
  ]) ?? (
    hasApiKey
      ? DEFAULT_AI_STUDIO_FETCH_CONCURRENCY_WITH_KEY
      : DEFAULT_AI_STUDIO_FETCH_CONCURRENCY_WITHOUT_KEY
  ));
}

function getAiStudioFetchIntervalMs() {
  return getPositiveNumberEnv([
    "AI_STUDIO_FETCH_INTERVAL_MS",
  ]) ?? DEFAULT_AI_STUDIO_FETCH_INTERVAL_MS;
}

function getAiStudioFetchMaxFailureRatio() {
  return getRatioEnv([
    "AI_STUDIO_FETCH_MAX_FAILURE_RATIO",
  ]) ?? DEFAULT_AI_STUDIO_FETCH_MAX_FAILURE_RATIO;
}

function createIntervalGate(intervalMs: number) {
  let nextAvailableAt = 0;
  let previous = Promise.resolve();

  return async () => {
    let release: () => void = () => {};
    const current = previous.then(async () => {
      const waitMs = Math.max(0, nextAvailableAt - Date.now());
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      nextAvailableAt = Date.now() + intervalMs;
      release();
    });
    previous = new Promise<void>((resolve) => {
      release = resolve;
    });
    await current;
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  intervalMs = 0,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  const waitForFetchInterval = intervalMs > 0
    ? createIntervalGate(intervalMs)
    : async () => {};
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        await waitForFetchInterval();
        results[index] = {
          status: "fulfilled",
          value: await mapper(items[index]!, index),
        };
      } catch (reason) {
        results[index] = {
          status: "rejected",
          reason,
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(concurrency, 1), items.length) },
      () => worker(),
    ),
  );

  return results;
}

export function parseFalOpenApiModel(
  config: AiStudioFalModelConfig,
  model: FalApiModel,
): AiStudioDocDetail {
  const endpointId = normalizeFalEndpointId(config);
  const openapiDoc = model.openapi;
  if (!openapiDoc) {
    throw new Error(`fal model is missing OpenAPI schema: ${endpointId}`);
  }

  const { endpoint, method, methodDef } = findFalSubmitPath(openapiDoc);
  const rawSchema = extractRequestSchema(methodDef);
  const requestSchema = normalizeFalSchema(
    dereferenceOpenApiSchema(openapiDoc, rawSchema) as Record<string, any> | null,
  );
  const examplePayload = {
    ...buildExamplePayloadFromSchema(requestSchema),
    ...extractRequestExample(methodDef),
  };
  const category =
    typeof config === "string" ? inferFalCategory(endpointId, model) : config.category ?? inferFalCategory(endpointId, model);
  const title = normalizeFalTitle(
    (typeof config === "string" ? null : config.title) ??
      model.metadata?.display_name ??
      endpointId,
  );
  const provider =
    (typeof config === "string" ? null : config.provider) ??
    inferFalProvider(endpointId, model);
  const id =
    typeof config !== "string" && config.endpointId
      ? config.id
      : getFalCatalogModelId(endpointId, category);
  const detail = {
    id,
    vendor: "fal",
    category,
    title,
    docUrl: `https://fal.ai/models/${endpointId}/api`,
    provider,
    alias: typeof config === "string" ? null : config.alias ?? null,
    endpoint,
    method,
    statusEndpoint:
      buildFalQueueStatusEndpoint(endpoint) ?? findFalStatusEndpoint(openapiDoc),
    modelKeys: [endpointId],
    requestSchema,
    examplePayload,
  } satisfies AiStudioDocDetail;

  return detail;
}

export function parseFalCatalogModels(
  configFile: AiStudioFalModelsFile,
  models: FalApiModel[],
): AiStudioUpstreamCatalogFile {
  const modelsByEndpoint = new Map(
    models
      .filter((model): model is FalApiModel & { endpoint_id: string } =>
        typeof model.endpoint_id === "string",
      )
      .map((model) => [model.endpoint_id, model]),
  );

  const items = configFile.models.flatMap((config) => {
    if (!isFalModelConfigEnabled(config)) {
      return [];
    }

    const endpointId = normalizeFalEndpointId(config);
    const model = modelsByEndpoint.get(endpointId);
    if (!model) {
      throw new Error(`fal model not found: ${endpointId}`);
    }

    return [parseFalOpenApiModel(config, model)];
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

async function fetchFalWithRetry(url: URL, init: RequestInit, label: string) {
  let lastResponse: Response | null = null;
  const urlString = url.toString();
  const authStatus = getFalApiKey()
    ? "认证: 已带 FAL API Key"
    : "认证: 未带 FAL API Key";

  for (let attempt = 0; attempt < getAiStudioFetchAttempts(); attempt += 1) {
    const controller = new AbortController();
    const timeoutMs = getAiStudioFetchTimeoutMs();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const reason = `Timed out fetching ${label} after ${timeoutMs}ms`;
        console.log(`[AI Studio fal] 连接: ${urlString} ${authStatus} 失败: ${reason}`);
        throw new Error(reason);
      }
      console.log(
        `[AI Studio fal] 连接: ${urlString} ${authStatus} 失败: ${getErrorMessage(error)}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) {
      console.log(`[AI Studio fal] 连接: ${urlString} ${authStatus} 成功: ${response.status}`);
      return response;
    }

    const responseText = await response.clone().text().catch(() => "");
    const reason =
      responseText.trim().replace(/\s+/g, " ").slice(0, 240) ||
      response.statusText ||
      `HTTP ${response.status}`;
    console.log(
      `[AI Studio fal] 连接: ${urlString} ${authStatus} 失败: ${response.status} ${reason}`,
    );

    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;
    if (attempt === getAiStudioFetchAttempts() - 1) {
      break;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const retryWaitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1500 * (attempt + 1);
    const waitMs = Math.min(retryWaitMs, getAiStudioFetchRetryWaitMaxMs());
    await sleep(waitMs);
  }

  return lastResponse ?? fetch(url, init).catch((error) => {
    throw new Error(`Failed to fetch ${label}: ${String(error)}`);
  });
}

async function fetchFalModel(endpointId: string): Promise<FalApiModel> {
  const url = new URL(FAL_MODELS_URL);
  url.searchParams.set("endpoint_id", endpointId);
  url.searchParams.set("expand", "openapi-3.0");

  const apiKey = getFalApiKey();
  const response = await fetchFalWithRetry(url, {
    headers: {
      "User-Agent": USER_AGENT,
      ...(apiKey ? { Authorization: `Key ${apiKey}` } : {}),
    },
  }, endpointId);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status}`);
  }

  const payload = await response.json() as { models?: FalApiModel[] };
  const model = payload.models?.[0];
  if (!model) {
    throw new Error(`fal model not found: ${endpointId}`);
  }

  return model;
}

async function fetchFalModelLlmsPricingText(endpointId: string) {
  const url = new URL(`https://fal.ai/models/${endpointId}/llms.txt`);
  const response = await fetchFalWithRetry(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  }, `${endpointId} llms.txt`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status}`);
  }

  const pricingText = extractFalPricingTextFromLlms(await response.text());
  if (!pricingText) {
    throw new Error(`fal model is missing llms pricing text: ${endpointId}`);
  }

  return pricingText;
}

export async function syncAiStudioFalModelPrices(
  configFile: AiStudioFalModelsFile,
): Promise<AiStudioFalModelsFile> {
  const enabledModels = configFile.models.filter(isFalModelConfigEnabled);
  const prices: Record<string, string> = {};

  for (const endpointId of enabledModels.map(normalizeFalEndpointId)) {
    prices[endpointId] = await fetchFalModelLlmsPricingText(endpointId);
  }

  return {
    ...configFile,
    prices,
  };
}

export async function buildAiStudioFalCatalog(
  configFile: AiStudioFalModelsFile,
): Promise<AiStudioUpstreamCatalogFile> {
  const enabledModels = configFile.models.filter(isFalModelConfigEnabled);
  const endpointIds = enabledModels.map(normalizeFalEndpointId);
  const results = await mapWithConcurrency(
    endpointIds,
    getAiStudioFetchConcurrency(Boolean(getFalApiKey())),
    (endpointId) => fetchFalModel(endpointId),
    getAiStudioFetchIntervalMs(),
  );
  const models: FalApiModel[] = [];
  const modelConfigs: AiStudioFalModelConfig[] = [];
  const failures: string[] = [];

  for (const [index, result] of results.entries()) {
    const endpointId = endpointIds[index] ?? "unknown";
    if (result.status === "fulfilled") {
      models.push(result.value);
      modelConfigs.push(enabledModels[index]!);
      continue;
    }

    failures.push(`${endpointId}: ${getErrorMessage(result.reason)}`);
  }

  if (failures.length > 0) {
    console.warn(
      `Skipped ${failures.length} AI Studio fal catalog models that could not be fetched:`,
    );
    for (const failure of failures) {
      console.warn(`- ${failure}`);
    }
  }

  if (enabledModels.length > 0 && models.length === 0) {
    throw new Error("Unable to build AI Studio fal catalog: all models failed to fetch");
  }

  if (
    enabledModels.length > 0 &&
    failures.length / enabledModels.length > getAiStudioFetchMaxFailureRatio()
  ) {
    throw new Error(
      `Unable to build AI Studio fal catalog: ${failures.length}/${enabledModels.length} models failed to fetch`,
    );
  }

  return parseFalCatalogModels(
    {
      ...configFile,
      models: modelConfigs,
    },
    models,
  );
}

function hasPricingOverrideIntent(bucket: AiStudioPricingOverrideBucket | undefined) {
  return Boolean(
    bucket?.price_key ||
      bucket?.price_map ||
      bucket?.price_final ||
      bucket?.billing_adapter ||
      bucket?.docUrl ||
      bucket?.price_txt,
  );
}

function cloneFormUiOverride(
  value: AiStudioFormUiModelOverride | undefined,
): AiStudioFormUiModelOverride | undefined {
  if (!value) {
    return undefined;
  }

  return {
    ...(Array.isArray(value.fieldOrder)
      ? { fieldOrder: [...value.fieldOrder] }
      : {}),
    ...(Array.isArray(value.advancedFields)
      ? { advancedFields: [...value.advancedFields] }
      : {}),
    ...(Array.isArray(value.hiddenFields)
      ? { hiddenFields: [...value.hiddenFields] }
      : {}),
  };
}

function clonePricingConfig(
  value: AiStudioPricingConfig | undefined,
): AiStudioPricingConfig | undefined {
  if (!value) {
    return undefined;
  }

  return structuredClone(value);
}

function cloneDetail(detail: AiStudioDocDetail): AiStudioDocDetail {
  return {
    ...detail,
    requestSchema: detail.requestSchema
      ? structuredClone(detail.requestSchema)
      : detail.requestSchema,
    examplePayload: structuredClone(detail.examplePayload),
    formUi: cloneFormUiOverride(detail.formUi),
    pricing: clonePricingConfig(detail.pricing),
    resultArtifacts: detail.resultArtifacts
      ? structuredClone(detail.resultArtifacts)
      : undefined,
  };
}

function resolveCompiledRuntimeDetail(
  modelId: string,
  upstreamById: Map<string, AiStudioDocDetail>,
  modelOverrides: AiStudioModelOverridesFile,
) {
  const upstreamItem = upstreamById.get(modelId);
  if (upstreamItem) {
    return applyModelOverrideToDetail(cloneDetail(upstreamItem), modelOverrides.models[modelId]);
  }

  const splitSource = Object.entries(modelOverrides.models).find(([, override]) =>
    override.splitModels?.some((splitModel) => splitModel.id === modelId),
  );

  if (!splitSource) {
    return null;
  }

  const splitModel = splitSource[1].splitModels?.find((item) => item.id === modelId);
  if (!splitModel) {
    return null;
  }

  return createSplitModelDetail(upstreamById.get(splitSource[0])!, splitModel);
}

function getSchemaOverrideTarget(
  requestSchema: Record<string, any> | null,
  overridePath: string,
) {
  const segments = overridePath.split(".").filter(Boolean);
  if (segments.length === 0 || !requestSchema) {
    return null;
  }

  let current: Record<string, any> | null = requestSchema;
  for (const segment of segments.slice(0, -1)) {
    if (!current) {
      return null;
    }
    const nextValue: unknown = current[segment];
    if (!nextValue || typeof nextValue !== "object" || Array.isArray(nextValue)) {
      return null;
    }
    current = nextValue as Record<string, any>;
  }

  return current
    ? {
        parent: current,
        key: segments[segments.length - 1]!,
      }
    : null;
}

function applySchemaOverridesToDetail(
  detail: AiStudioDocDetail,
  override: AiStudioSchemaModelOverride | undefined,
) {
  if (override?.replace !== undefined) {
    detail.requestSchema =
      override.replace && typeof override.replace === "object"
        ? (structuredClone(override.replace) as Record<string, any>)
        : null;
  }

  if (!override?.set || !detail.requestSchema) {
    return;
  }

  for (const [overridePath, value] of Object.entries(override.set)) {
    const target = getSchemaOverrideTarget(detail.requestSchema, overridePath);
    if (!target) {
      continue;
    }
    target.parent[target.key] = structuredClone(value);
    const rootPropertyMatch = overridePath.match(/^properties\.([^.]+)$/);
    if (
      rootPropertyMatch?.[1] &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "default" in value
    ) {
      detail.examplePayload[rootPropertyMatch[1]] = structuredClone(
        (value as Record<string, unknown>).default,
      );
    }
  }
}

function mergeAiStudioUpstreamCatalogFiles(
  files: AiStudioUpstreamCatalogFile[],
): AiStudioUpstreamCatalogFile {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items: files.flatMap((file) => file.items.map(cloneDetail)),
  };
}

function rewriteSchemaModel(detail: AiStudioDocDetail, schemaModel: string) {
  detail.modelKeys = [schemaModel];
  detail.examplePayload = {
    ...detail.examplePayload,
    model: schemaModel,
  };

  const modelSchema = detail.requestSchema?.properties?.model;
  if (modelSchema && typeof modelSchema === "object") {
    modelSchema.default = schemaModel;
    modelSchema.enum = [schemaModel];
    modelSchema.examples = [schemaModel];
    modelSchema.description =
      `The model name to use for generation. Required field.\n\n- Must be \`${schemaModel}\` for this endpoint`;
  }

  return detail;
}

function applyPricingOverridesToDetail(
  detail: AiStudioDocDetail,
  bucket: AiStudioPricingOverrideBucket,
) {
  const errors = validatePricingOverrideBucket(detail.id, bucket);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  if (!bucket.price_key || !bucket.price_map || !bucket.price_final) {
    return detail;
  }

  detail.pricing = {
    ...(bucket.docUrl ? { docUrl: bucket.docUrl } : {}),
    ...(bucket.price_txt ? { price_txt: bucket.price_txt } : {}),
    ...(bucket.billing_adapter ? { billing_adapter: bucket.billing_adapter } : {}),
    price_key: bucket.price_key,
    price_map: { ...bucket.price_map },
    price_final: bucket.price_final,
    ...(bucket.notes ? { notes: bucket.notes } : {}),
  };
  return detail;
}

function validatePricingOverrideBucket(
  modelId: string,
  bucket: AiStudioPricingOverrideBucket,
) {
  const errors: string[] = [];
  if (!hasPricingOverrideIntent(bucket)) {
    return errors;
  }

  if (bucket.billing_adapter && !isAiStudioBillingAdapter(bucket.billing_adapter)) {
    errors.push(`Unknown billing_adapter for pricing override: ${modelId} -> ${bucket.billing_adapter}`);
  }

  if (!bucket.price_key || !bucket.price_map || !bucket.price_final) {
    errors.push(`Incomplete pricing override for model: ${modelId}`);
  }

  return errors;
}

function applyModelOverrideToDetail(
  detail: AiStudioDocDetail,
  override: AiStudioModelOverride | undefined,
) {
  if (!override) {
    return detail;
  }

  if (override.alias !== undefined) {
    detail.alias = override.alias;
  }
  if (override.title) {
    detail.title = override.title;
  }
  if (override.provider) {
    detail.provider = override.provider;
  }
  if (override.schemaModel) {
    rewriteSchemaModel(detail, override.schemaModel);
  }
  if (override.resultArtifacts) {
    detail.resultArtifacts = structuredClone(override.resultArtifacts);
  }

  return detail;
}

function applyFormUiOverrideToDetail(
  detail: AiStudioDocDetail,
  override: AiStudioFormUiModelOverride | undefined,
) {
  if (!override) {
    return detail;
  }

  detail.formUi = cloneFormUiOverride(override);
  return detail;
}

function createSplitModelDetail(
  rawDetail: AiStudioDocDetail,
  splitModel: AiStudioSplitModelOverride,
) {
  const detail = cloneDetail(rawDetail);
  detail.id = splitModel.id;
  detail.title = splitModel.title;
  detail.alias = splitModel.alias ?? null;
  detail.provider = splitModel.provider ?? detail.provider;
  rewriteSchemaModel(detail, splitModel.schemaModel);
  return detail;
}

export function compileAiStudioRuntimeCatalog({
  upstream,
  modelOverrides,
  pricingOverrides,
  formUiOverrides = { models: {} },
  schemaOverrides = { models: {} },
}: CompileRuntimeCatalogInput): AiStudioCompiledCatalogFile {
  const items = upstream.items.flatMap((rawDetail) => {
    const modelOverride = modelOverrides.models[rawDetail.id];
    if (modelOverride?.enabled === false) {
      return [];
    }

    if ((modelOverride?.splitModels?.length ?? 0) > 0) {
      return (modelOverride!.splitModels ?? []).map((splitModel) => {
        const detail = createSplitModelDetail(rawDetail, splitModel);
        const pricingOverrideBucket = pricingOverrides.models[detail.id];
        if (hasPricingOverrideIntent(pricingOverrideBucket)) {
          applyPricingOverridesToDetail(detail, pricingOverrideBucket);
        }
        applySchemaOverridesToDetail(detail, schemaOverrides.models[detail.id]);
        applyFormUiOverrideToDetail(detail, formUiOverrides.models[detail.id]);
        return detail;
      });
    }

    const detail = applyModelOverrideToDetail(cloneDetail(rawDetail), modelOverride);
    const pricingOverrideBucket = pricingOverrides.models[detail.id];
    if (hasPricingOverrideIntent(pricingOverrideBucket)) {
      applyPricingOverridesToDetail(detail, pricingOverrideBucket);
    }
    applySchemaOverridesToDetail(detail, schemaOverrides.models[detail.id]);
    applyFormUiOverrideToDetail(detail, formUiOverrides.models[detail.id]);

    return [detail];
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

export function validateAiStudioRuntimeBuildInput({
  upstream,
  modelOverrides,
  pricingOverrides,
  formUiOverrides = { models: {} },
  schemaOverrides = { models: {} },
}: CompileRuntimeCatalogInput) {
  const errors: string[] = [];
  const knownModelIds = new Set<string>();
  const compiledModelIds = new Set<string>();
  const upstreamById = new Map<string, AiStudioDocDetail>();

  for (const item of upstream.items) {
    if (knownModelIds.has(item.id)) {
      errors.push(`Duplicate upstream model id: ${item.id}`);
    }
    knownModelIds.add(item.id);
    upstreamById.set(item.id, item);
  }

  for (const [modelId, override] of Object.entries(modelOverrides.models)) {
    if (!knownModelIds.has(modelId)) {
      errors.push(`Model override targets unknown model: ${modelId}`);
      continue;
    }

    const upstreamItem = upstreamById.get(modelId)!;
    if ((override.splitModels?.length ?? 0) > 0) {
      for (const splitModel of override.splitModels ?? []) {
        if (knownModelIds.has(splitModel.id) || compiledModelIds.has(splitModel.id)) {
          errors.push(`Split model id collides with another model id: ${splitModel.id}`);
        }
        compiledModelIds.add(splitModel.id);

        const splitDetail = createSplitModelDetail(upstreamItem, splitModel);
        void splitDetail;
      }
      continue;
    }

    compiledModelIds.add(modelId);
  }

  for (const modelId of knownModelIds) {
    const override = modelOverrides.models[modelId];
    if ((override?.enabled === false) || (override?.splitModels?.length ?? 0) > 0) {
      continue;
    }
    compiledModelIds.add(modelId);
  }

  for (const [modelId, bucket] of Object.entries(pricingOverrides.models)) {
    if (!compiledModelIds.has(modelId)) {
      errors.push(`Pricing override targets unknown model: ${modelId}`);
      continue;
    }

    const item = resolveCompiledRuntimeDetail(modelId, upstreamById, modelOverrides);

    if (!item) {
      errors.push(`Pricing override targets unknown model: ${modelId}`);
      continue;
    }

    errors.push(...validatePricingOverrideBucket(modelId, bucket));
  }

  for (const [modelId] of Object.entries(formUiOverrides.models)) {
    if (!compiledModelIds.has(modelId)) {
      errors.push(`Form UI override targets unknown model: ${modelId}`);
    }
  }

  for (const [modelId, override] of Object.entries(schemaOverrides.models)) {
    if (!compiledModelIds.has(modelId)) {
      errors.push(`Schema override targets unknown model: ${modelId}`);
      continue;
    }

    const item = resolveCompiledRuntimeDetail(modelId, upstreamById, modelOverrides);
    if (!item) {
      errors.push(`Schema override targets unknown model: ${modelId}`);
      continue;
    }

    if (override.replace !== undefined) {
      item.requestSchema =
        override.replace && typeof override.replace === "object"
          ? (structuredClone(override.replace) as Record<string, any>)
          : null;
    }

    for (const overridePath of Object.keys(override.set ?? {})) {
      if (!getSchemaOverrideTarget(item.requestSchema, overridePath)) {
        errors.push(`Schema override path does not exist for model: ${modelId} -> ${overridePath}`);
      }
    }
  }

  return errors;
}

export function validateAiStudioRuntimeCatalog(file: AiStudioCompiledCatalogFile) {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const item of file.items) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate runtime model id: ${item.id}`);
    }
    ids.add(item.id);
  }

  return errors;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readJsonFileOrDefault<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function loadAiStudioUpstreamCatalogFile(
  filePath = getAiStudioCatalogPaths().upstreamCatalogPath,
) {
  return readJsonFile<AiStudioUpstreamCatalogFile>(filePath);
}

export async function loadAiStudioFalModelsFile(
  filePath = getAiStudioCatalogPaths().falModelsPath,
) {
  return readJsonFileOrDefault<AiStudioFalModelsFile>(filePath, {
    version: 1,
    models: [],
  });
}

export async function loadAiStudioMergedUpstreamCatalogFiles(
  filePath = getAiStudioCatalogPaths().upstreamCatalogPath,
) {
  const upstreamDir = path.dirname(filePath);
  const primaryName = path.basename(filePath);
  const entries = await readdir(upstreamDir, {
    withFileTypes: true,
  });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => {
      if (left === primaryName) return -1;
      if (right === primaryName) return 1;
      return left.localeCompare(right);
    });

  const files = await Promise.all(
    fileNames.map((name) =>
      readJsonFile<AiStudioUpstreamCatalogFile>(path.join(upstreamDir, name)),
    ),
  );

  return mergeAiStudioUpstreamCatalogFiles(
    files.filter(
      (file): file is AiStudioUpstreamCatalogFile => Array.isArray(file?.items),
    ),
  );
}

export async function loadAiStudioModelOverridesFile(
  filePath = getAiStudioCatalogPaths().modelOverridesPath,
) {
  return readJsonFileOrDefault<AiStudioModelOverridesFile>(filePath, {
    models: {},
  });
}

export async function loadAiStudioPricingOverridesFile(
  filePath = getAiStudioCatalogPaths().pricingOverridesPath,
) {
  return readJsonFileOrDefault<AiStudioPricingOverridesFile>(filePath, {
    models: {},
  });
}

export async function loadAiStudioFormUiOverridesFile(
  filePath = getAiStudioCatalogPaths().formUiOverridesPath,
) {
  return readJsonFileOrDefault<AiStudioFormUiOverridesFile>(filePath, {
    models: {},
  });
}

export async function loadAiStudioSchemaOverridesFile(
  filePath = getAiStudioCatalogPaths().schemaOverridesPath,
) {
  return readJsonFileOrDefault<AiStudioSchemaOverridesFile>(filePath, {
    models: {},
  });
}

export async function loadAiStudioRuntimeCatalogFile(
  filePath = getAiStudioCatalogPaths().runtimeCatalogPath,
) {
  return readJsonFile<AiStudioCompiledCatalogFile>(filePath);
}

export function toAiStudioCatalogEntries(file: AiStudioCompiledCatalogFile) {
  return file.items.map<AiStudioCatalogEntry>((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    alias: item.alias,
    docUrl: item.docUrl,
    provider: item.provider,
    pricing: clonePricingConfig(item.pricing),
  }));
}

export async function getCachedAiStudioCatalog() {
  const runtimeFile = await getCachedAiStudioRuntimeCatalog();
  return toAiStudioCatalogEntries(runtimeFile);
}

export function findAiStudioCatalogEntryById<
  T extends Pick<AiStudioCatalogEntry, "id" | "category" | "alias">,
>(entries: T[], id: string) {
  const candidateIds = new Set<string>();

  const addCandidate = (value: string) => {
    if (!value) {
      return;
    }

    candidateIds.add(value);

    if (!value.endsWith("-standard")) {
      candidateIds.add(`${value}-standard`);
    }

    const separatorIndex = value.indexOf(":");
    if (separatorIndex <= 0) {
      return;
    }

    const category = value.slice(0, separatorIndex);
    const modelHandle = value.slice(separatorIndex + 1);
    if (!modelHandle.includes("/")) {
      return;
    }

    const normalized = `${category}:${normalizeModelHandle(modelHandle)}`;
    candidateIds.add(normalized);
    if (!normalized.endsWith("-standard")) {
      candidateIds.add(`${normalized}-standard`);
    }
  };

  addCandidate(id);

  try {
    addCandidate(decodeURIComponent(id));
  } catch {
    // ignore invalid percent-encoding
  }

  for (const candidateId of candidateIds) {
    const match = entries.find(
      (entry) =>
        entry.id === candidateId || getAiStudioPublicModelId(entry) === candidateId,
    );
    if (match) {
      return match;
    }
  }

  return null;
}

export async function getCachedAiStudioCatalogEntry(id: string) {
  const entries = await getCachedAiStudioCatalog();
  return findAiStudioCatalogEntryById(entries, id);
}

export async function getCachedAiStudioCatalogDetail(id: string) {
  const runtimeFile = await getCachedAiStudioRuntimeCatalog();
  const entry = await getCachedAiStudioCatalogEntry(id);
  if (!entry) {
    return null;
  }

  const detail = runtimeFile.items.find((item) => item.id === entry.id);
  if (!detail) {
    return null;
  }

  return cloneDetail(detail);
}

async function getCachedAiStudioRuntimeCatalog() {
  const filePath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;

  if (!filePath) {
    if (
      runtimeCatalogCache &&
      runtimeCatalogCache.filePath === BUNDLED_AI_STUDIO_RUNTIME_CATALOG_CACHE_KEY
    ) {
      return runtimeCatalogCache.file;
    }

    const file = getBundledAiStudioRuntimeCatalog();
    runtimeCatalogCache = {
      filePath: BUNDLED_AI_STUDIO_RUNTIME_CATALOG_CACHE_KEY,
      mtimeMs: 0,
      file,
    };
    return file;
  }

  const stats = await stat(filePath);

  if (
    runtimeCatalogCache &&
    runtimeCatalogCache.filePath === filePath &&
    runtimeCatalogCache.mtimeMs === stats.mtimeMs
  ) {
    return runtimeCatalogCache.file;
  }

  const file = await loadAiStudioRuntimeCatalogFile(filePath);
  runtimeCatalogCache = {
    filePath,
    mtimeMs: stats.mtimeMs,
    file,
  };
  return file;
}
