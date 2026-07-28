import { apiResponse } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  subscriptions as subscriptionsSchema,
} from "@/lib/db/schema";
import { isSubscriptionOrder } from "@/lib/payments/provider-utils";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import {
  buildOrderResponse,
  buildSubscriptionResponse,
  getSubscriptionByIdAndUser,
} from "./helpers";

export async function verifySubotizPayment(
  req: NextRequest,
  userId: string,
): Promise<NextResponse> {
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return apiResponse.badRequest("Missing order_id parameter");
  }

  const db = getDb();
  const [order] = await db
    .select({
      id: ordersSchema.id,
      metadata: ordersSchema.metadata,
      orderType: ordersSchema.orderType,
      planId: ordersSchema.planId,
      status: ordersSchema.status,
      subscriptionId: ordersSchema.subscriptionId,
    })
    .from(ordersSchema)
    .where(
      and(
        eq(ordersSchema.provider, "subotiz"),
        eq(ordersSchema.userId, userId),
        sql`${ordersSchema.metadata} ->> 'subotizOrderId' = ${orderId}`,
      ),
    )
    .orderBy(desc(ordersSchema.createdAt))
    .limit(1);

  if (order) {
    if (isSubscriptionOrder(order.orderType) && order.subscriptionId) {
      const subscription = await getSubscriptionByIdAndUser(
        order.subscriptionId,
        userId,
      );
      if (subscription) {
        return buildSubscriptionResponse(subscription);
      }
    }

    return buildOrderResponse(order);
  }

  const [subscription] = await db
    .select({
      id: subscriptionsSchema.id,
      metadata: subscriptionsSchema.metadata,
      planId: subscriptionsSchema.planId,
      status: subscriptionsSchema.status,
      subscriptionId: subscriptionsSchema.subscriptionId,
    })
    .from(subscriptionsSchema)
    .where(
      and(
        eq(subscriptionsSchema.provider, "subotiz"),
        eq(subscriptionsSchema.userId, userId),
        sql`${subscriptionsSchema.metadata} ->> 'subotizOrderId' = ${orderId}`,
      ),
    )
    .orderBy(desc(subscriptionsSchema.createdAt))
    .limit(1);

  if (subscription) {
    return buildSubscriptionResponse(subscription);
  }

  return apiResponse.success({
    message:
      "Payment successful! Confirmation may take a moment. Please refresh shortly.",
  });
}
