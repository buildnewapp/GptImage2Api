/**
 运行方式：

 默认自动模式（推荐）：
 pnpm prompts:sync-youmind
 强制全量：
 pnpm prompts:sync-youmind --mode full
 强制增量：
 pnpm prompts:sync-youmind --mode incremental
 只预演不写库：
 pnpm prompts:sync-youmind --dry-run
 常用参数：
 --start-page 1
 --max-pages 1000
 --limit 50

 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

type YoumindPrompt = {
  id?: number;
  title?: string;
  description?: string;
  sourceLink?: string;
  sourcePublishedAt?: string;
  author?: {
    name?: string;
    link?: string;
  };
  content?: string;
  media?: string[];
  mediaThumbnails?: string[];
  language?: string;
  sourcePlatform?: string;
  likes?: number;
  promptCategories?: unknown[];
};

type YoumindResponse = {
  prompts?: YoumindPrompt[];
};

type SyncMode = "auto" | "full" | "incremental";

const API_URL = "https://youmind.com/youhome-api/prompts";
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_LIMIT = 50;
const DEFAULT_START_PAGE = 1;
const DEFAULT_MAX_PAGES = 1000;
const DEFAULT_STOP_EXISTING_RATIO = 0.2;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_TIMEOUT_MS = 30_000;

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  if (value) return value;

  const localEnv = parseEnvFile(path.join(process.cwd(), ".env.local"));
  if (localEnv[name]?.trim()) return localEnv[name].trim();

  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  if (env[name]?.trim()) return env[name].trim();

  return "";
}

function getDatabaseUrl() {
  const db = getEnv("DATABASE_URL");
  if (!db) {
    throw new Error("DATABASE_URL 未配置");
  }
  return db;
}

function parseNumberArg(flag: string, fallback: number) {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index < 0) return fallback;
  const raw = process.argv[index + 1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function parseModeArg(): SyncMode {
  const index = process.argv.findIndex((arg) => arg === "--mode");
  const raw = (index >= 0 ? process.argv[index + 1] : getEnv("YM_SYNC_MODE"))
    .toLowerCase()
    .trim();
  if (raw === "full" || raw === "incremental" || raw === "auto") return raw;
  return "auto";
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function uniqStrings(values: unknown) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of values) {
    const text = typeof item === "string" ? item.trim() : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }

  return output;
}

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) return [];
  const categories = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (typeof record.name === "string") return record.name.trim();
        if (typeof record.title === "string") return record.title.trim();
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(categories));
}

function toDateOrNull(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildSearchIndex(input: {
  title: string;
  description: string;
  prompt: string;
  model: string;
  authorName: string;
  sourceId: number;
  categories: string[];
}) {
  return [
    input.title,
    input.description,
    input.prompt,
    input.model,
    input.authorName,
    input.sourceId.toString(),
    input.categories.join(" "),
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}

function normalizePrompt(item: YoumindPrompt, model: string) {
  const sourceId = Number(item.id);
  const prompt = (item.content || "").trim();
  if (!Number.isInteger(sourceId) || sourceId <= 0 || !prompt) return null;

  const title = (item.title || "").trim() || `Prompt ${sourceId}`;
  const description = (item.description || "").trim();
  const language = (item.language || "en").trim() || "en";
  const sourceLink = (item.sourceLink || "").trim();
  const sourcePlatform = (item.sourcePlatform || "").trim();
  const authorName = (item.author?.name || "").trim();
  const authorLink = (item.author?.link || "").trim();
  const media = uniqStrings(item.media);
  const mediaThumbnails = uniqStrings(item.mediaThumbnails);
  const categories = normalizeCategories(item.promptCategories);
  const coverUrl = media[0] || mediaThumbnails[0] || null;

  return {
    sourceId,
    language,
    categories,
    model,
    title,
    description: description || null,
    sourceLink: sourceLink || null,
    sourcePublishedAt: toDateOrNull(item.sourcePublishedAt),
    sourcePlatform: sourcePlatform || null,
    author:
      authorName || authorLink
        ? {
            name: authorName,
            link: authorLink,
          }
        : {},
    coverUrl,
    inputVideos: [],
    inputImages: [],
    inputAudios: [],
    results: media,
    prompt,
    note: null,
    featured: false,
    sort: 0,
    searchIndex: buildSearchIndex({
      title,
      description,
      prompt,
      model,
      authorName,
      sourceId,
      categories,
    }),
    ups: Number.isFinite(item.likes) ? Math.max(0, Number(item.likes)) : 0,
    downs: 0,
    status: "online",
  };
}

function buildHeaders() {
  const chromeVersion = randomInt(124, 147);
  return {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "sec-ch-ua": `"Google Chrome";v="${chromeVersion}", "Not.A/Brand";v="8", "Chromium";v="${chromeVersion}"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  };
}

async function fetchPage(params: {
  page: number;
  limit: number;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}) {
  const { page, limit, model, timeoutMs, maxRetries } = params;
  let lastError: unknown = null;
  console.log('fetchPage', new Date(), page, limit, model)
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await sleep(randomInt(10_000, 20_000));

      const response = await fetch(API_URL, {
        method: "POST",
        headers: buildHeaders(),
        referrer:
          "https://youmind.com/gpt-image-2-prompts?sortBy=time&sortOrder=desc",
        body: JSON.stringify({
          model,
          page,
          limit,
          locale: "en-US",
          campaign: "gpt-image-2-prompts",
          filterMode: "imageCategories",
          sortBy: "time",
          sortOrder: "desc",
        }),
        mode: "cors",
        credentials: "omit",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const message = `HTTP ${response.status} ${response.statusText} ${text.slice(0, 240)}`;
        throw new Error(message);
      }

      const payload = (await response.json()) as YoumindResponse;
      const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
      return prompts;
    } catch (error) {
      lastError = error;
      const waitMs =
        Math.min(20_000, 1200 * 2 ** (attempt - 1)) + randomInt(500, 1800);
      if (attempt < maxRetries) {
        console.warn(
          `[page=${page}] 请求失败，第 ${attempt}/${maxRetries} 次重试，${waitMs}ms 后继续：`,
          error instanceof Error ? error.message : error,
        );
        await sleep(waitMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("请求失败");
}

async function countExistingModelRows(client: Client, model: string) {
  const result = await client.query(
    "select count(*)::int as count from prompt_gallery_items where model = $1",
    [model],
  );
  return Number(result.rows[0]?.count || 0);
}

async function findExistingSourceIds(
  client: Client,
  model: string,
  sourceIds: number[],
) {
  if (sourceIds.length === 0) return new Set<number>();
  const result = await client.query(
    `
      select distinct source_id
      from prompt_gallery_items
      where model = $1 and source_id = any($2::int[])
    `,
    [model, sourceIds],
  );
  return new Set<number>(
    result.rows
      .map((row) => Number(row.source_id))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

async function upsertPageItems(
  client: Client,
  model: string,
  items: ReturnType<typeof normalizePrompt>[],
  dryRun: boolean,
) {
  const validItems = items.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
  const sourceIds = validItems.map((item) => item.sourceId);
  const existingSet = await findExistingSourceIds(client, model, sourceIds);

  let inserted = 0;
  let updated = 0;
  let existing = 0;

  for (const item of validItems) {
    const isExisting = existingSet.has(item.sourceId);
    if (isExisting) existing += 1;

    if (dryRun) {
      if (isExisting) updated += 1;
      else inserted += 1;
      continue;
    }

    if (isExisting) {
      const updateRes = await client.query(
        `
          update prompt_gallery_items
          set
            language = $1,
            categories = $2::jsonb,
            title = $3,
            description = $4,
            source_link = $5,
            source_published_at = $6,
            source_platform = $7,
            author = $8::jsonb,
            cover_url = $9,
            input_videos = $10::jsonb,
            input_images = $11::jsonb,
            input_audios = $12::jsonb,
            results = $13::jsonb,
            prompt = $14,
            note = $15,
            featured = $16,
            sort = $17,
            search_index = $18,
            ups = $19,
            downs = $20,
            status = $21,
            updated_at = now()
          where model = $22 and source_id = $23
        `,
        [
          item.language,
          JSON.stringify(item.categories),
          item.title,
          item.description,
          item.sourceLink,
          item.sourcePublishedAt,
          item.sourcePlatform,
          JSON.stringify(item.author),
          item.coverUrl,
          JSON.stringify(item.inputVideos),
          JSON.stringify(item.inputImages),
          JSON.stringify(item.inputAudios),
          JSON.stringify(item.results),
          item.prompt,
          item.note,
          item.featured,
          item.sort,
          item.searchIndex,
          item.ups,
          item.downs,
          item.status,
          model,
          item.sourceId,
        ],
      );
      if (updateRes.rowCount && updateRes.rowCount > 0) {
        updated += 1;
      }
      continue;
    }

    await client.query(
      `
        insert into prompt_gallery_items (
          language,
          categories,
          model,
          source_id,
          title,
          description,
          source_link,
          source_published_at,
          source_platform,
          author,
          cover_url,
          input_videos,
          input_images,
          input_audios,
          results,
          prompt,
          note,
          featured,
          sort,
          search_index,
          ups,
          downs,
          status
        ) values (
          $1,
          $2::jsonb,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb,
          $11,
          $12::jsonb,
          $13::jsonb,
          $14::jsonb,
          $15::jsonb,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22,
          $23
        )
      `,
      [
        item.language,
        JSON.stringify(item.categories),
        model,
        item.sourceId,
        item.title,
        item.description,
        item.sourceLink,
        item.sourcePublishedAt,
        item.sourcePlatform,
        JSON.stringify(item.author),
        item.coverUrl,
        JSON.stringify(item.inputVideos),
        JSON.stringify(item.inputImages),
        JSON.stringify(item.inputAudios),
        JSON.stringify(item.results),
        item.prompt,
        item.note,
        item.featured,
        item.sort,
        item.searchIndex,
        item.ups,
        item.downs,
        item.status,
      ],
    );
    inserted += 1;
  }

  return {
    total: validItems.length,
    inserted,
    updated,
    existing,
  };
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const model = getEnv("YM_MODEL") || DEFAULT_MODEL;
  const limit = parseNumberArg(
    "--limit",
    Number(getEnv("YM_LIMIT")) || DEFAULT_LIMIT,
  );
  const startPage = parseNumberArg(
    "--start-page",
    Number(getEnv("YM_START_PAGE")) || DEFAULT_START_PAGE,
  );
  const maxPages = parseNumberArg(
    "--max-pages",
    Number(getEnv("YM_MAX_PAGES")) || DEFAULT_MAX_PAGES,
  );
  const stopExistingRatio = Number(
    getEnv("YM_STOP_EXISTING_RATIO") || DEFAULT_STOP_EXISTING_RATIO,
  );
  const maxRetries = parseNumberArg(
    "--max-retries",
    Number(getEnv("YM_MAX_RETRIES")) || DEFAULT_MAX_RETRIES,
  );
  const timeoutMs = parseNumberArg(
    "--timeout-ms",
    Number(getEnv("YM_TIMEOUT_MS")) || DEFAULT_TIMEOUT_MS,
  );
  const dryRun = hasFlag("--dry-run") || getEnv("YM_DRY_RUN") === "1";
  const mode = parseModeArg();

  if (limit <= 0 || limit > 100) {
    throw new Error("limit 需在 1~100");
  }
  if (startPage <= 0) {
    throw new Error("start-page 必须 >= 1");
  }
  if (maxPages <= 0) {
    throw new Error("max-pages 必须 >= 1");
  }
  if (stopExistingRatio <= 0 || stopExistingRatio >= 1) {
    throw new Error("YM_STOP_EXISTING_RATIO 建议在 0~1 之间");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let page = startPage;
  let scannedPages = 0;
  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  try {
    const beforeCount = await countExistingModelRows(client, model);
    const isFullSync =
      mode === "full" || (mode === "auto" && beforeCount === 0);
    const isIncremental = mode === "incremental" || !isFullSync;

    console.log(
      `[start] model=${model} mode=${mode}(${isFullSync ? "full" : "incremental"}) before=${beforeCount} dryRun=${dryRun}`,
    );

    while (scannedPages < maxPages) {
      const prompts = await fetchPage({
        page,
        limit,
        model,
        timeoutMs,
        maxRetries,
      });

      if (prompts.length === 0) {
        console.log(`[stop] page=${page} 返回空数据`);
        break;
      }

      const normalized = prompts.map((item) => normalizePrompt(item, model));
      const validCount = normalized.filter(Boolean).length;

      await client.query("begin");
      let pageResult: Awaited<ReturnType<typeof upsertPageItems>> | null = null;
      try {
        pageResult = await upsertPageItems(client, model, normalized, dryRun);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }

      totalFetched += pageResult.total;
      totalInserted += pageResult.inserted;
      totalUpdated += pageResult.updated;

      const overlapRatio =
        pageResult.total > 0 ? pageResult.existing / pageResult.total : 0;

      console.log(
        `[page=${page}] raw=${prompts.length} valid=${validCount} inserted=${pageResult.inserted} updated=${pageResult.updated} existingRatio=${overlapRatio.toFixed(2)}`,
      );

      scannedPages += 1;
      const shouldStopByOverlap =
        isIncremental && pageResult.total > 0 && overlapRatio >= stopExistingRatio;

      if (shouldStopByOverlap) {
        console.log(
          `[stop] page=${page} 已存在比例 ${overlapRatio.toFixed(2)} >= ${stopExistingRatio.toFixed(2)}，判定增量同步完成`,
        );
        break;
      }

      page += 1;

      const pauseMs =
        scannedPages % 10 === 0 ? randomInt(4500, 9000) : randomInt(900, 2200);
      await sleep(pauseMs);
    }

    const afterCount = await countExistingModelRows(client, model);
    console.log(
      JSON.stringify(
        {
          model,
          mode,
          effectiveMode: isFullSync ? "full" : "incremental",
          dryRun,
          startPage,
          scannedPages,
          fetched: totalFetched,
          inserted: totalInserted,
          updated: totalUpdated,
          beforeCount,
          afterCount,
          delta: afterCount - beforeCount,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[failed]", error);
  process.exit(1);
});
