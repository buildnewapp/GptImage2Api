/**
 只处理空分类：pnpm prompts:categorize
 强制重分全部：pnpm prompts:categorize --all
 预览不写库：pnpm prompts:categorize --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const CATEGORY_ORDER = [
  "Profile / Avatar",
  "Social Media Post",
  "Infographic / Edu Visual",
  "YouTube Thumbnail",
  "Comic / Storyboard",
  "Product Marketing",
  "E-commerce Main Image",
  "Game Asset",
  "Poster / Flyer",
  "App / Web Design",
] as const;

type CategoryName = (typeof CATEGORY_ORDER)[number];

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

function countMatches(text: string, keywords: string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) score += 1;
  }
  return score;
}

function chunkIds(ids: number[], size: number) {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

function pickCategory(text: string): CategoryName {
  const scores: Record<CategoryName, number> = {
    "Profile / Avatar": countMatches(text, [
      "avatar",
      "profile photo",
      "profile picture",
      "headshot",
      "portrait",
      "selfie",
      "pfp",
      "icon",
      "linkedin",
    ]),
    "Social Media Post": countMatches(text, [
      "social media",
      "instagram",
      "tiktok",
      "x post",
      "twitter post",
      "tweet",
      "facebook post",
      "story post",
      "feed post",
      "viral post",
    ]),
    "Infographic / Edu Visual": countMatches(text, [
      "infographic",
      "diagram",
      "flowchart",
      "mind map",
      "timeline",
      "educational",
      "education",
      "tutorial",
      "explain",
      "data chart",
      "comparison chart",
    ]),
    "YouTube Thumbnail": countMatches(text, [
      "youtube thumbnail",
      "thumbnail",
      "youtube cover",
      "video thumbnail",
      "clickbait",
      "subscribe",
    ]),
    "Comic / Storyboard": countMatches(text, [
      "comic",
      "manga",
      "storyboard",
      "panel",
      "speech bubble",
      "sequence frame",
      "strip",
    ]),
    "Product Marketing": countMatches(text, [
      "product ad",
      "advertisement",
      "ad campaign",
      "brand campaign",
      "marketing",
      "promo",
      "promotional",
      "brand shot",
      "hero shot",
      "commercial",
    ]),
    "E-commerce Main Image": countMatches(text, [
      "e-commerce",
      "ecommerce",
      "amazon listing",
      "shopify",
      "main product image",
      "white background product",
      "product listing",
      "marketplace listing",
    ]),
    "Game Asset": countMatches(text, [
      "game asset",
      "sprite",
      "tileset",
      "pixel art",
      "character sheet",
      "isometric tile",
      "npc",
      "game ui",
      "item icon",
      "rpg",
    ]),
    "Poster / Flyer": countMatches(text, [
      "poster",
      "flyer",
      "event poster",
      "concert poster",
      "movie poster",
      "print design",
      "brochure",
    ]),
    "App / Web Design": countMatches(text, [
      "app ui",
      "ui design",
      "ux design",
      "web design",
      "landing page",
      "dashboard",
      "mobile app",
      "interface",
      "wireframe",
      "website",
    ]),
  };

  let best: CategoryName = "Product Marketing";
  let max = 0;
  for (const category of CATEGORY_ORDER) {
    const value = scores[category];
    if (value > max) {
      max = value;
      best = category;
    }
  }

  return best;
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const dryRun = process.argv.includes("--dry-run");
  const onlyEmpty = !process.argv.includes("--all");

  const client = new Client({ connectionString: databaseUrl });
  client.on("error", (error) => {
    console.error("[db-client-error]", error.message);
  });
  await client.connect();

  const where = onlyEmpty
    ? "where categories is null or jsonb_array_length(categories)=0"
    : "";

  const rows = await client.query<{
    id: number;
    title: string | null;
    description: string | null;
    prompt: string | null;
    search_index: string | null;
  }>(
    `
      select id, title, description, prompt, search_index
      from prompt_gallery_items
      ${where}
      order by id asc
    `,
  );

  const stats = new Map<CategoryName, number>();
  for (const category of CATEGORY_ORDER) {
    stats.set(category, 0);
  }

  const idsByCategory = new Map<CategoryName, number[]>();
  for (const category of CATEGORY_ORDER) {
    idsByCategory.set(category, []);
  }

  for (const row of rows.rows) {
    const text = [
      row.title || "",
      row.description || "",
      row.prompt || "",
      row.search_index || "",
    ]
      .join(" ")
      .toLowerCase();

    const category = pickCategory(text);
    stats.set(category, (stats.get(category) || 0) + 1);
    idsByCategory.get(category)?.push(row.id);
  }

  if (!dryRun) {
    await client.query("begin");
  }

  try {
    if (!dryRun) {
      for (const category of CATEGORY_ORDER) {
        const ids = idsByCategory.get(category) || [];
        if (ids.length === 0) continue;
        for (const idChunk of chunkIds(ids, 200)) {
          await client.query(
            `
              update prompt_gallery_items
              set categories = $1::jsonb, updated_at = now()
              where id = any($2::int[])
            `,
            [JSON.stringify([category]), idChunk],
          );
        }
      }
    }

    if (!dryRun) {
      await client.query("commit");
    }
  } catch (error) {
    if (!dryRun) {
      await client.query("rollback");
    }
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "write",
        onlyEmpty,
        totalProcessed: rows.rows.length,
        stats: Object.fromEntries(stats),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
