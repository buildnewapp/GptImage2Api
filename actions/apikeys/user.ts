"use server";

import { ActionResult, actionResponse } from "@/lib/action-response";
import {
  API_KEY_STATUS_ACTIVE,
  ApiKeyStatus,
  generateApiKeyToken,
  getApiKeyPreview,
  isApiKeyStatus,
} from "@/lib/apikeys/index";
import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { apikeys as apikeysSchema } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { and, desc, eq } from "drizzle-orm";

const MAX_TITLE_LENGTH = 100;
const CREATE_KEY_MAX_RETRIES = 3;

function normalizeTitle(title?: string) {
  const normalized = title?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_TITLE_LENGTH);
}

function isUniqueViolation(error: unknown) {
  return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

export type UserApiKey = {
  id: number;
  title: string | null;
  apiKeyPreview: string;
  status: string;
  createdAt: Date;
};

export type GetMyApiKeysResult = ActionResult<{
  apiKeys: UserApiKey[];
}>;

export async function getMyApiKeys(): Promise<GetMyApiKeysResult> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return actionResponse.unauthorized();
  }

  try {
    const results = await getDb()
        .select({
          id: apikeysSchema.id,
          title: apikeysSchema.title,
          apiKey: apikeysSchema.apiKey,
          status: apikeysSchema.status,
          createdAt: apikeysSchema.createdAt,
        })
        .from(apikeysSchema)
        .where(eq(apikeysSchema.userUuid, user.id))
        .orderBy(desc(apikeysSchema.createdAt), desc(apikeysSchema.id));

    return actionResponse.success({
      apiKeys: results.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        createdAt: item.createdAt,
        apiKeyPreview: getApiKeyPreview(item.apiKey),
      })),
    });
  } catch (error) {
    console.error("Failed to load API keys:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export type CreateMyApiKeyResult = ActionResult<{
  apiKey: string;
}>;

export type GetMyApiKeyValueResult = ActionResult<{
  apiKey: string;
}>;

export async function createMyApiKey({
                                       title,
                                     }: {
  title?: string;
}): Promise<CreateMyApiKeyResult> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return actionResponse.unauthorized();
  }

  const normalizedTitle = normalizeTitle(title);

  try {
    for (let attempt = 0; attempt < CREATE_KEY_MAX_RETRIES; attempt++) {
      const generatedApiKey = generateApiKeyToken();

      try {
        const inserted = await getDb()
            .insert(apikeysSchema)
            .values({
              apiKey: generatedApiKey,
              title: normalizedTitle,
              userUuid: user.id,
              status: API_KEY_STATUS_ACTIVE,
            })
            .returning({ id: apikeysSchema.id, apiKey: apikeysSchema.apiKey });

        if (inserted[0]) {
          return actionResponse.success({
            apiKey: inserted[0].apiKey,
          });
        }
      } catch (error) {
        if (isUniqueViolation(error) && attempt < CREATE_KEY_MAX_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }

    return actionResponse.error("Failed to generate a unique API key.");
  } catch (error) {
    console.error("Failed to create API key:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function updateMyApiKeyStatus({
                                             id,
                                             status,
                                           }: {
  id: number;
  status: ApiKeyStatus;
}): Promise<ActionResult> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return actionResponse.unauthorized();
  }

  if (!isApiKeyStatus(status)) {
    return actionResponse.badRequest("Invalid API key status.");
  }

  try {
    const updated = await getDb()
        .update(apikeysSchema)
        .set({ status })
        .where(and(eq(apikeysSchema.id, id), eq(apikeysSchema.userUuid, user.id)))
        .returning({ id: apikeysSchema.id });

    if (!updated[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success();
  } catch (error) {
    console.error("Failed to update API key status:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function deleteMyApiKey({
                                       id,
                                     }: {
  id: number;
}): Promise<ActionResult> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return actionResponse.unauthorized();
  }

  try {
    const deleted = await getDb()
        .delete(apikeysSchema)
        .where(and(eq(apikeysSchema.id, id), eq(apikeysSchema.userUuid, user.id)))
        .returning({ id: apikeysSchema.id });

    if (!deleted[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success();
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getMyApiKeyValue({
                                         id,
                                       }: {
  id: number;
}): Promise<GetMyApiKeyValueResult> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return actionResponse.unauthorized();
  }

  try {
    const result = await getDb()
        .select({
          apiKey: apikeysSchema.apiKey,
        })
        .from(apikeysSchema)
        .where(and(eq(apikeysSchema.id, id), eq(apikeysSchema.userUuid, user.id)))
        .limit(1);

    if (!result[0]) {
      return actionResponse.notFound("API key not found.");
    }

    return actionResponse.success({
      apiKey: result[0].apiKey,
    });
  } catch (error) {
    console.error("Failed to get API key value:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
