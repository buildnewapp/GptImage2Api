"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { revalidatePath, updateTag } from "next/cache";

export async function clearFrontendCacheAction(): Promise<
  ActionResult<{ clearedAt: string }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  revalidatePath("/", "layout");
  updateTag("partner-snippets");
  updateTag("public-pricing-plans");
  updateTag("public-showcase-generations");
  updateTag("public-prompt-gallery-stats");

  return actionResponse.success({ clearedAt: new Date().toISOString() });
}
