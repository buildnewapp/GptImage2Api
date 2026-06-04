"use server";

import { LOCALES } from "@/i18n/routing";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import {
  PARTNER_SNIPPETS_CACHE_TAG,
  getAdminPartnerSnippets as getAdminPartnerSnippetsConfig,
  savePartnerSnippets,
  type PartnerSnippet,
} from "@/lib/partners/partner-snippets";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const PartnerSnippetSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/, "Key may only contain lowercase letters, numbers, _ and -."),
  html: z.string().trim().min(1).max(5000),
  sort: z.number().int().min(-999999).max(999999),
  home: z.boolean(),
  partners: z.boolean(),
  enabled: z.boolean(),
});

const PartnerSnippetsSchema = z.array(PartnerSnippetSchema).max(100);

function revalidatePartnerSnippetPages() {
  revalidateTag(PARTNER_SNIPPETS_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/partners");

  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/partners`);
    revalidatePath(`/${locale}/dashboard/config`);
  }
}

export async function getAdminPartnerSnippetsAction(): Promise<
  ActionResult<PartnerSnippet[]>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  return getAdminPartnerSnippetsConfig();
}

export async function updateAdminPartnerSnippetsAction(
  input: PartnerSnippet[],
): Promise<ActionResult<PartnerSnippet[]>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const parsed = PartnerSnippetsSchema.safeParse(input);
  if (!parsed.success) {
    return actionResponse.badRequest(parsed.error.issues[0]?.message ?? "Invalid partner snippets.");
  }

  const keys = new Set<string>();
  for (const item of parsed.data) {
    if (keys.has(item.key)) {
      return actionResponse.badRequest(`Duplicate key: ${item.key}`);
    }
    keys.add(item.key);
  }

  const result = await savePartnerSnippets(parsed.data);
  if (result.success) {
    revalidatePartnerSnippetPages();
  }

  return result;
}
