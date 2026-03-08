import YAML from "yaml";

export type AiStudioCategory = "image" | "video" | "music" | "chat";

export interface AiStudioCatalogSeedEntry {
  id: string;
  category: AiStudioCategory;
  title: string;
  docUrl: string;
  provider: string;
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

const LLMS_INDEX_URL = "https://docs.kie.ai/llms.txt";
const OFFICIAL_PRICING_COUNT_URL =
  "https://api.kie.ai/client/v1/model-pricing/count";
const OFFICIAL_PRICING_PAGE_URL =
  "https://api.kie.ai/client/v1/model-pricing/page";

const DOC_LINE_PATTERN =
  /^- (?:(Image|Video|Music|Chat)\s+Models?\s+>\s+.+?|4o Image API|Flux Kontext API|Runway API(?: > Aleph)?|Veo3\.1 API|Suno API(?: > .+?)?) \[(.+?)\]\((https:\/\/docs\.kie\.ai\/(?!cn\/)[^)]+\.md)\):/;

const USER_AGENT =
  "Mozilla/5.0 (compatible; Nexty AiStudio Catalog Sync/1.0; +https://nexty.dev)";
const CATALOG_CACHE_TTL_MS = 15 * 60 * 1000;

type CatalogCache = {
  fetchedAt: number;
  entries: AiStudioCatalogEntry[];
};

type DetailCache = {
  fetchedAt: number;
  detail: AiStudioDocDetail;
};

let catalogCache: CatalogCache | null = null;
const detailCache = new Map<string, DetailCache>();

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

  if (
    sourceLower.startsWith("image") ||
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
    sourceLower.startsWith("video") ||
    sourceLower.startsWith("veo3.1") ||
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
    sourceLower.startsWith("music") ||
    sourceLower.startsWith("suno") ||
    urlLower.includes("/suno-api/") ||
    urlLower.includes("/market/elevenlabs/")
  ) {
    return "music";
  }

  if (
    sourceLower.startsWith("chat") ||
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

function isSpecificModelHandle(handle: string) {
  if (handle.length < 4 || GENERIC_MODEL_HANDLES.has(handle)) {
    return false;
  }

  const [firstSegment] = handle.split("-");
  return Boolean(firstSegment && !GENERIC_MODEL_HANDLES.has(firstSegment));
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

  let score = 0;
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
  return pricingRows
    .map((row) => ({ row, score: scorePricingMatch(entry, row) }))
    .filter((item) => item.score >= 8)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.row);
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

function isFresh(timestamp: number) {
  return Date.now() - timestamp < CATALOG_CACHE_TTL_MS;
}

export async function getCachedAiStudioCatalog() {
  if (catalogCache && isFresh(catalogCache.fetchedAt)) {
    return catalogCache.entries;
  }

  const entries = await getAiStudioCatalog();
  catalogCache = {
    fetchedAt: Date.now(),
    entries,
  };
  return entries;
}

export async function getCachedAiStudioCatalogEntry(id: string) {
  const entries = await getCachedAiStudioCatalog();
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function getCachedAiStudioCatalogDetail(id: string) {
  const cached = detailCache.get(id);
  if (cached && isFresh(cached.fetchedAt)) {
    return cached.detail;
  }

  const entry = await getCachedAiStudioCatalogEntry(id);
  if (!entry) {
    return null;
  }

  const detail = await getAiStudioCatalogDetail(entry);
  detailCache.set(id, {
    fetchedAt: Date.now(),
    detail,
  });
  return detail;
}
