import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

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
}

export interface AiStudioDocDetail extends AiStudioCatalogSeedEntry {
  endpoint: string;
  method: string;
  modelKeys: string[];
  requestSchema: Record<string, any> | null;
  examplePayload: Record<string, any>;
  pricingRows: AiStudioPricingRow[];
}

export interface AiStudioCatalogEntry extends AiStudioCatalogSeedEntry {
  pricingRows: AiStudioPricingRow[];
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
  splitModels?: AiStudioSplitModelOverride[];
}

export interface AiStudioSplitModelOverride {
  id: string;
  title: string;
  alias?: string | null;
  provider?: string;
  schemaModel: string;
  pricingMatch: NonNullable<AiStudioPricingRowOverride["match"]>;
}

export interface AiStudioModelOverridesFile {
  models: Record<string, AiStudioModelOverride>;
}

export interface AiStudioPricingRowOverride {
  match?: {
    runtimeModel?: string;
    modelDescriptionIncludes?: string;
    provider?: string;
  };
  enabled?: boolean;
  modelDescription?: string;
  provider?: string;
  creditPrice?: string;
  creditUnit?: string;
  usdPrice?: string;
  falPrice?: string;
  discountRate?: number;
  discountPrice?: boolean;
}

export interface AiStudioPricingOverrideBucket {
  rows?: AiStudioPricingRowOverride[];
}

export interface AiStudioPricingOverridesFile {
  models: Record<string, AiStudioPricingOverrideBucket>;
}

type CompileRuntimeCatalogInput = {
  upstream: AiStudioUpstreamCatalogFile;
  modelOverrides: AiStudioModelOverridesFile;
  pricingOverrides: AiStudioPricingOverridesFile;
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

export function getAiStudioCatalogPaths() {
  return {
    upstreamCatalogPath:
      process.env.AI_STUDIO_UPSTREAM_CATALOG_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "upstream", "catalog.json"),
    modelOverridesPath:
      process.env.AI_STUDIO_MODEL_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "models.json"),
    pricingOverridesPath:
      process.env.AI_STUDIO_PRICING_OVERRIDES_PATH ??
      path.join(DEFAULT_AI_STUDIO_DATA_DIR, "overrides", "pricing.json"),
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
      normalizeLoose(row.provider),
      row.interfaceType.toLowerCase(),
      canonicalizePricingDescription(row.modelDescription),
      normalizeModelHandle(extractPricingAnchorModel(row.anchor)),
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

function cloneDetail(detail: AiStudioDocDetail): AiStudioDocDetail {
  return {
    ...detail,
    requestSchema: detail.requestSchema
      ? structuredClone(detail.requestSchema)
      : detail.requestSchema,
    examplePayload: structuredClone(detail.examplePayload),
    pricingRows: detail.pricingRows.map(clonePricingRow),
  };
}

function matchesPricingOverride(
  entry: AiStudioDocDetail,
  row: AiStudioPricingRow,
  override: AiStudioPricingRowOverride,
) {
  const match = override.match;
  if (!match) {
    return true;
  }

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
  match: NonNullable<AiStudioPricingRowOverride["match"]>,
) {
  return detail.pricingRows
    .filter((row) => matchesPricingOverride(detail, row, { match }))
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
  overrides: AiStudioPricingRowOverride[],
) {
  if (overrides.length === 0) {
    return detail;
  }

  const nextRows: AiStudioPricingRow[] = [];

  for (const row of detail.pricingRows) {
    let currentRow = clonePricingRow(row);
    let removed = false;

    for (const override of overrides) {
      if (!matchesPricingOverride(detail, currentRow, override)) {
        continue;
      }

      if (override.enabled === false) {
        removed = true;
        break;
      }

      currentRow = {
        ...currentRow,
        ...(override.modelDescription !== undefined
          ? { modelDescription: override.modelDescription }
          : {}),
        ...(override.provider !== undefined ? { provider: override.provider } : {}),
        ...(override.creditPrice !== undefined
          ? { creditPrice: override.creditPrice }
          : {}),
        ...(override.creditUnit !== undefined ? { creditUnit: override.creditUnit } : {}),
        ...(override.usdPrice !== undefined ? { usdPrice: override.usdPrice } : {}),
        ...(override.falPrice !== undefined ? { falPrice: override.falPrice } : {}),
        ...(override.discountRate !== undefined
          ? { discountRate: override.discountRate }
          : {}),
        ...(override.discountPrice !== undefined
          ? { discountPrice: override.discountPrice }
          : {}),
      };
    }

    if (!removed) {
      nextRows.push(currentRow);
    }
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
  modelOverrides,
  pricingOverrides,
}: CompileRuntimeCatalogInput): AiStudioCompiledCatalogFile {
  const items = upstream.items.flatMap((rawDetail) => {
    const modelOverride = modelOverrides.models[rawDetail.id];
    if (modelOverride?.enabled === false) {
      return [];
    }

    if ((modelOverride?.splitModels?.length ?? 0) > 0) {
      return buildSplitModelDetails(rawDetail, modelOverride!).map((detail) => {
        const pricingOverrideBucket = pricingOverrides.models[detail.id];
        if (pricingOverrideBucket?.rows?.length) {
          applyPricingOverridesToDetail(detail, pricingOverrideBucket.rows);
        }
        return detail;
      });
    }

    const detail = applyModelOverrideToDetail(cloneDetail(rawDetail), modelOverride);
    const pricingOverrideBucket = pricingOverrides.models[detail.id];
    if (pricingOverrideBucket?.rows?.length) {
      applyPricingOverridesToDetail(detail, pricingOverrideBucket.rows);
    }

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
    resolvePricingRowRuntimeModel(entry, row) ?? "",
    normalizeLoose(row.provider),
    row.interfaceType.toLowerCase(),
    canonicalizePricingDescription(row.modelDescription),
    normalizeNumericString(row.creditPrice),
    row.creditUnit.toLowerCase(),
  ].join("|");
}

export function validateAiStudioRuntimeBuildInput({
  upstream,
  modelOverrides,
  pricingOverrides,
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
        if (matchedRows.length === 0) {
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

    const upstreamItem = upstreamById.get(modelId);
    const splitSource = Object.entries(modelOverrides.models).find(([, override]) =>
      override.splitModels?.some((splitModel) => splitModel.id === modelId),
    );
    const item = upstreamItem
      ? cloneDetail(upstreamItem)
      : splitSource
          ? buildSplitModelDetails(upstreamById.get(splitSource[0])!, splitSource[1]).find(
              (splitItem) => splitItem.id === modelId,
            ) ?? null
          : null;

    if (!item) {
      errors.push(`Pricing override targets unknown model: ${modelId}`);
      continue;
    }

    for (const override of bucket.rows ?? []) {
      const matched = item.pricingRows.some((row) =>
        matchesPricingOverride(item, row, override),
      );
      if (!matched) {
        errors.push(`Pricing override does not match any row for model: ${modelId}`);
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
  }));
}

export async function getCachedAiStudioCatalog() {
  const runtimeFile = await getCachedAiStudioRuntimeCatalog();
  return toAiStudioCatalogEntries(runtimeFile);
}

export async function getCachedAiStudioCatalogEntry(id: string) {
  const entries = await getCachedAiStudioCatalog();
  return (
    entries.find(
      (entry) => entry.id === id || getAiStudioPublicModelId(entry) === id,
    ) ?? null
  );
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
  const filePath = getAiStudioCatalogPaths().runtimeCatalogPath;
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
