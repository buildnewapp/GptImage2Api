import "server-only";

import { getDb } from "@/lib/db";
import { promptGalleryItems } from "@/lib/db/schema";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import {
  type PromptGalleryAdminData,
  type PromptGalleryAdminListInput,
  type PromptGalleryItem,
  normalizePromptGalleryAuthor,
  normalizePromptGalleryTextList,
} from "@/lib/prompt-gallery-shared";

type PromptGalleryRow = typeof promptGalleryItems.$inferSelect;

export function mapPromptGalleryItem(row: PromptGalleryRow): PromptGalleryItem {
  return {
    id: row.id,
    language: row.language,
    categories: normalizePromptGalleryTextList(row.categories),
    model: row.model,
    sourceId: row.sourceId ?? null,
    title: row.title,
    description: row.description ?? "",
    sourceLink: row.sourceLink ?? null,
    sourcePublishedAt: row.sourcePublishedAt?.toISOString() ?? null,
    sourcePlatform: row.sourcePlatform ?? null,
    author: normalizePromptGalleryAuthor(row.author),
    coverUrl: row.coverUrl ?? null,
    inputVideos: normalizePromptGalleryTextList(row.inputVideos),
    inputImages: normalizePromptGalleryTextList(row.inputImages),
    inputAudios: normalizePromptGalleryTextList(row.inputAudios),
    results: normalizePromptGalleryTextList(row.results),
    prompt: row.prompt,
    note: row.note ?? null,
    featured: row.featured,
    sort: row.sort,
    searchIndex: row.searchIndex,
    ups: row.ups,
    downs: row.downs,
    status: row.status,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function getPublicPromptGalleryItems(language?: string) {
  const conditions = [eq(promptGalleryItems.status, "online")];
  const normalizedLanguage = language?.trim();

  if (normalizedLanguage) {
    conditions.push(eq(promptGalleryItems.language, normalizedLanguage));
  }

  const rows = await getDb()
    .select()
    .from(promptGalleryItems)
    .where(and(...conditions))
    .orderBy(
      desc(promptGalleryItems.featured),
      asc(promptGalleryItems.sort),
      desc(promptGalleryItems.sourcePublishedAt),
      desc(promptGalleryItems.id),
    );

  return rows.map(mapPromptGalleryItem);
}

export async function getAdminPromptGalleryItems(
  input?: PromptGalleryAdminListInput,
): Promise<PromptGalleryAdminData> {
  const id = input?.id?.trim() || "";
  const status = input?.status?.trim() || "";
  const language = input?.language?.trim() || "";
  const category = input?.category?.trim() || "";
  const author = input?.author?.trim() || "";
  const title = input?.title?.trim() || "";
  const prompt = input?.prompt?.trim() || "";
  const pageIndex = Math.max(0, input?.pageIndex ?? 0);
  const pageSize = Math.min(Math.max(input?.pageSize ?? 20, 1), 100);
  const conditions = [];

  if (id) {
    conditions.push(
      sql`cast(${promptGalleryItems.id} as text) ilike ${`%${id}%`}`,
    );
  }

  if (status) {
    conditions.push(
      sql`${promptGalleryItems.status}::text ilike ${`%${status}%`}`,
    );
  }

  if (language) {
    conditions.push(ilike(promptGalleryItems.language, `%${language}%`));
  }

  if (category) {
    conditions.push(
      sql`${promptGalleryItems.categories}::text ilike ${`%${category}%`}`,
    );
  }

  if (author) {
    conditions.push(
      sql`${promptGalleryItems.author}::text ilike ${`%${author}%`}`,
    );
  }

  if (title) {
    conditions.push(ilike(promptGalleryItems.title, `%${title}%`));
  }

  if (prompt) {
    conditions.push(ilike(promptGalleryItems.prompt, `%${prompt}%`));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();

  const rowsQuery = db
    .select()
    .from(promptGalleryItems)
    .where(whereCondition)
    .orderBy(
      desc(promptGalleryItems.featured),
      asc(promptGalleryItems.sort),
      desc(promptGalleryItems.createdAt),
      desc(promptGalleryItems.id),
    )
    .limit(pageSize)
    .offset(pageIndex * pageSize);

  const countQuery = db
    .select({ value: count() })
    .from(promptGalleryItems)
    .where(whereCondition);

  const allRowsQuery = db.select().from(promptGalleryItems);
  const [rows, countRows, allRows] = await Promise.all([
    rowsQuery,
    countQuery,
    allRowsQuery,
  ]);

  const allItems = allRows.map(mapPromptGalleryItem);
  const authors = Array.from(
    new Set(
      allItems.map((item) => item.author?.name?.trim() || "").filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    items: rows.map(mapPromptGalleryItem),
    count: countRows[0]?.value ?? 0,
    summary: {
      total: allItems.length,
      online: allItems.filter((item) => item.status === "online").length,
      draft: allItems.filter((item) => item.status === "draft").length,
      offline: allItems.filter((item) => item.status === "offline").length,
      featured: allItems.filter((item) => item.featured).length,
    },
    filterOptions: {
      languages: Array.from(
        new Set(allItems.map((item) => item.language.trim()).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
      categories: collectPromptGalleryCategories(allItems),
      authors,
    },
  };
}

export function collectPromptGalleryCategories(items: PromptGalleryItem[]) {
  return Array.from(
    new Set(
      items
        .flatMap((item) => item.categories.map((category) => category.trim()))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function collectPromptGalleryModels(items: PromptGalleryItem[]) {
  return Array.from(
    new Set(items.map((item) => item.model.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}
