import { PayPalClient } from "@/lib/paypal/client";
import {
  syncPayPalOrderData,
  syncPayPalSubscriptionData,
} from "@/lib/paypal/service";
import { getURL } from "@/lib/url";
import { NextResponse } from "next/server";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const subscriptionId = url.searchParams.get("subscription_id");
  const client = new PayPalClient();

  try {
    if (subscriptionId) {
      const subscription = await client.getSubscription(subscriptionId);
      await syncPayPalSubscriptionData(subscriptionId, subscription);
      return NextResponse.redirect(
        getURL(
          `payment/success?provider=paypal&subscription_id=${encodeURIComponent(subscriptionId)}`,
        ),
      );
    }

    if (token) {
      await tryCaptureOrder(client, token);
      const order = await client.getOrder(token);

      if (order.status === "COMPLETED") {
        await syncPayPalOrderData(order);
      }

      return NextResponse.redirect(
        getURL(`payment/success?provider=paypal&token=${encodeURIComponent(token)}`),
      );
    }
  } catch (error) {
    console.error("[PayPal callback] Failed to handle callback:", error);
    const message =
      error instanceof Error ? error.message : "PayPal callback failed";
    return NextResponse.redirect(
      getURL(`redirect-error?message=${encodeURIComponent(message)}`),
    );
  }

  return NextResponse.redirect(
    getURL(process.env.NEXT_PUBLIC_PRICING_PATH ?? "pricing"),
  );
}
