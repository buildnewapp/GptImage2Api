import "server-only";

import {
  type LegacyVideoHistoryRecord,
  mapAiStudioUserRecordToLegacyVideoHistoryRecord,
} from "@/lib/ai-studio/dashboard-videos";
import { getDb } from "@/lib/db";
import { aiStudioGenerations } from "@/lib/db/schema";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

export type ShowcaseGenerationRecord = LegacyVideoHistoryRecord & {
  title: string;
  provider: string;
  catalogModelId: string;
};

function mapShowcaseRow(row: {
  id: string;
  category: string;
  catalogModelId: string;
  title: string;
  provider: string;
  status: string;
  providerTaskId: string | null;
  reservedCredits: number;
  capturedCredits: number;
  refundedCredits: number;
  resultUrls: unknown;
  createdAt: Date;
  requestPayload: unknown;
}) {
  const mapped = mapAiStudioUserRecordToLegacyVideoHistoryRecord({
    id: row.id,
    category: row.category,
    catalogModelId: row.catalogModelId,
    title: row.title,
    provider: row.provider,
    status: row.status,
    providerTaskId: row.providerTaskId,
    isPublic: true,
    reservedCredits: row.reservedCredits,
    capturedCredits: row.capturedCredits,
    refundedCredits: row.refundedCredits,
    resultUrls: Array.isArray(row.resultUrls) ? (row.resultUrls as string[]) : [],
    createdAt: row.createdAt.toISOString(),
    requestPayload:
      row.requestPayload && typeof row.requestPayload === "object"
        ? (row.requestPayload as Record<string, any>)
        : {},
  });

  return {
    ...mapped,
    title: row.title,
    provider: row.provider,
    catalogModelId: row.catalogModelId,
  } satisfies ShowcaseGenerationRecord;
}

function getPublicShowcaseWhereClause() {
  return and(
    inArray(aiStudioGenerations.category, ["video", "image"]),
    eq(aiStudioGenerations.status, "succeeded"),
    eq(aiStudioGenerations.isPublic, true),
    isNull(aiStudioGenerations.userDeletedAt),
  );
}

export async function getShowcaseGenerations({
  page = 1,
  limit = 12,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const requestedPage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 24);
  const whereClause = getPublicShowcaseWhereClause();

  const totalResult = await getDb()
    .select({ value: count() })
    .from(aiStudioGenerations)
    .where(whereClause);
  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(requestedPage, totalPages);
  const offset = (safePage - 1) * safeLimit;

  const rows = await getDb()
    .select({
      id: aiStudioGenerations.id,
      category: aiStudioGenerations.category,
      catalogModelId: aiStudioGenerations.catalogModelId,
      title: aiStudioGenerations.titleSnapshot,
      provider: aiStudioGenerations.providerSnapshot,
      status: aiStudioGenerations.status,
      providerTaskId: aiStudioGenerations.providerTaskId,
      reservedCredits: aiStudioGenerations.creditsReserved,
      capturedCredits: aiStudioGenerations.creditsCaptured,
      refundedCredits: aiStudioGenerations.creditsRefunded,
      resultUrls: aiStudioGenerations.resultUrls,
      createdAt: aiStudioGenerations.createdAt,
      requestPayload: aiStudioGenerations.requestPayload,
    })
    .from(aiStudioGenerations)
    .where(whereClause)
    .orderBy(desc(aiStudioGenerations.createdAt))
    .offset(offset)
    .limit(safeLimit);

  return {
    records: rows.map(mapShowcaseRow),
    page: safePage,
    total,
    totalPages,
  };
}

export async function getShowcaseGenerationById(id: string) {
  const rows = await getDb()
    .select({
      id: aiStudioGenerations.id,
      category: aiStudioGenerations.category,
      catalogModelId: aiStudioGenerations.catalogModelId,
      title: aiStudioGenerations.titleSnapshot,
      provider: aiStudioGenerations.providerSnapshot,
      status: aiStudioGenerations.status,
      providerTaskId: aiStudioGenerations.providerTaskId,
      reservedCredits: aiStudioGenerations.creditsReserved,
      capturedCredits: aiStudioGenerations.creditsCaptured,
      refundedCredits: aiStudioGenerations.creditsRefunded,
      resultUrls: aiStudioGenerations.resultUrls,
      createdAt: aiStudioGenerations.createdAt,
      requestPayload: aiStudioGenerations.requestPayload,
    })
    .from(aiStudioGenerations)
    .where(and(getPublicShowcaseWhereClause(), eq(aiStudioGenerations.id, id)))
    .limit(1);

  const row = rows[0];
  return row ? mapShowcaseRow(row) : null;
}
