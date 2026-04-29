import {
  canUseAiVideoStudioModelForMembership,
  getAiVideoStudioLevelLabel,
  resolveAiVideoStudioLevelLimitFromModelId,
  type AiVideoStudioLevelLimit,
} from "@/config/ai-video-studio";
import {
  prepareAiStudioExecution,
  submitAiStudioExecution,
} from "@/lib/ai-studio/execute";
import {
  archiveAiStudioGenerationMediaUrlsInBackground,
  markAiStudioGenerationSubmitted,
  reserveAiStudioGeneration,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccess,
} from "@/lib/ai-studio/generations";
import {
  getPublicAiStudioModelId,
  sanitizeAiStudioDebugValue,
  toPublicPricingRow,
} from "@/lib/ai-studio/public";
import {
  canAccessAiStudioModel,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { orders as ordersSchema, pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import { assertGenerationPromptAllowed } from "@/lib/moderation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

const inputSchema = z.object({
  modelId: z.string().min(1),
  isPublic: z.boolean().optional().default(true),
  moderation: z.string().optional(),
  payload: z.record(z.string(), z.any()),
});

function getMembershipLevelFromRank(rank: number): AiVideoStudioLevelLimit {
  if (rank >= 3) return "max";
  if (rank >= 2) return "pro";
  if (rank >= 1) return "standard";
  return "none";
}

async function getUserMembershipLevel(userId: string): Promise<AiVideoStudioLevelLimit> {
  const db = getDb();
  const membershipRankExpr = sql<number>`
    case
      when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%max%' then 3
      when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%pro%' then 2
      when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%standard%' then 1
      else 0
    end
  `;

  const rows = await db
    .select({
      rank: membershipRankExpr,
    })
    .from(ordersSchema)
    .leftJoin(pricingPlansSchema, eq(ordersSchema.planId, pricingPlansSchema.id))
    .where(
      and(
        eq(ordersSchema.userId, userId),
        inArray(ordersSchema.status, ["succeeded", "active"]),
      ),
    )
    .orderBy(desc(membershipRankExpr), desc(ordersSchema.createdAt))
    .limit(1);

  return getMembershipLevelFromRank(Number(rows[0]?.rank ?? 0));
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const input = inputSchema.parse(body);
    const requiredMembershipLevel =
      resolveAiVideoStudioLevelLimitFromModelId(input.modelId);
    if (user.role !== "admin" && requiredMembershipLevel !== "none") {
      const userMembershipLevel = await getUserMembershipLevel(user.id);
      if (
        !canUseAiVideoStudioModelForMembership({
          currentLevel: userMembershipLevel,
          requiredLevel: requiredMembershipLevel,
        })
      ) {
        const requiredLevelLabel =
          getAiVideoStudioLevelLabel(requiredMembershipLevel) ??
          requiredMembershipLevel.toUpperCase();
        return apiResponse.error(
          `This model requires ${requiredLevelLabel} membership.`,
          403,
        );
      }
    }

    const prepared = await prepareAiStudioExecution(input.modelId, input.payload);
    const policy = await loadAiStudioPolicyConfig();
    if (!canAccessAiStudioModel(prepared.detail, { role: user.role, config: policy })) {
      return apiResponse.error("This model is unavailable for your account.", 403);
    }

    await assertGenerationPromptAllowed({
      category: prepared.detail.category,
      payload: prepared.pricingPayload,
      requestModeration: input.moderation ?? null,
      externalId: `ai_studio:${user.id}:${prepared.detail.id}:${Date.now()}`,
    });

    const { generation, reservedCredits } = await reserveAiStudioGeneration({
      userId: user.id,
      modelId: input.modelId,
      isPublic: input.isPublic,
      detail: prepared.detail,
      payload: prepared.pricingPayload,
      selectedPricing: prepared.selectedPricing,
    });

    try {
      const result = await submitAiStudioExecution(prepared.detail, prepared.body);
      const state =
        result.taskId && result.statusEndpoint
          ? "queued"
          : "succeeded";
      let settledMediaUrls = result.mediaUrls;

      await markAiStudioGenerationSubmitted(generation.id, {
        providerTaskId: result.taskId,
        raw: result.raw,
        state,
        mediaUrls: result.mediaUrls,
      });

      if (state === "succeeded") {
        const settled = await settleAiStudioGenerationSuccess(generation.id, {
          raw: result.raw,
          mediaUrls: result.mediaUrls,
          providerState: "succeeded",
        });
        archiveAiStudioGenerationMediaUrlsInBackground(generation.id);
        if (Array.isArray(settled?.resultUrls)) {
          settledMediaUrls = settled.resultUrls as string[];
        }
      }

      return apiResponse.success({
        modelId: getPublicAiStudioModelId(prepared.detail),
        generationId: generation.id,
        reservedCredits,
        taskId: result.taskId,
        state,
        statusMode: result.statusMode,
        statusSupported: Boolean(result.statusEndpoint && result.taskId),
        statusEndpoint: result.statusEndpoint,
        raw: sanitizeAiStudioDebugValue(result.raw),
        mediaUrls: settledMediaUrls,
        selectedPricing: prepared.selectedPricing
          ? toPublicPricingRow(prepared.selectedPricing, prepared.detail)
          : null,
        pricingRows: prepared.detail.pricingRows.map((row) =>
          toPublicPricingRow(row, prepared.detail),
        ),
      });
    } catch (error: any) {
      await settleAiStudioGenerationFailure(generation.id, {
        raw: {
          message: error?.message || "Execution failed",
        },
        reason: error?.message || "Execution failed",
        providerState: "failed",
      });
      throw error;
    }
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    return apiResponse.error(
      error?.message || "Failed to execute AI Studio request",
      status,
    );
  }
}
