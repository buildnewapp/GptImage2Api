"use server";

import { LOCALES } from "@/i18n/routing";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { promptGalleryItems } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import {
  getAdminPromptGalleryItems,
  mapPromptGalleryItem,
} from "@/lib/prompt-gallery";
import {
  PROMPT_GALLERY_STATUS_VALUES,
  type PromptGalleryStatus,
  buildPromptGallerySearchIndex,
  parsePromptGalleryJsonArray,
  parsePromptGalleryCategories,
  toPromptGalleryDate,
  type PromptGalleryAdminData,
  type PromptGalleryAdminListInput,
  type PromptGalleryItem,
} from "@/lib/prompt-gallery-shared";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PromptGalleryFormSchema = z.object({
  language: z.string().trim().min(1).max(10),
  categoriesText: z.string().optional().default(""),
  model: z.string().trim().min(1).max(100),
  sourceId: z.union([z.number().int().nonnegative(), z.null()]),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().default(""),
  sourceLink: z.string().trim().max(1000).optional().default(""),
  sourcePublishedAt: z.string().trim().optional().default(""),
  sourcePlatform: z.string().trim().max(50).optional().default(""),
  authorName: z.string().trim().max(255).optional().default(""),
  authorLink: z.string().trim().max(1000).optional().default(""),
  coverUrl: z.string().trim().max(1000).optional().default(""),
  inputImagesText: z.string().optional().default(""),
  inputVideosText: z.string().optional().default(""),
  inputAudiosText: z.string().optional().default(""),
  resultsText: z.string().optional().default(""),
  prompt: z.string().trim().min(1),
  note: z.string().trim().max(3000).optional().default(""),
  featured: z.boolean().default(false),
  sort: z.number().int(),
  ups: z.number().int(),
  downs: z.number().int(),
  status: z.enum(PROMPT_GALLERY_STATUS_VALUES),
});

const CreatePromptGalleryItemSchema = PromptGalleryFormSchema;

const UpdatePromptGalleryItemSchema = PromptGalleryFormSchema.extend({
  id: z.number().int().positive(),
});

const BatchPromptGalleryIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

const BatchPromptGalleryStatusSchema = BatchPromptGalleryIdsSchema.extend({
  status: z.enum(PROMPT_GALLERY_STATUS_VALUES),
});

function revalidatePromptGalleryPages() {
  revalidatePath("/prompts");
  revalidatePath("/dashboard/prompts-admin");

  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/prompts`);
    revalidatePath(`/${locale}/dashboard/prompts-admin`);
  }
}

function buildPromptGalleryValues(
  input: z.infer<typeof PromptGalleryFormSchema>,
) {
  const categories = parsePromptGalleryCategories(input.categoriesText);
  const inputImages = parsePromptGalleryJsonArray(input.inputImagesText);
  const inputVideos = parsePromptGalleryJsonArray(input.inputVideosText);
  const inputAudios = parsePromptGalleryJsonArray(input.inputAudiosText);
  const results = parsePromptGalleryJsonArray(input.resultsText);
  const authorName = input.authorName.trim();
  const authorLink = input.authorLink.trim();

  return {
    language: input.language,
    categories,
    model: input.model,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description || null,
    sourceLink: input.sourceLink || null,
    sourcePublishedAt: toPromptGalleryDate(input.sourcePublishedAt),
    sourcePlatform: input.sourcePlatform || null,
    author:
      authorName || authorLink
        ? {
            name: authorName,
            link: authorLink,
          }
        : {},
    coverUrl: input.coverUrl || null,
    inputImages,
    inputVideos,
    inputAudios,
    results,
    prompt: input.prompt,
    note: input.note || null,
    featured: input.featured,
    sort: input.sort,
    ups: input.ups,
    downs: input.downs,
    status: input.status,
    searchIndex: buildPromptGallerySearchIndex({
      title: input.title,
      description: input.description,
      prompt: input.prompt,
      categories,
      model: input.model,
      authorName,
      sourceId: input.sourceId,
    }),
  };
}

export async function getPromptGalleryAdminData(
  input?: PromptGalleryAdminListInput,
): Promise<ActionResult<PromptGalleryAdminData>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const items = await getAdminPromptGalleryItems(input);
    return actionResponse.success(items);
  } catch (error) {
    console.error("Failed to load prompt gallery admin data:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function createPromptGalleryItemAction(
  input: z.infer<typeof CreatePromptGalleryItemSchema>,
): Promise<ActionResult<PromptGalleryItem>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const parsed = CreatePromptGalleryItemSchema.parse(input);
    const values = buildPromptGalleryValues(parsed);
    const [created] = await getDb()
      .insert(promptGalleryItems)
      .values(values)
      .returning();

    revalidatePromptGalleryPages();
    return actionResponse.success(mapPromptGalleryItem(created));
  } catch (error) {
    console.error("Failed to create prompt gallery item:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function updatePromptGalleryItemAction(
  input: z.infer<typeof UpdatePromptGalleryItemSchema>,
): Promise<ActionResult<PromptGalleryItem>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const parsed = UpdatePromptGalleryItemSchema.parse(input);
    const values = buildPromptGalleryValues(parsed);
    const [updated] = await getDb()
      .update(promptGalleryItems)
      .set(values)
      .where(eq(promptGalleryItems.id, parsed.id))
      .returning();

    if (!updated) {
      return actionResponse.notFound("Prompt record not found.");
    }

    revalidatePromptGalleryPages();
    return actionResponse.success(mapPromptGalleryItem(updated));
  } catch (error) {
    console.error("Failed to update prompt gallery item:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function updatePromptGalleryItemsStatusAction(
  input: z.infer<typeof BatchPromptGalleryStatusSchema>,
): Promise<ActionResult<{ count: number; status: PromptGalleryStatus }>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const parsed = BatchPromptGalleryStatusSchema.parse(input);
    const updated = await getDb()
      .update(promptGalleryItems)
      .set({ status: parsed.status })
      .where(inArray(promptGalleryItems.id, parsed.ids))
      .returning({ id: promptGalleryItems.id });

    revalidatePromptGalleryPages();
    return actionResponse.success({
      count: updated.length,
      status: parsed.status,
    });
  } catch (error) {
    console.error("Failed to update prompt gallery statuses:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function deletePromptGalleryItemsAction(
  input: z.infer<typeof BatchPromptGalleryIdsSchema>,
): Promise<ActionResult<{ count: number }>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const parsed = BatchPromptGalleryIdsSchema.parse(input);
    const deleted = await getDb()
      .delete(promptGalleryItems)
      .where(inArray(promptGalleryItems.id, parsed.ids))
      .returning({ id: promptGalleryItems.id });

    revalidatePromptGalleryPages();
    return actionResponse.success({ count: deleted.length });
  } catch (error) {
    console.error("Failed to delete prompt gallery items:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
