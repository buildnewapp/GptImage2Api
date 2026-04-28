import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { orders as ordersSchema, pricingPlans as pricingPlansSchema, usage as usageSchema } from "@/lib/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type MembershipLevel = "none" | "standard" | "pro" | "max";

function getMembershipLevelFromRank(rank: number): MembershipLevel {
  if (rank >= 3) return "max";
  if (rank >= 2) return "pro";
  if (rank >= 1) return "standard";
  return "none";
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const db = getDb();
    const membershipRankExpr = sql<number>`
      case
        when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%max%' then 3
        when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%pro%' then 2
        when lower(coalesce(${pricingPlansSchema.cardTitle}, '')) like '%standard%' then 1
        else 0
      end
    `;

    const [usageRows, membershipRows] = await Promise.all([
      db
        .select({
          subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
          oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        })
        .from(usageSchema)
        .where(eq(usageSchema.userId, user.id))
        .limit(1),
      db
        .select({
          planTitle: pricingPlansSchema.cardTitle,
          rank: membershipRankExpr,
        })
        .from(ordersSchema)
        .leftJoin(pricingPlansSchema, eq(ordersSchema.planId, pricingPlansSchema.id))
        .where(
          and(
            eq(ordersSchema.userId, user.id),
            inArray(ordersSchema.status, ["succeeded", "active"]),
          ),
        )
        .orderBy(desc(membershipRankExpr), desc(ordersSchema.createdAt))
        .limit(1),
    ]);

    const usageData = usageRows[0];
    const credits = (usageData?.subscriptionCreditsBalance ?? 0) + (usageData?.oneTimeCreditsBalance ?? 0);

    const membershipData = membershipRows[0];
    const membershipLevel = getMembershipLevelFromRank(Number(membershipData?.rank ?? 0));

    return apiResponse.success({
      user,
      credits,
      membership: {
        isVip: membershipLevel !== "none",
        level: membershipLevel,
        planTitle: membershipData?.planTitle ?? null,
      },
    });
  } catch (error: any) {
    return apiResponse.serverError(error?.message || "Failed to fetch user profile.");
  }
}
