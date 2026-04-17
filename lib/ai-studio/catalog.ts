import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import bundledAiStudioRuntimeCatalog from "@/config/ai-studio/runtime/catalog.json";
import {
  type AiStudioStructuredKiePriceFile,
  buildAiStudioStructuredKiePrices,
} from "@/lib/ai-studio/kie-pricing";

export type AiStudioCategory = "image" | "video" | "music" | "chat";

export interface AiStudioCatalogSeedEntry {
  id: string;
  category: AiStudioCategory;
  title: string;
  docUrl: string;
  provider: string;
  alias?: string | null;
}

export interface AiStudioPricingRow {
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
  usdPrice: string;
  falPrice: string;
  discountRate: number;
  anchor: string;
  discountPrice: boolean;
  pricingKey?: string;
  catalogModelId?: string | null;
  runtimeModel?: string | null;
  resolution?: string | null;
  duration?: number | null;
  audio?: boolean | null;
  aspectRatio?: string | null;
  source?: string | null;
}

export interface AiStudioPricingSelectors {
  resolution?: string[];
  duration?: string[];
  audio?: string[];
  aspectRatio?: string[];
}

export interface AiStudioPricingConfig {
  strategy?: "exact";
  selectors?: AiStudioPricingSelectors;
}

export interface AiStudioDocDetail extends AiStudioCatalogSeedEntry {
  vendor?: string;
  endpoint: string;
  method: string;
  modelKeys: string[];
  requestSchema: Record<string, any> | null;
  examplePayload: Record<string, any>;
  pricingRows: AiStudioPricingRow[];
  statusEndpoint?: string | null;
  formUi?: AiStudioFormUiModelOverride;
  pricing?: AiStudioPricingConfig;
}

export interface AiStudioCatalogEntry extends AiStudioCatalogSeedEntry {
  pricingRows: AiStudioPricingRow[];
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
}

export interface AiStudioPricingRowMatch {
  runtimeModel?: string;
  modelDescriptionIncludes?: string;
  provider?: string;
}

export interface AiStudioSplitModelOverride {
  id: string;
  title: string;
  alias?: string | null;
  provider?: string;
  schemaModel: string;
  pricingMatch: AiStudioPricingRowMatch;
}

export interface AiStudioModelOverridesFile {
  models: Record<string, AiStudioModelOverride>;
}

export interface AiStudioPricingOverrideBucket {
  addRows?: AiStudioPricingRow[];
}

export interface AiStudioPricingOverridesFile {
  models: Record<string, AiStudioPricingOverrideBucket>;
}

export interface AiStudioFormUiModelOverride {
  fieldOrder?: string[];
  advancedFields?: string[];
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

type CompileRuntimeCatalogInput = {
  upstream: AiStudioUpstreamCatalogFile;
  kiePrices?: AiStudioStructuredKiePriceFile;
  modelOverrides: AiStudioModelOverridesFile;
  pricingOverrides: AiStudioPricingOverridesFile;
  formUiOverrides?: AiStudioFormUiOverridesFile;
  schemaOverrides?: AiStudioSchemaOverridesFile;
};

const LLMS_INDEX_URL = "https://docs.kie.ai/llms.txt";
const OFFICIAL_PRICING_COUNT_URL =
  "https://api.kie.ai/client/v1/model-pricing/count";
const OFFICIAL_PRICING_PAGE_URL =
  "https://api.kie.ai/client/v1/model-pricing/page";

const DOC_LINE_PATTERN =
  /^- (?:(Image|Video|Music|Chat)\s+Models?\s+>\s+.+?|4o Image API|Flux Kontext API|Runway API(?: > Aleph)?|Veo3\.1 API|Suno API(?: > .+?)?) \[(.+?)\]\((https:\/\/docs\.kie\.ai\/(?!cn\/)[^)]+\.md)\):/;

const USER_AGENT =
  "Mozilla/5.0 (compatible; Nexty AiStudio Catalog Sync/1.0; +https://nexty.dev)";
const DEFAULT_AI_STUDIO_DATA_DIR = path.join(process.cwd(), "config", "ai-studio");

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
    kieRawPricePath:
      process.env.AI_STUDIO_KIE_RAW_PRICE_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "kie_price.json"),
    kiePricesPath:
      process.env.AI_STUDIO_KIE_PRICES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "kie_prices.json"),
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

function normalizeTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
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
    "Download URL",
    "Get 1080P",
    "Get 4K",
    "Get Direct Download URL",
    "Get Task Details",
  ];
  const blockedUrlFragments = [
    "/quickstart",
    "/callbacks",
    "/get-",
    "/download-url",
    "/webhook-verification",
  ];

  return (
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

function buildAliases(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
) {
  const aliases = new Set<string>();
  const docSlug = entry.docUrl.split("/").pop()?.replace(/\.md$/, "") ?? "";
  const docFamily = entry.docUrl.split("/").at(-2) ?? "";
  const cleanedProvider = stripApiSuffix(entry.provider);

  aliases.add(normalizeLoose(entry.title));
  aliases.add(normalizeLoose(entry.provider));
  aliases.add(normalizeLoose(cleanedProvider));
  aliases.add(normalizeLoose(docSlug));
  aliases.add(normalizeLoose(stripApiSuffix(docFamily)));

  for (const modelKey of entry.modelKeys ?? []) {
    aliases.add(normalizeLoose(modelKey));
    aliases.add(normalizeLoose(`${entry.title} ${modelKey}`));
  }

  return [...aliases].filter((alias) => alias.length >= 4);
}

export function extractPricingAnchorModel(anchor: string) {
  try {
    const url = new URL(anchor);
    return url.searchParams.get("model") ?? "";
  } catch {
    return "";
  }
}

const GENERIC_MODEL_HANDLES = new Set([
  "api",
  "model",
  "generate",
  "create",
  "chat",
  "image",
  "video",
  "music",
]);

const GENERIC_OPERATION_HANDLES = new Set([
  "text-to-video",
  "image-to-video",
  "reference-to-video",
  "video-to-video",
  "extend",
  "upscale",
  "text-to-image",
  "image-to-image",
  "inpaint",
  "outpaint",
  "edit",
  "chat",
  "music",
  "text-to-music",
]);

function isSpecificModelHandle(handle: string) {
  if (handle.length < 4 || GENERIC_MODEL_HANDLES.has(handle)) {
    return false;
  }

  const [firstSegment] = handle.split("-");
  return Boolean(
    firstSegment &&
      !GENERIC_MODEL_HANDLES.has(firstSegment) &&
      !GENERIC_OPERATION_HANDLES.has(handle),
  );
}

function isGenericOperationHandle(handle: string) {
  return GENERIC_OPERATION_HANDLES.has(handle);
}

function getDocFamilyHandle(docUrl: string) {
  const docFamily = normalizeModelHandle(docUrl.split("/").at(-2) ?? "");
  return isSpecificModelHandle(docFamily) ? docFamily : "";
}

function getEntryFamilyHandles(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
) {
  const handles = new Set<string>();
  const docFamily = getDocFamilyHandle(entry.docUrl);

  if (docFamily) {
    handles.add(docFamily);
  }

  for (const source of [entry.provider, stripApiSuffix(entry.provider), entry.title]) {
    const normalized = normalizeModelHandle(source);
    if (isSpecificModelHandle(normalized)) {
      handles.add(normalized);
    }
  }

  for (const modelKey of entry.modelKeys ?? []) {
    const normalized = normalizeModelHandle(modelKey);
    const operationHandle = [...GENERIC_OPERATION_HANDLES].find((handle) =>
      normalized.includes(handle),
    );
    if (operationHandle) {
      const family = normalized.replace(`-${operationHandle}`, "").replace(/-+$/g, "");
      if (isSpecificModelHandle(family)) {
        handles.add(family);
      }
    }
  }

  return [...handles];
}

function getEntryModelHandles(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
) {
  const handles = new Set<string>();
  const docSlug = normalizeModelHandle(
    entry.docUrl.split("/").pop()?.replace(/\.md$/, "") ?? "",
  );

  for (const modelKey of entry.modelKeys ?? []) {
    const handle = normalizeModelHandle(modelKey);
    if (handle.length >= 2 && !GENERIC_MODEL_HANDLES.has(handle)) {
      handles.add(handle);
    }
  }

  if (isSpecificModelHandle(docSlug)) {
    handles.add(docSlug);
  }

  return [...handles];
}

function getEntryOperationHandles(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
) {
  const handles = new Set<string>();
  const docSlug = normalizeModelHandle(
    entry.docUrl.split("/").pop()?.replace(/\.md$/, "") ?? "",
  );

  if (isGenericOperationHandle(docSlug)) {
    handles.add(docSlug);
  }

  for (const modelKey of entry.modelKeys ?? []) {
    const normalized = normalizeModelHandle(modelKey);
    for (const handle of GENERIC_OPERATION_HANDLES) {
      if (normalized.includes(handle)) {
        handles.add(handle);
      }
    }
  }

  for (const handle of GENERIC_OPERATION_HANDLES) {
    if (normalizeModelHandle(entry.title).includes(handle)) {
      handles.add(handle);
    }
  }

  return [...handles];
}

function rowContainsAnyHandle(
  row: AiStudioPricingRow,
  handles: string[],
  anchorModel: string,
) {
  if (handles.length === 0) {
    return false;
  }

  const descriptionHandle = normalizeModelHandle(row.modelDescription);
  const providerHandle = normalizeModelHandle(row.provider);
  const anchorHandle = normalizeModelHandle(row.anchor);
  const descriptionLoose = normalizeLoose(row.modelDescription);
  const providerLoose = normalizeLoose(row.provider);
  const anchorLoose = normalizeLoose(row.anchor);
  const anchorModelLoose = normalizeLoose(anchorModel);

  return handles.some(
    (handle) => {
      const looseHandle = normalizeLoose(handle);
      return (
        descriptionHandle.includes(handle) ||
        providerHandle.includes(handle) ||
        anchorHandle.includes(handle) ||
        anchorModel.includes(handle) ||
        descriptionLoose.includes(looseHandle) ||
        providerLoose.includes(looseHandle) ||
        anchorLoose.includes(looseHandle) ||
        anchorModelLoose.includes(looseHandle)
      );
    },
  );
}

function extractOperationHandlesFromText(value: string) {
  const normalized = normalizeModelHandle(value);
  return [...GENERIC_OPERATION_HANDLES].filter((handle) => normalized.includes(handle));
}

function getRowOperationHandles(row: AiStudioPricingRow, anchorModel: string) {
  const descriptionHandles = extractOperationHandlesFromText(row.modelDescription);
  if (descriptionHandles.length > 0) {
    return descriptionHandles;
  }

  const anchorModelHandles = extractOperationHandlesFromText(anchorModel);
  if (anchorModelHandles.length > 0) {
    return anchorModelHandles;
  }

  return extractOperationHandlesFromText(row.anchor);
}

function runtimeModelMatchesEntry(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "category" | "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
  runtimeModel: string,
) {
  const normalized = normalizeModelHandle(runtimeModel);
  const normalizedLoose = normalizeLoose(runtimeModel);
  const modelHandles = getEntryModelHandles(entry);
  const familyHandles = getEntryFamilyHandles(entry);
  const operationHandles = getEntryOperationHandles(entry);

  if (modelHandles.length > 0) {
    const hasSpecificMatch = modelHandles.some(
      (handle) =>
        normalized === handle ||
        normalized.startsWith(`${handle}-`) ||
        handle.startsWith(`${normalized}-`),
    );
    if (!hasSpecificMatch) {
      return false;
    }
  }

  if (familyHandles.length > 0) {
    const hasFamilyMatch = familyHandles.some((handle) => {
      const looseHandle = normalizeLoose(handle);
      return normalized.includes(handle) || normalizedLoose.includes(looseHandle);
    });
    if (!hasFamilyMatch) {
      return false;
    }
  }

  if (operationHandles.length > 0) {
    const hasOperationMatch = operationHandles.some((handle) =>
      normalized.includes(handle),
    );
    if (!hasOperationMatch) {
      return false;
    }
  }

  return true;
}

export function resolvePricingRowRuntimeModel(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "category" | "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
  row: AiStudioPricingRow,
) {
  if (row.runtimeModel) {
    return row.runtimeModel;
  }

  const anchorModel = extractPricingAnchorModel(row.anchor);
  if (!anchorModel) {
    return entry.modelKeys?.[0] ?? null;
  }

  if (runtimeModelMatchesEntry(entry, anchorModel)) {
    return anchorModel;
  }

  if ((entry.modelKeys?.length ?? 0) === 1) {
    return entry.modelKeys?.[0] ?? null;
  }

  return anchorModel;
}

function scorePricingMatch(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "title" | "provider" | "docUrl" | "category"
  > & { modelKeys?: string[] },
  row: AiStudioPricingRow,
): number {
  if (row.interfaceType.toLowerCase() !== entry.category) {
    return -1;
  }

  const description = normalizeLoose(row.modelDescription);
  const anchor = normalizeLoose(row.anchor);
  const anchorModel = normalizeModelHandle(extractPricingAnchorModel(row.anchor));
  const aliases = buildAliases(entry);
  const modelHandles = getEntryModelHandles(entry);
  const familyHandles = getEntryFamilyHandles(entry);
  const operationHandles = getEntryOperationHandles(entry);
  const rowOperationHandles = getRowOperationHandles(row, anchorModel);

  let score = 0;
  if (familyHandles.length > 0 && !rowContainsAnyHandle(row, familyHandles, anchorModel)) {
    return -1;
  }

  if (operationHandles.length > 0) {
    if (rowOperationHandles.length > 0) {
      const hasOperationMatch = operationHandles.some((handle) =>
        rowOperationHandles.includes(handle),
      );
      if (!hasOperationMatch) {
        return -1;
      }
    } else if (!rowContainsAnyHandle(row, operationHandles, anchorModel)) {
      return -1;
    }
  }

  if (modelHandles.length > 0 && anchorModel) {
    const exactMatch = modelHandles.some((handle) => anchorModel === handle);
    const prefixMatch = modelHandles.some(
      (handle) =>
        anchorModel.startsWith(`${handle}-`) || handle.startsWith(`${anchorModel}-`),
    );

    if (exactMatch) {
      score += 120;
    } else if (prefixMatch) {
      score += 80;
    } else {
      return -1;
    }
  }

  for (const alias of aliases) {
    if (description.includes(alias) || alias.includes(description)) {
      score += alias.length >= 10 ? 6 : 4;
    }
    if (anchor && (anchor.includes(alias) || alias.includes(anchor))) {
      score += alias.length >= 8 ? 5 : 3;
    }
  }

  const descriptionTokens = new Set(normalizeTokens(row.modelDescription));
  const entryTokens = new Set(
    normalizeTokens(
      `${entry.title} ${entry.provider} ${(entry.modelKeys ?? []).join(" ")} ${entry.docUrl}`,
    ),
  );
  let shared = 0;
  for (const token of entryTokens) {
    if (descriptionTokens.has(token)) {
      shared += 1;
    }
  }

  score += shared;
  return score;
}

function canonicalizePricingDescription(input: string) {
  return input
    .toLowerCase()
    .replace(/(\d+)\.0(?=s\b)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumericString(input: string) {
  const value = Number.parseFloat(input);
  return Number.isFinite(value) ? String(value) : input.trim();
}

function dedupeMatchedPricingRows(rows: AiStudioPricingRow[]) {
  const seen = new Set<string>();
  const deduped: AiStudioPricingRow[] = [];

  for (const row of rows) {
    const key = [
      row.pricingKey ?? "",
      row.catalogModelId ?? "",
      normalizeLoose(row.provider),
      row.interfaceType.toLowerCase(),
      canonicalizePricingDescription(row.modelDescription),
      normalizeModelHandle(row.runtimeModel ?? extractPricingAnchorModel(row.anchor)),
      row.resolution ?? "",
      row.aspectRatio ?? "",
      row.duration ?? "",
      row.audio ?? "",
      normalizeNumericString(row.creditPrice),
      row.creditUnit.toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(row);
  }

  return deduped;
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
    pricingRows: [],
  };
}

export function matchPricingRowsToEntry(
  entry: Pick<
    AiStudioCatalogSeedEntry,
    "category" | "title" | "provider" | "docUrl"
  > & { modelKeys?: string[] },
  pricingRows: AiStudioPricingRow[],
): AiStudioPricingRow[] {
  return dedupeMatchedPricingRows(
    pricingRows
    .map((row) => ({ row, score: scorePricingMatch(entry, row) }))
    .filter((item) => item.score >= 8)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.row),
  );
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

export async function fetchOfficialPricingRows(): Promise<AiStudioPricingRow[]> {
  const countResponse = await fetch(OFFICIAL_PRICING_COUNT_URL, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!countResponse.ok) {
    throw new Error(
      `Failed to fetch official pricing count: ${countResponse.status}`,
    );
  }

  const countJson = (await countResponse.json()) as {
    data?: { all?: number };
  };
  const total = countJson.data?.all ?? 0;
  if (!total) {
    return [];
  }

  const pageSize = 100;
  const pages = Math.ceil(total / pageSize);
  const requests = Array.from({ length: pages }, (_, index) =>
    fetch(OFFICIAL_PRICING_PAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        pageNum: index + 1,
        pageSize,
        modelDescription: "",
        interfaceType: "",
      }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch official pricing page ${index + 1}: ${response.status}`,
        );
      }

      const json = (await response.json()) as {
        data?: { records?: AiStudioPricingRow[] };
      };
      return json.data?.records ?? [];
    }),
  );

  const pagesResult = await Promise.all(requests);
  return pagesResult.flat();
}

export async function fetchAiStudioCatalogSeeds() {
  const indexContent = await fetchText(LLMS_INDEX_URL);
  return parseLlmsIndex(indexContent);
}

export async function getAiStudioCatalog(): Promise<AiStudioCatalogEntry[]> {
  const [seeds, pricingRows] = await Promise.all([
    fetchAiStudioCatalogSeeds(),
    fetchOfficialPricingRows(),
  ]);

  return seeds.map((seed) => ({
    ...seed,
    pricingRows: matchPricingRowsToEntry(seed, pricingRows),
  }));
}

export async function getAiStudioCatalogDetail(
  entry: AiStudioCatalogEntry,
): Promise<AiStudioDocDetail> {
  const markdown = await fetchText(entry.docUrl);
  const detail = parseApiDocMarkdown(entry, markdown);
  detail.pricingRows = entry.pricingRows;
  return detail;
}

export async function buildAiStudioUpstreamCatalog(): Promise<AiStudioUpstreamCatalogFile> {
  const entries = await getAiStudioCatalog();
  const items = await Promise.all(entries.map((entry) => getAiStudioCatalogDetail(entry)));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

function clonePricingRow(row: AiStudioPricingRow): AiStudioPricingRow {
  return {
    ...row,
  };
}

function matchStructuredKieRowsToDetail(
  detail: Pick<AiStudioDocDetail, "id" | "modelKeys">,
  kiePrices: AiStudioStructuredKiePriceFile | undefined,
) {
  if (!kiePrices) {
    return [];
  }

  return kiePrices.rows
    .filter((row) => {
      if (row.catalogModelId) {
        return row.catalogModelId === detail.id;
      }

      return Boolean(
        row.runtimeModel &&
          detail.modelKeys.some((modelKey) => modelKey === row.runtimeModel),
      );
    })
    .map((row) => clonePricingRow(row));
}

function resolveBasePricingRows(
  detail: AiStudioDocDetail,
  kiePrices: AiStudioStructuredKiePriceFile | undefined,
) {
  const structuredRows = matchStructuredKieRowsToDetail(detail, kiePrices);

  if (structuredRows.length > 0) {
    return structuredRows;
  }

  return detail.pricingRows.map(clonePricingRow);
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
  };
}

function clonePricingConfig(
  value: AiStudioPricingConfig | undefined,
): AiStudioPricingConfig | undefined {
  if (!value) {
    return undefined;
  }

  return {
    ...(value.strategy ? { strategy: value.strategy } : {}),
    ...(value.selectors
      ? {
          selectors: {
            ...(Array.isArray(value.selectors.resolution)
              ? { resolution: [...value.selectors.resolution] }
              : {}),
            ...(Array.isArray(value.selectors.duration)
              ? { duration: [...value.selectors.duration] }
              : {}),
            ...(Array.isArray(value.selectors.audio)
              ? { audio: [...value.selectors.audio] }
              : {}),
            ...(Array.isArray(value.selectors.aspectRatio)
              ? { aspectRatio: [...value.selectors.aspectRatio] }
              : {}),
          },
        }
      : {}),
  };
}

const DURATION_SELECTOR_CANDIDATES = [
  "input.duration",
  "duration",
  "input.video_duration",
  "video_duration",
  "input.audio_duration",
  "audio_duration",
  "input.n_frames",
  "input.extend_times",
] as const;

const RESOLUTION_SELECTOR_CANDIDATES = [
  "input.resolution",
  "resolution",
  "input.image_resolution",
  "image_resolution",
  "input.size",
  "size",
  "input.mode",
  "mode",
] as const;

const AUDIO_SELECTOR_CANDIDATES = [
  "input.generate_audio",
  "generate_audio",
  "input.sound",
  "sound",
  "input.audio",
  "audio",
  "input.with_audio",
  "with_audio",
] as const;

const ASPECT_RATIO_SELECTOR_CANDIDATES = [
  "input.aspect_ratio",
  "aspect_ratio",
] as const;

function getSchemaValueAtPath(schema: Record<string, any> | null, path: string) {
  if (!schema) {
    return null;
  }

  const segments = path.split(".").filter(Boolean);
  let current: any = schema;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return null;
    }

    if (segment in current) {
      current = current[segment];
      continue;
    }

    const properties =
      current.properties &&
      typeof current.properties === "object" &&
      !Array.isArray(current.properties)
        ? current.properties
        : null;

    if (properties && segment in properties) {
      current = properties[segment];
      continue;
    }

    return null;
  }

  return current && typeof current === "object" ? current : null;
}

function getSchemaEnumValues(schemaNode: Record<string, any> | null) {
  if (!schemaNode || !Array.isArray(schemaNode.enum)) {
    return [];
  }

  return schemaNode.enum
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().toLowerCase());
}

function collectNormalizedPricingValues(
  rows: AiStudioPricingRow[],
  key: "resolution" | "aspectRatio",
) {
  return new Set(
    rows
      .map((row) => row[key])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase()),
  );
}

function hasPricingDuration(rows: AiStudioPricingRow[]) {
  return rows.some((row) => typeof row.duration === "number" && Number.isFinite(row.duration));
}

function hasPricingAudio(rows: AiStudioPricingRow[]) {
  return rows.some((row) => typeof row.audio === "boolean");
}

function hasEnumOverlap(schemaNode: Record<string, any> | null, values: Set<string>) {
  if (values.size === 0) {
    return false;
  }

  return getSchemaEnumValues(schemaNode).some((value) => values.has(value));
}

function inferSelectorPath(
  schema: Record<string, any> | null,
  candidates: readonly string[],
  matcher?: (schemaNode: Record<string, any> | null, path: string) => boolean,
) {
  for (const path of candidates) {
    const schemaNode = getSchemaValueAtPath(schema, path);
    if (!schemaNode) {
      continue;
    }
    if (!matcher || matcher(schemaNode, path)) {
      return path;
    }
  }

  return null;
}

function inferPricingConfig(detail: AiStudioDocDetail): AiStudioPricingConfig | undefined {
  if (detail.pricingRows.length === 0) {
    return undefined;
  }

  const schema = detail.requestSchema;
  const selectors: AiStudioPricingSelectors = {};
  const resolutionValues = collectNormalizedPricingValues(detail.pricingRows, "resolution");
  const aspectRatioValues = collectNormalizedPricingValues(detail.pricingRows, "aspectRatio");

  if (hasPricingDuration(detail.pricingRows)) {
    const durationPath = inferSelectorPath(schema, DURATION_SELECTOR_CANDIDATES);
    if (durationPath) {
      selectors.duration = [durationPath];
    }
  }

  if (resolutionValues.size > 0) {
    const resolutionPath = inferSelectorPath(
      schema,
      RESOLUTION_SELECTOR_CANDIDATES,
      (schemaNode, path) =>
        path.includes("resolution") || hasEnumOverlap(schemaNode, resolutionValues),
    );
    if (resolutionPath) {
      selectors.resolution = [resolutionPath];
    }
  }

  if (
    aspectRatioValues.size > 0 ||
    getSchemaValueAtPath(schema, "input.aspect_ratio") ||
    getSchemaValueAtPath(schema, "aspect_ratio")
  ) {
    const aspectRatioPath = inferSelectorPath(
      schema,
      ASPECT_RATIO_SELECTOR_CANDIDATES,
      (schemaNode, path) =>
        path.includes("aspect_ratio") || hasEnumOverlap(schemaNode, aspectRatioValues),
    );
    if (aspectRatioPath) {
      selectors.aspectRatio = [aspectRatioPath];
    }
  }

  if (hasPricingAudio(detail.pricingRows)) {
    const audioPath = inferSelectorPath(schema, AUDIO_SELECTOR_CANDIDATES);
    if (audioPath) {
      selectors.audio = [audioPath];
    }
  }

  if (Object.keys(selectors).length === 0) {
    return undefined;
  }

  return {
    strategy: "exact",
    selectors,
  };
}

function applyGeneratedPricingConfigToDetail(detail: AiStudioDocDetail) {
  detail.pricing = inferPricingConfig(detail);
}

function cloneDetail(detail: AiStudioDocDetail): AiStudioDocDetail {
  return {
    ...detail,
    requestSchema: detail.requestSchema
      ? structuredClone(detail.requestSchema)
      : detail.requestSchema,
    examplePayload: structuredClone(detail.examplePayload),
    pricingRows: detail.pricingRows.map(clonePricingRow),
    formUi: cloneFormUiOverride(detail.formUi),
    pricing: clonePricingConfig(detail.pricing),
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

  return (
    buildSplitModelDetails(upstreamById.get(splitSource[0])!, splitSource[1]).find(
      (splitItem) => splitItem.id === modelId,
    ) ?? null
  );
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

function matchesPricingRowMatch(
  entry: AiStudioDocDetail,
  row: AiStudioPricingRow,
  match: AiStudioPricingRowMatch,
) {
  if (match.runtimeModel) {
    const runtimeModel = resolvePricingRowRuntimeModel(entry, row) ?? "";
    if (runtimeModel !== match.runtimeModel) {
      return false;
    }
  }

  if (match.provider) {
    if (row.provider.toLowerCase() !== match.provider.toLowerCase()) {
      return false;
    }
  }

  if (match.modelDescriptionIncludes) {
    if (
      !row.modelDescription
        .toLowerCase()
        .includes(match.modelDescriptionIncludes.toLowerCase())
    ) {
      return false;
    }
  }

  return true;
}

function selectMatchingPricingRows(
  detail: AiStudioDocDetail,
  match: AiStudioPricingRowMatch,
) {
  return detail.pricingRows
    .filter((row) => matchesPricingRowMatch(detail, row, match))
    .map(clonePricingRow);
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
  const hasKieRows = detail.pricingRows.some((row) => row.source === "kie");
  const addRows = hasKieRows ? [] : (bucket.addRows ?? []);

  if (addRows.length === 0) {
    return detail;
  }

  const nextRows: AiStudioPricingRow[] = detail.pricingRows.map(clonePricingRow);

  for (const row of addRows) {
    nextRows.push(clonePricingRow(row));
  }

  detail.pricingRows = nextRows;
  return detail;
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

function buildSplitModelDetails(
  rawDetail: AiStudioDocDetail,
  modelOverride: AiStudioModelOverride,
) {
  return (modelOverride.splitModels ?? []).flatMap((splitModel) => {
    const detail = cloneDetail(rawDetail);
    detail.id = splitModel.id;
    detail.title = splitModel.title;
    detail.alias = splitModel.alias ?? null;
    detail.provider = splitModel.provider ?? detail.provider;
    detail.pricingRows = selectMatchingPricingRows(detail, splitModel.pricingMatch);

    if (detail.pricingRows.length === 0) {
      return [];
    }

    rewriteSchemaModel(detail, splitModel.schemaModel);
    return [detail];
  });
}

export function compileAiStudioRuntimeCatalog({
  upstream,
  kiePrices,
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
      return buildSplitModelDetails(rawDetail, modelOverride!).map((detail) => {
        detail.pricingRows = resolveBasePricingRows(detail, kiePrices);
        const pricingOverrideBucket = pricingOverrides.models[detail.id];
        if ((pricingOverrideBucket?.addRows?.length ?? 0) > 0) {
          applyPricingOverridesToDetail(detail, pricingOverrideBucket);
        }
        applySchemaOverridesToDetail(detail, schemaOverrides.models[detail.id]);
        applyGeneratedPricingConfigToDetail(detail);
        applyFormUiOverrideToDetail(detail, formUiOverrides.models[detail.id]);
        return detail;
      });
    }

    const detail = applyModelOverrideToDetail(cloneDetail(rawDetail), modelOverride);
    detail.pricingRows = resolveBasePricingRows(detail, kiePrices);
    const pricingOverrideBucket = pricingOverrides.models[detail.id];
    if ((pricingOverrideBucket?.addRows?.length ?? 0) > 0) {
      applyPricingOverridesToDetail(detail, pricingOverrideBucket);
    }
    applySchemaOverridesToDetail(detail, schemaOverrides.models[detail.id]);
    applyGeneratedPricingConfigToDetail(detail);
    applyFormUiOverrideToDetail(detail, formUiOverrides.models[detail.id]);

    return [detail];
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
}

function pricingRowKey(entry: AiStudioDocDetail, row: AiStudioPricingRow) {
  return [
    entry.id,
    row.pricingKey ?? "",
    row.catalogModelId ?? "",
    resolvePricingRowRuntimeModel(entry, row) ?? "",
    row.resolution ?? "",
    row.aspectRatio ?? "",
    row.duration ?? "",
    row.audio ?? "",
    normalizeLoose(row.provider),
    row.interfaceType.toLowerCase(),
    canonicalizePricingDescription(row.modelDescription),
    normalizeNumericString(row.creditPrice),
    row.creditUnit.toLowerCase(),
  ].join("|");
}

export function validateAiStudioRuntimeBuildInput({
  upstream,
  kiePrices,
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

        const matchedRows = selectMatchingPricingRows(upstreamItem, splitModel.pricingMatch);
        const matchedStructuredRows =
          kiePrices?.rows.filter((row) => row.catalogModelId === splitModel.id) ?? [];
        if (matchedRows.length === 0 && matchedStructuredRows.length === 0) {
          errors.push(`Split model does not match any pricing rows: ${splitModel.id}`);
        }
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

    item.pricingRows = resolveBasePricingRows(item, kiePrices);
    if (
      (bucket.addRows?.length ?? 0) > 0 &&
      item.pricingRows.some((row) => row.source === "kie")
    ) {
      errors.push(`Pricing addRows should only target models without KIE pricing: ${modelId}`);
    }
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

    item.pricingRows = resolveBasePricingRows(item, kiePrices);

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
  const rowKeys = new Set<string>();

  for (const item of file.items) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate runtime model id: ${item.id}`);
    }
    ids.add(item.id);

    for (const row of item.pricingRows) {
      const key = pricingRowKey(item, row);
      if (rowKeys.has(key)) {
        errors.push(`Duplicate runtime pricing row: ${item.id}`);
      }
      rowKeys.add(key);
    }
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

export async function buildAiStudioKiePricesFile(
  rawPricePath = getAiStudioCatalogPaths().kieRawPricePath,
) {
  const rawFile = await readJsonFile<Record<string, unknown>>(rawPricePath);
  return buildAiStudioStructuredKiePrices(rawFile);
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

export async function loadAiStudioKiePricesFile(
  filePath = getAiStudioCatalogPaths().kiePricesPath,
) {
  return readJsonFileOrDefault<AiStudioStructuredKiePriceFile>(filePath, {
    version: 1,
    generatedAt: "",
    rows: [],
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
    pricingRows: item.pricingRows.map(clonePricingRow),
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
