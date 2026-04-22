import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

type PapiMedia = {
  type?: string;
  url?: string;
  sourceUrl?: string;
  thumbnail?: string;
};

type PapiItem = {
  id?: string;
  title?: string;
  prompt?: string;
  language?: string;
  publishedAt?: string;
  media?: PapiMedia[];
};

const TARGET_EMAIL = "syxchinablank@gmail.com";
const PAPI_PATH = path.join(process.cwd(), "content", "prompts.json");
const MODEL_ID = "image:gpt-image-2-text-to-image";
const MODEL_TITLE = "GPT Image-2 - Text to Image";
const MODEL_PROVIDER = "GPT Image-2";
const MODEL_ENDPOINT = "/api/v1/jobs/createTask";
const MODEL_METHOD = "POST";

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

function getDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();

  const localEnv = parseEnvFile(path.join(process.cwd(), ".env.local"));
  if (localEnv.DATABASE_URL?.trim()) return localEnv.DATABASE_URL.trim();

  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();

  throw new Error("DATABASE_URL 未配置");
}

function toShortTitle(value: string | undefined, fallback: string) {
  const text = (value || "").trim();
  if (!text) return fallback;
  return text.slice(0, 255);
}

function toValidDate(value: string | undefined) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function pickMediaUrl(media: PapiMedia) {
  return (
    media.sourceUrl?.trim() ||
    media.url?.trim() ||
    media.thumbnail?.trim() ||
    ""
  );
}

function getResultUrls(item: PapiItem) {
  const list = Array.isArray(item.media) ? item.media : [];
  const imageUrls = list
    .filter((m) => (m.type || "").toLowerCase() === "image")
    .map(pickMediaUrl)
    .filter(Boolean);

  const fallbackUrls = list.map(pickMediaUrl).filter(Boolean);
  const urls = imageUrls.length > 0 ? imageUrls : fallbackUrls;
  return Array.from(new Set(urls)).slice(0, 4);
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const raw = fs.readFileSync(PAPI_PATH, "utf8");
  const parsed = JSON.parse(raw) as { items?: PapiItem[] };
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  const enItems = items.filter((item) => item.language === "en").slice(0, 100);
  const zhItems = items.filter((item) => item.language === "zh");
  const jaItems = items.filter((item) => item.language === "ja");
  const selected = [...enItems, ...zhItems, ...jaItems];

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const userRes = await client.query(
      "select id, email from \"user\" where email = $1 limit 1",
      [TARGET_EMAIL],
    );
    const userId = userRes.rows[0]?.id as string | undefined;
    if (!userId) {
      throw new Error(`未找到用户: ${TARGET_EMAIL}`);
    }

    const beforeRes = await client.query(
      "select count(*)::int as count from ai_studio_generations where provider_task_id like 'papi-showcase-%'",
    );
    const beforeCount = Number(beforeRes.rows[0]?.count || 0);

    let processed = 0;
    let inserted = 0;
    let updated = 0;

    await client.query("begin");

    for (const item of selected) {
      const id = (item.id || "").trim();
      const prompt = (item.prompt || "").trim();
      if (!id || !prompt) continue;

      const createdAt = toValidDate(item.publishedAt);
      const titleSnapshot = toShortTitle(item.title, `Prompt ${id}`);
      const resultUrls = getResultUrls(item);
      const providerTaskId = `papi-showcase-${id}`;

      const requestPayload = {
        model: "gpt-image-2-text-to-image",
        input: {
          prompt,
          quality: "high",
          resolution: "2048x2048",
        },
        source: "prompts.json",
        sourceItemId: id,
        sourceLanguage: item.language || "unknown",
      };

      const queryRes = await client.query(
        `
          insert into ai_studio_generations (
            user_id,
            catalog_model_id,
            category,
            title_snapshot,
            provider_snapshot,
            endpoint_snapshot,
            method_snapshot,
            provider_task_id,
            status,
            request_payload,
            result_urls,
            is_public,
            completed_at,
            created_at,
            updated_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15
          )
          on conflict (provider_task_id) do update set
            user_id = excluded.user_id,
            catalog_model_id = excluded.catalog_model_id,
            category = excluded.category,
            title_snapshot = excluded.title_snapshot,
            provider_snapshot = excluded.provider_snapshot,
            endpoint_snapshot = excluded.endpoint_snapshot,
            method_snapshot = excluded.method_snapshot,
            status = excluded.status,
            request_payload = excluded.request_payload,
            result_urls = excluded.result_urls,
            is_public = excluded.is_public,
            completed_at = excluded.completed_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
          returning (xmax = 0) as inserted
        `,
        [
          userId,
          MODEL_ID,
          "image",
          titleSnapshot,
          MODEL_PROVIDER,
          MODEL_ENDPOINT,
          MODEL_METHOD,
          providerTaskId,
          "succeeded",
          JSON.stringify(requestPayload),
          JSON.stringify(resultUrls),
          true,
          createdAt,
          createdAt,
          new Date(),
        ],
      );

      processed += 1;
      if (queryRes.rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await client.query("commit");

    const afterRes = await client.query(
      "select count(*)::int as count from ai_studio_generations where provider_task_id like 'papi-showcase-%'",
    );
    const afterCount = Number(afterRes.rows[0]?.count || 0);

    console.log(
      JSON.stringify(
        {
          userEmail: TARGET_EMAIL,
          userId,
          model: {
            catalogModelId: MODEL_ID,
            title: MODEL_TITLE,
            provider: MODEL_PROVIDER,
          },
          selection: {
            enFirst100: enItems.length,
            zhAll: zhItems.length,
            jaAll: jaItems.length,
            totalSelected: selected.length,
          },
          imported: {
            processed,
            inserted,
            updated,
            beforeCount,
            afterCount,
            delta: afterCount - beforeCount,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
