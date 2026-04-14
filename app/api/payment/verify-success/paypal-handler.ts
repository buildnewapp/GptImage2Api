import { apiResponse } from "@/lib/api-response";
import {
  decodePayPalCustomId,
  getPayPalOrderCustomId,
} from "@/lib/paypal";
import { PayPalClient } from "@/lib/paypal/client";
import {
  handlePayPalSubscriptionPaymentCompleted,
  syncPayPalOrderData,
  syncPayPalSubscriptionData,
} from "@/lib/paypal/service";
import { NextRequest, NextResponse } from "next/server";
import {
  buildOrderResponse,
  buildSubscriptionResponse,
  getOrderByProviderAndUser,
  getPlanSummaryById,
  getSubscriptionByIdAndUser,
  validateUserIdMatch,
} from "./helpers";

async function tryCaptureOrder(client: PayPalClient, orderId: string) {
  try {
    await client.captureOrder(orderId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PayPal capture error";
    if (
      message.includes("ORDER_ALREADY_CAPTURED") ||
      message.includes("ORDER_NOT_APPROVED")
    ) {
      return;
    }
    throw error;
  }
}

export async function verifyPayPalPayment(
  req: NextRequest,
  userId: string,
): Promise<NextResponse> {
  const client = new PayPalClient();
  const subscriptionId = req.nextUrl.searchParams.get("subscription_id");

  if (subscriptionId) {
    const subscription = await client.getSubscription(subscriptionId);
    const customId = decodePayPalCustomId(subscription.custom_id);
    const planSummary = await getPlanSummaryById(customId?.planId);

    const userIdError = validateUserIdMatch(
      customId?.userId,
      userId,
      subscriptionId,
      "paypal",
    );
    if (userIdError) {
      return userIdError;
    }

    try {
      await syncPayPalSubscriptionData(subscriptionId, subscription);
    } catch (error) {
      console.error(
        `[Verify API] Failed to sync PayPal subscription ${subscriptionId}:`,
        error,
      );
    }

    const dbSubscription = await getSubscriptionByIdAndUser(
      subscriptionId,
      userId,
    );

    if (!dbSubscription) {
      return apiResponse.success({
        planId: customId?.planId,
        planName: planSummary?.name,
        message:
          "Payment successful! Subscription activation may take a moment. Please refresh shortly.",
        status: subscription.status,
        subscriptionId,
      });
    }

    return buildSubscriptionResponse(dbSubscription);
  }

  const orderId =
    req.nextUrl.searchParams.get("token") ??
    req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return apiResponse.badRequest(
      "Missing token or subscription_id parameter",
    );
  }

  let order = await client.getOrder(orderId);
  const customId = decodePayPalCustomId(getPayPalOrderCustomId(order));
  const planSummary = await getPlanSummaryById(customId?.planId);

  const userIdError = validateUserIdMatch(
    customId?.userId,
    userId,
    orderId,
    "paypal",
  );
  if (userIdError) {
    return userIdError;
  }

  if (order.status === "APPROVED") {
    await tryCaptureOrder(client, orderId);
    order = await client.getOrder(orderId);
  }

  if (order.status === "COMPLETED") {
    try {
      await syncPayPalOrderData(order);
    } catch (error) {
      console.error(
        `[Verify API] Failed to sync PayPal order ${orderId}:`,
        error,
      );
    }
  }

  const dbOrder = await getOrderByProviderAndUser("paypal", orderId, userId);

  if (!dbOrder) {
    return apiResponse.success({
      orderId,
      planId: customId?.planId,
      planName: planSummary?.name,
      message:
        order.status === "COMPLETED"
          ? "Payment successful! Order confirmation may take a moment. Please refresh shortly."
          : "Payment recorded but not finalized yet. Please refresh in a moment.",
    });
  }

  return buildOrderResponse(dbOrder, {
    planName: planSummary?.name,
  });
}
