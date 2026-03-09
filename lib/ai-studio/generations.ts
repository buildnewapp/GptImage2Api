import { getDb } from "@/lib/db";
import {
  aiStudioGenerations,
  creditLogs,
  usage,
} from "@/lib/db/schema";
import type {
  AiStudioCatalogEntry,
  AiStudioDocDetail,
  AiStudioPricingRow,
} from "@/lib/ai-studio/catalog";
import { persistAiStudioMediaUrls } from "@/lib/ai-studio/assets";
import { toBillableCredits } from "@/lib/ai-studio/runtime";
import {
  and,
  desc,
  eq,
  sql,
} from "drizzle-orm";

export type AiStudioGenerationRecord = typeof aiStudioGenerations.$inferSelect;

type ReserveInput = {
  userId: string;
  modelId: string;
  detail: AiStudioDocDetail;
  payload: Record<string, any>;
  selectedPricing: AiStudioPricingRow | null;
};

function stringifyNotes(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function buildReserveNotes(
  generationId: string,
  detail: AiStudioCatalogEntry | AiStudioDocDetail,
  selectedPricing: AiStudioPricingRow | null,
) {
  return stringifyNotes({
    generationId,
    catalogModelId: detail.id,
    provider: detail.provider,
    title: detail.title,
    pricing: selectedPricing?.modelDescription ?? null,
  });
}

export async function reserveAiStudioGeneration(input: ReserveInput) {
  const generationId = crypto.randomUUID();
  const reservedCredits = toBillableCredits(input.selectedPricing?.creditPrice);

  const generation = await getDb().transaction(async (tx) => {
    let nextOneTime = 0;
    let nextSubscription = 0;

    if (reservedCredits > 0) {
      const usageResults = await tx
        .select({
          oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
          subscriptionCreditsBalance: usage.subscriptionCreditsBalance,
        })
        .from(usage)
        .where(eq(usage.userId, input.userId))
        .for("update");

      const usageRecord = usageResults[0];
      if (!usageRecord) {
        throw Object.assign(new Error("Insufficient credits."), { status: 402 });
      }

      const totalCredits =
        usageRecord.oneTimeCreditsBalance +
        usageRecord.subscriptionCreditsBalance;
      if (totalCredits < reservedCredits) {
        throw Object.assign(
          new Error(`Insufficient credits. This request requires ${reservedCredits} credits.`),
          { status: 402 },
        );
      }

      const deductedFromSubscription = Math.min(
        usageRecord.subscriptionCreditsBalance,
        reservedCredits,
      );
      const deductedFromOneTime = reservedCredits - deductedFromSubscription;

      nextSubscription =
        usageRecord.subscriptionCreditsBalance - deductedFromSubscription;
      nextOneTime = usageRecord.oneTimeCreditsBalance - deductedFromOneTime;

      await tx
        .update(usage)
        .set({
          oneTimeCreditsBalance: nextOneTime,
          subscriptionCreditsBalance: nextSubscription,
        })
        .where(eq(usage.userId, input.userId));
    } else {
      const usageResults = await tx
        .select({
          oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
          subscriptionCreditsBalance: usage.subscriptionCreditsBalance,
        })
        .from(usage)
        .where(eq(usage.userId, input.userId))
        .limit(1);

      nextOneTime = usageResults[0]?.oneTimeCreditsBalance ?? 0;
      nextSubscription = usageResults[0]?.subscriptionCreditsBalance ?? 0;
    }

    const inserted = await tx
      .insert(aiStudioGenerations)
      .values({
        id: generationId,
        userId: input.userId,
        catalogModelId: input.modelId,
        category: input.detail.category,
        titleSnapshot: input.detail.title,
        providerSnapshot: input.detail.provider,
        endpointSnapshot: input.detail.endpoint,
        methodSnapshot: input.detail.method,
        requestPayload: input.payload,
        officialPricingSnapshot: input.selectedPricing,
        creditsReserved: reservedCredits,
      })
      .returning();

    if (reservedCredits > 0) {
      await tx.insert(creditLogs).values({
        userId: input.userId,
        amount: -reservedCredits,
        oneTimeCreditsSnapshot: nextOneTime,
        subscriptionCreditsSnapshot: nextSubscription,
        type: "ai_studio_reserve",
        notes: buildReserveNotes(generationId, input.detail, input.selectedPricing),
      });
    }

    return inserted[0]!;
  });

  return {
    generation,
    reservedCredits,
  };
}

export async function markAiStudioGenerationSubmitted(
  generationId: string,
  input: {
    providerTaskId: string | null;
    raw: unknown;
    state: "submitted" | "queued" | "running" | "succeeded";
    mediaUrls: string[];
  },
) {
  const update: Partial<typeof aiStudioGenerations.$inferInsert> = {
    providerTaskId: input.providerTaskId ?? undefined,
    responsePayload: input.raw,
    providerState: input.state,
    status: input.state,
  };

  if (input.mediaUrls.length > 0) {
    update.resultUrls = input.mediaUrls;
  }

  if (input.state === "succeeded") {
    update.completedAt = new Date();
  }

  const result = await getDb()
    .update(aiStudioGenerations)
    .set(update)
    .where(eq(aiStudioGenerations.id, generationId))
    .returning();

  return result[0] ?? null;
}

async function refundReservedCredits(
  generation: AiStudioGenerationRecord,
  tx: any,
) {
  const refundable = generation.creditsReserved - generation.creditsRefunded;
  if (refundable <= 0) {
    return generation;
  }

  const updatedUsage = await tx
    .insert(usage)
    .values({
      userId: generation.userId,
      oneTimeCreditsBalance: refundable,
    })
    .onConflictDoUpdate({
      target: usage.userId,
      set: {
        oneTimeCreditsBalance: sql`${usage.oneTimeCreditsBalance} + ${refundable}`,
      },
    })
    .returning({
      oneTimeCreditsSnapshot: usage.oneTimeCreditsBalance,
      subscriptionCreditsSnapshot: usage.subscriptionCreditsBalance,
    });

  const balances = updatedUsage[0];
  await tx.insert(creditLogs).values({
    userId: generation.userId,
    amount: refundable,
    oneTimeCreditsSnapshot: balances?.oneTimeCreditsSnapshot ?? 0,
    subscriptionCreditsSnapshot: balances?.subscriptionCreditsSnapshot ?? 0,
    type: "ai_studio_refund",
    notes: stringifyNotes({
      generationId: generation.id,
      providerTaskId: generation.providerTaskId,
      credits: refundable,
    }),
  });

  const updated = await tx
    .update(aiStudioGenerations)
    .set({
      creditsRefunded: generation.creditsRefunded + refundable,
    })
    .where(eq(aiStudioGenerations.id, generation.id))
    .returning();

  return updated[0] ?? generation;
}

export async function settleAiStudioGenerationSuccess(
  generationId: string,
  input: {
    raw: unknown;
    mediaUrls: string[];
    providerState?: string | null;
  },
) {
  return getDb().transaction(async (tx) => {
    const current = await tx
      .select()
      .from(aiStudioGenerations)
      .where(eq(aiStudioGenerations.id, generationId))
      .for("update");

    const generation = current[0];
    if (!generation) {
      return null;
    }

    if (generation.status === "succeeded" || generation.status === "failed") {
      return generation;
    }

    const resultUrls = await persistAiStudioMediaUrls({
      category: generation.category,
      mediaUrls: input.mediaUrls,
    });

    const updated = await tx
      .update(aiStudioGenerations)
      .set({
        status: "succeeded",
        providerState: input.providerState ?? "succeeded",
        responsePayload: input.raw,
        resultUrls,
        creditsCaptured: generation.creditsReserved,
        completedAt: generation.completedAt ?? new Date(),
        statusReason: null,
      })
      .where(eq(aiStudioGenerations.id, generation.id))
      .returning();

    return updated[0] ?? null;
  });
}

export async function settleAiStudioGenerationFailure(
  generationId: string,
  input: {
    raw: unknown;
    reason?: string | null;
    providerState?: string | null;
  },
) {
  return getDb().transaction(async (tx) => {
    const current = await tx
      .select()
      .from(aiStudioGenerations)
      .where(eq(aiStudioGenerations.id, generationId))
      .for("update");

    let generation = current[0];
    if (!generation) {
      return null;
    }

    if (generation.status === "succeeded") {
      return generation;
    }

    if (generation.status !== "failed") {
      const updated = await tx
        .update(aiStudioGenerations)
        .set({
          status: "failed",
          providerState: input.providerState ?? "failed",
          responsePayload: input.raw,
          statusReason: input.reason ?? generation.statusReason,
          failedAt: generation.failedAt ?? new Date(),
        })
        .where(eq(aiStudioGenerations.id, generation.id))
        .returning();
      generation = updated[0] ?? generation;
    }

    return refundReservedCredits(generation, tx);
  });
}

export async function forceFailAiStudioGeneration(
  generationId: string,
  input: {
    raw?: unknown;
    reason?: string | null;
    providerState?: string | null;
  },
) {
  return getDb().transaction(async (tx) => {
    const current = await tx
      .select()
      .from(aiStudioGenerations)
      .where(eq(aiStudioGenerations.id, generationId))
      .for("update");

    let generation = current[0];
    if (!generation) {
      return null;
    }

    const updated = await tx
      .update(aiStudioGenerations)
      .set({
        status: "failed",
        providerState: input.providerState ?? "failed",
        responsePayload:
          input.raw !== undefined ? input.raw : generation.responsePayload,
        statusReason: input.reason ?? generation.statusReason,
        failedAt: generation.failedAt ?? new Date(),
        completedAt: null,
        creditsCaptured: 0,
      })
      .where(eq(aiStudioGenerations.id, generation.id))
      .returning();

    generation = updated[0] ?? generation;
    return refundReservedCredits(generation, tx);
  });
}

export async function updateAiStudioGenerationProgress(
  generationId: string,
  input: {
    raw: unknown;
    state: "queued" | "running" | "submitted";
    mediaUrls: string[];
  },
) {
  const current = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.id, generationId))
    .limit(1);

  if (
    current[0]?.status === "succeeded" ||
    current[0]?.status === "failed"
  ) {
    return current[0];
  }

  const updated = await getDb()
    .update(aiStudioGenerations)
    .set({
      status: input.state,
      providerState: input.state,
      responsePayload: input.raw,
      resultUrls: input.mediaUrls.length > 0 ? input.mediaUrls : undefined,
    })
    .where(eq(aiStudioGenerations.id, generationId))
    .returning();

  return updated[0] ?? null;
}

export async function getAiStudioGenerationForUserByTaskId(
  userId: string,
  taskId: string,
) {
  const results = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(
      and(
        eq(aiStudioGenerations.userId, userId),
        eq(aiStudioGenerations.providerTaskId, taskId),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getAiStudioGenerationByTaskId(taskId: string) {
  const results = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.providerTaskId, taskId))
    .limit(1);

  return results[0] ?? null;
}

export async function setAiStudioGenerationCallback(
  generationId: string,
  callbackPayload: unknown,
) {
  const updated = await getDb()
    .update(aiStudioGenerations)
    .set({
      callbackPayload,
    })
    .where(eq(aiStudioGenerations.id, generationId))
    .returning();

  return updated[0] ?? null;
}

export async function listAiStudioGenerationsForUser(userId: string, limit = 20) {
  return getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.userId, userId))
    .orderBy(desc(aiStudioGenerations.createdAt))
    .limit(limit);
}

export async function updateAiStudioGenerationVisibilityForUser(
  userId: string,
  generationId: string,
  isPublic: boolean,
) {
  const result = await getDb()
    .update(aiStudioGenerations)
    .set({
      isPublic,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiStudioGenerations.id, generationId),
        eq(aiStudioGenerations.userId, userId),
      ),
    )
    .returning({
      id: aiStudioGenerations.id,
      isPublic: aiStudioGenerations.isPublic,
    });

  return result[0] ?? null;
}

export async function softDeleteAiStudioGenerationForUser(
  userId: string,
  generationId: string,
) {
  const result = await getDb()
    .update(aiStudioGenerations)
    .set({
      userDeletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiStudioGenerations.id, generationId),
        eq(aiStudioGenerations.userId, userId),
        sql`${aiStudioGenerations.userDeletedAt} is null`,
      ),
    )
    .returning({
      id: aiStudioGenerations.id,
    });

  return result[0] ?? null;
}
