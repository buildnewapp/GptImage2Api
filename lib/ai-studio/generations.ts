import { getDb } from "@/lib/db";
import {
  aiStudioGenerations,
  creditLogs,
  subscriptionCreditBuckets,
  usage,
} from "@/lib/db/schema";
import type {
  AiStudioCatalogEntry,
  AiStudioDocDetail,
  AiStudioPricingRow,
} from "@/lib/ai-studio/catalog";
import {
  hasNonR2AiStudioMediaUrls,
  persistAiStudioMediaUrls,
} from "@/lib/ai-studio/assets";
import { getEstimatedCreditsForPricing } from "@/lib/ai-studio/runtime";
import {
  asc,
  and,
  desc,
  eq,
  gt,
  sql,
} from "drizzle-orm";

export type AiStudioGenerationRecord = typeof aiStudioGenerations.$inferSelect;

const PROGRESS_UPDATE_MIN_INTERVAL_MS = 20_000;

type ReserveInput = {
  userId: string;
  modelId: string;
  isPublic: boolean;
  detail: AiStudioDocDetail;
  payload: Record<string, any>;
  selectedPricing: AiStudioPricingRow | null;
};

type ReservedBucketAllocation = {
  bucketId: string;
  provider: "stripe" | "creem" | "paypal";
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  expiresAt: string;
  relatedOrderId: string | null;
  amount: number;
};

function stringifyNotes(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function normalizeMediaUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];
}

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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
  const reservedCredits = getEstimatedCreditsForPricing(
    input.selectedPricing,
    input.payload,
  );

  if (reservedCredits <= 0) {
    throw Object.assign(new Error("AI_STUDIO_MODEL_UNAVAILABLE"), {
      status: 400,
    });
  }

  const generation = await getDb().transaction(async (tx) => {
    let nextOneTime = 0;
    let nextSubscription = 0;
    let reservedFromSubscription = 0;
    let reservedFromOneTime = 0;
    let bucketAllocations: ReservedBucketAllocation[] = [];

    if (reservedCredits > 0) {
      const usageResults = await tx
        .select({
          oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
        })
        .from(usage)
        .where(eq(usage.userId, input.userId))
        .for("update");

      const usageRecord = usageResults[0];
      const oneTimeBalance = usageRecord?.oneTimeCreditsBalance ?? 0;

      const now = new Date();
      const bucketRows = await tx
        .select({
          id: subscriptionCreditBuckets.id,
          provider: subscriptionCreditBuckets.provider,
          subscriptionId: subscriptionCreditBuckets.subscriptionId,
          periodStart: subscriptionCreditBuckets.periodStart,
          periodEnd: subscriptionCreditBuckets.periodEnd,
          expiresAt: subscriptionCreditBuckets.expiresAt,
          relatedOrderId: subscriptionCreditBuckets.relatedOrderId,
          creditsRemaining: subscriptionCreditBuckets.creditsRemaining,
        })
        .from(subscriptionCreditBuckets)
        .where(
          and(
            eq(subscriptionCreditBuckets.userId, input.userId),
            gt(subscriptionCreditBuckets.creditsRemaining, 0),
            gt(subscriptionCreditBuckets.expiresAt, now),
          ),
        )
        .orderBy(asc(subscriptionCreditBuckets.expiresAt))
        .for("update");

      const subscriptionBalance = bucketRows.reduce(
        (sum, bucket) => sum + bucket.creditsRemaining,
        0,
      );

      const totalCredits =
        oneTimeBalance + subscriptionBalance;
      if (totalCredits < reservedCredits) {
        throw Object.assign(
          new Error(`Insufficient credits. This request requires ${reservedCredits} credits.`),
          { status: 402 },
        );
      }

      const deductedFromSubscription = Math.min(
        subscriptionBalance,
        reservedCredits,
      );
      const deductedFromOneTime = reservedCredits - deductedFromSubscription;
      reservedFromSubscription = deductedFromSubscription;
      reservedFromOneTime = deductedFromOneTime;

      let remainingSubToDeduct = deductedFromSubscription;
      for (const bucket of bucketRows) {
        if (remainingSubToDeduct <= 0) {
          break;
        }
        const deduction = Math.min(bucket.creditsRemaining, remainingSubToDeduct);
        remainingSubToDeduct -= deduction;

        await tx
          .update(subscriptionCreditBuckets)
          .set({
            creditsRemaining: bucket.creditsRemaining - deduction,
          })
          .where(eq(subscriptionCreditBuckets.id, bucket.id));

        if (deduction > 0) {
          bucketAllocations.push({
            bucketId: bucket.id,
            provider: bucket.provider as "stripe" | "creem" | "paypal",
            subscriptionId: bucket.subscriptionId,
            periodStart: bucket.periodStart.toISOString(),
            periodEnd: bucket.periodEnd.toISOString(),
            expiresAt: bucket.expiresAt.toISOString(),
            relatedOrderId: bucket.relatedOrderId ?? null,
            amount: deduction,
          });
        }
      }

      nextSubscription = subscriptionBalance - deductedFromSubscription;
      nextOneTime = oneTimeBalance - deductedFromOneTime;

      if (usageRecord) {
        await tx
          .update(usage)
          .set({
            oneTimeCreditsBalance: nextOneTime,
            subscriptionCreditsBalance: nextSubscription,
          })
          .where(eq(usage.userId, input.userId));
      } else {
        await tx.insert(usage).values({
          userId: input.userId,
          oneTimeCreditsBalance: nextOneTime,
          subscriptionCreditsBalance: nextSubscription,
          balanceJsonb: {},
        });
      }
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
        isPublic: input.isPublic,
        category: input.detail.category,
        titleSnapshot: input.detail.title,
        providerSnapshot: input.detail.provider,
        endpointSnapshot: input.detail.endpoint,
        methodSnapshot: input.detail.method,
        requestPayload: input.payload,
        officialPricingSnapshot: input.selectedPricing,
        creditsReserved: reservedCredits,
        creditsReservedFromSubscription: reservedFromSubscription,
        creditsReservedFromOneTime: reservedFromOneTime,
        creditsBucketAllocations: bucketAllocations,
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

  const totalReservedFromSubscription =
    generation.creditsReservedFromSubscription ?? 0;
  const alreadyRefundedFromSubscription = Math.min(
    generation.creditsRefunded,
    totalReservedFromSubscription,
  );
  const remainingRefundableFromSubscription = Math.max(
    0,
    totalReservedFromSubscription - alreadyRefundedFromSubscription,
  );
  const refundToSubscription = Math.min(
    refundable,
    remainingRefundableFromSubscription,
  );
  const refundToOneTime = refundable - refundToSubscription;

  const usageRows = await tx
    .select({
      oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
    })
    .from(usage)
    .where(eq(usage.userId, generation.userId))
    .for("update");
  const usageRecord = usageRows[0];
  const currentOneTime = usageRecord?.oneTimeCreditsBalance ?? 0;

  const rawAllocations = Array.isArray(generation.creditsBucketAllocations)
    ? generation.creditsBucketAllocations
    : [];
  let remainingSubRefund = refundToSubscription;
  let restoredToSubscription = 0;

  for (const allocation of rawAllocations) {
    if (remainingSubRefund <= 0) {
      break;
    }
    if (!allocation || typeof allocation !== "object") {
      continue;
    }

    const provider = (allocation as any).provider;
    const subscriptionId = (allocation as any).subscriptionId;
    const amount = Number((allocation as any).amount ?? 0);
    const periodStartRaw = (allocation as any).periodStart;
    const periodEndRaw = (allocation as any).periodEnd;
    const expiresAtRaw = (allocation as any).expiresAt;
    const relatedOrderId = (allocation as any).relatedOrderId ?? null;

    if (
      (provider !== "stripe" && provider !== "creem" && provider !== "paypal") ||
      !subscriptionId ||
      !amount ||
      amount <= 0
    ) {
      continue;
    }

    const periodStart = new Date(periodStartRaw);
    const periodEnd = new Date(periodEndRaw);
    const expiresAt = new Date(expiresAtRaw);
    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      Number.isNaN(expiresAt.getTime())
    ) {
      continue;
    }

    const refundAmount = Math.min(amount, remainingSubRefund);
    remainingSubRefund -= refundAmount;
    restoredToSubscription += refundAmount;

    await tx
      .insert(subscriptionCreditBuckets)
      .values({
        userId: generation.userId,
        provider,
        subscriptionId,
        periodStart,
        periodEnd,
        expiresAt,
        creditsTotal: refundAmount,
        creditsRemaining: refundAmount,
        relatedOrderId,
      })
      .onConflictDoUpdate({
        target: [
          subscriptionCreditBuckets.provider,
          subscriptionCreditBuckets.subscriptionId,
          subscriptionCreditBuckets.periodStart,
        ],
        set: {
          periodEnd,
          expiresAt,
          creditsRemaining: sql`${subscriptionCreditBuckets.creditsRemaining} + ${refundAmount}`,
          relatedOrderId,
        },
      });
  }

  const refundToOneTimeFinal = refundable - restoredToSubscription;
  const nextOneTime = currentOneTime + refundToOneTimeFinal;
  const subRows = await tx
    .select({
      balance: sql<number>`coalesce(sum(${subscriptionCreditBuckets.creditsRemaining}), 0)`,
    })
    .from(subscriptionCreditBuckets)
    .where(
      and(
        eq(subscriptionCreditBuckets.userId, generation.userId),
        gt(subscriptionCreditBuckets.creditsRemaining, 0),
        gt(subscriptionCreditBuckets.expiresAt, new Date()),
      ),
    );
  const nextSubscription = Number(subRows[0]?.balance ?? 0);

  if (usageRecord) {
    await tx
      .update(usage)
      .set({
        oneTimeCreditsBalance: nextOneTime,
        subscriptionCreditsBalance: nextSubscription,
      })
      .where(eq(usage.userId, generation.userId));
  } else {
    await tx.insert(usage).values({
      userId: generation.userId,
      oneTimeCreditsBalance: nextOneTime,
      subscriptionCreditsBalance: nextSubscription,
      balanceJsonb: {},
    });
  }

  await tx.insert(creditLogs).values({
    userId: generation.userId,
    amount: refundable,
    oneTimeCreditsSnapshot: nextOneTime,
    subscriptionCreditsSnapshot: nextSubscription,
    type: "ai_studio_refund",
    notes: stringifyNotes({
      generationId: generation.id,
      providerTaskId: generation.providerTaskId,
      credits: refundable,
      refundToOneTime: refundToOneTimeFinal,
      refundToSubscription: restoredToSubscription,
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
  const existing = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.id, generationId))
    .limit(1);

  const generation = existing[0];
  if (!generation) {
    return null;
  }

  if (generation.status === "succeeded" || generation.status === "failed") {
    return generation;
  }

  return getDb().transaction(async (tx) => {
    const current = await tx
      .select()
      .from(aiStudioGenerations)
      .where(eq(aiStudioGenerations.id, generationId))
      .for("update");

    const latest = current[0];
    if (!latest) {
      return null;
    }

    if (latest.status === "succeeded" || latest.status === "failed") {
      return latest;
    }

    const updated = await tx
      .update(aiStudioGenerations)
      .set({
        status: "succeeded",
        providerState: input.providerState ?? "succeeded",
        responsePayload: input.raw,
        resultUrls: input.mediaUrls,
        creditsCaptured: latest.creditsReserved,
        completedAt: latest.completedAt ?? new Date(),
        statusReason: null,
      })
      .where(eq(aiStudioGenerations.id, latest.id))
      .returning();

    return updated[0] ?? null;
  });
}

export async function archiveAiStudioGenerationMediaUrls(generationId: string) {
  const existing = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.id, generationId))
    .limit(1);

  const generation = existing[0];
  if (!generation || generation.status !== "succeeded") {
    return generation ?? null;
  }

  const mediaUrls = normalizeMediaUrls(generation.resultUrls);
  if (
    mediaUrls.length === 0 ||
    !hasNonR2AiStudioMediaUrls(mediaUrls)
  ) {
    return generation;
  }

  const persistedUrls = await persistAiStudioMediaUrls({
    category: generation.category,
    mediaUrls,
  });

  if (areStringArraysEqual(mediaUrls, persistedUrls)) {
    return generation;
  }

  const updated = await getDb()
    .update(aiStudioGenerations)
    .set({
      resultUrls: persistedUrls,
    })
    .where(eq(aiStudioGenerations.id, generation.id))
    .returning();

  return updated[0] ?? generation;
}

export function archiveAiStudioGenerationMediaUrlsInBackground(
  generationId: string,
) {
  void archiveAiStudioGenerationMediaUrls(generationId).catch((error) => {
    console.warn("AI Studio media archival to R2 failed", {
      generationId,
      error,
    });
  });
}

export async function archivePendingAiStudioGenerationMediaUrls(limit = 10) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const candidates = await getDb()
    .select()
    .from(aiStudioGenerations)
    .where(eq(aiStudioGenerations.status, "succeeded"))
    .orderBy(desc(aiStudioGenerations.updatedAt))
    .limit(safeLimit * 5);

  let processed = 0;
  let updated = 0;

  for (const generation of candidates) {
    if (processed >= safeLimit) {
      break;
    }

    const mediaUrls = normalizeMediaUrls(generation.resultUrls);
    if (
      mediaUrls.length === 0 ||
      !hasNonR2AiStudioMediaUrls(mediaUrls)
    ) {
      continue;
    }

    processed += 1;
    const archived = await archiveAiStudioGenerationMediaUrls(generation.id);
    if (
      archived &&
      !areStringArraysEqual(mediaUrls, normalizeMediaUrls(archived.resultUrls))
    ) {
      updated += 1;
    }
  }

  return { processed, updated };
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

  const generation = current[0];
  if (!generation) {
    return null;
  }

  if (generation.status === "succeeded" || generation.status === "failed") {
    return generation;
  }

  const currentUrls = normalizeMediaUrls(generation.resultUrls);
  const urlsChanged =
    input.mediaUrls.length > 0 &&
    !areStringArraysEqual(currentUrls, input.mediaUrls);
  const stateChanged =
    generation.status !== input.state ||
    generation.providerState !== input.state;
  const updatedAtMs = generation.updatedAt?.getTime?.() ?? 0;
  const shouldRefreshPayload =
    Date.now() - updatedAtMs >= PROGRESS_UPDATE_MIN_INTERVAL_MS;

  if (!stateChanged && !urlsChanged && !shouldRefreshPayload) {
    return generation;
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
