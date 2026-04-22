"use server";

import { ActionResult, actionResponse } from "@/lib/action-response";
import {
  ApiKeyStatus,
  getApiKeyPreview,
  isApiKeyStatus,
} from "@/lib/apikeys/index";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { apikeys as apikeysSchema, user as userSchema } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { desc, eq, sql } from "drizzle-orm";

export type AdminApiKey = {
  id: number;
  title: string | null;
  apiKeyPreview: string;
  status: string;
  userUuid: string;
  userEmail: string | null;
  createdAt: Date;
};

export type GetAdminApiKeysResult = ActionResult<{
  apiKeys: AdminApiKey[];
}>;

export type GetAdminApiKeyValueResult = ActionResult<{
  apiKey: string;
}>;

export async function getAdminApiKeys(): Promise<GetAdminApiKeysResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const results = await getDb()
        .select({
          id: apikeysSchema.id,
          title: apikeysSchema.title,
          apiKey: apikeysSchema.apiKey,
          status: apikeysSchema.status,
          userUuid: apikeysSchema.userUuid,
          userEmail: userSchema.email,
          createdAt: apikeysSchema.createdAt,
        })
        .from(apikeysSchema)
        .leftJoin(
            userSchema,
            sql`${apikeysSchema.userUuid} = ${userSchema.id}::text`,
        )
        .orderBy(desc(apikeysSchema.createdAt), desc(apikeysSchema.id));

    return actionResponse.success({
      apiKeys: results.map((item) => ({
        id: item.id,
        title: item.title,
        apiKeyPreview: getApiKeyPreview(item.apiKey),
        status: item.status,
        userUuid: item.userUuid,
        userEmail: item.userEmail,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to load admin API keys:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function updateAdminApiKeyStatus({
                                                id,
                                                status,
                                              }: {
  id: number;
  status: ApiKeyStatus;
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  if (!isApiKeyStatus(status)) {
    return actionResponse.badRequest("Invalid API key status.");
  }

  try {
    const updated = await getDb()
        .update(apikeysSchema)
        .set({ status })
        .where(eq(apikeysSchema.id, id))
        .returning({ id: apikeysSchema.id });

    if (!updated[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success();
  } catch (error) {
    console.error("Failed to update admin API key status:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function deleteAdminApiKey({
                                          id,
                                        }: {
  id: number;
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const deleted = await getDb()
        .delete(apikeysSchema)
        .where(eq(apikeysSchema.id, id))
        .returning({ id: apikeysSchema.id });

    if (!deleted[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success();
  } catch (error) {
    console.error("Failed to delete admin API key:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getAdminApiKeyValue({
                                            id,
                                          }: {
  id: number;
}): Promise<GetAdminApiKeyValueResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const result = await getDb()
        .select({
          apiKey: apikeysSchema.apiKey,
        })
        .from(apikeysSchema)
        .where(eq(apikeysSchema.id, id))
        .limit(1);

    if (!result[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success({
      apiKey: result[0].apiKey,
    });
  } catch (error) {
    console.error("Failed to get admin API key value:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
