import { apiResponse } from "@/lib/api-response";
import { PayPalClient } from "@/lib/paypal/client";
import {
  handlePayPalSubscriptionPaymentCompleted,
  syncPayPalOrderData,
  syncPayPalSubscriptionData,
} from "@/lib/paypal/service";
import type { PayPalWebhookEvent } from "@/lib/paypal/types";

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

async function processWebhookEvent(payload: PayPalWebhookEvent) {
  const client = new PayPalClient();

  switch (payload.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      const orderId = payload.resource?.id;
      if (orderId) {
        await tryCaptureOrder(client, orderId);
      }
      return;
    }
    case "PAYMENT.CAPTURE.COMPLETED": {
      const orderId =
        payload.resource?.supplementary_data?.related_ids?.order_id ?? null;
      if (!orderId) {
        return;
      }

      const order = await client.getOrder(orderId);
      await syncPayPalOrderData(order);
      return;
    }
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      const subscriptionId = payload.resource?.id;
      if (!subscriptionId) {
        return;
      }

      await syncPayPalSubscriptionData(subscriptionId);
      return;
    }
    case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
      await handlePayPalSubscriptionPaymentCompleted(payload.resource);
      return;
    default:
      console.warn(`[PayPal webhook] Unhandled event type: ${payload.event_type}`);
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  let payload: PayPalWebhookEvent;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("[PayPal webhook] Invalid JSON payload:", error);
    return apiResponse.badRequest("Invalid webhook payload");
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    try {
      const client = new PayPalClient();
      const verified = await client.verifyWebhookSignature({
        body: payload,
        headers: req.headers,
        webhookId,
      });

      if (!verified) {
        return apiResponse.badRequest(
          "PayPal webhook signature verification failed",
        );
      }
    } catch (error) {
      console.error("[PayPal webhook] Signature verification failed:", error);
      return apiResponse.badRequest(
        "PayPal webhook signature verification failed",
      );
    }
  } else {
    console.warn(
      "[PayPal webhook] PAYPAL_WEBHOOK_ID not configured, signature verification skipped.",
    );
  }

  try {
    await processWebhookEvent(payload);
    return apiResponse.success({ received: true });
  } catch (error) {
    console.error("[PayPal webhook] Processing failed:", error);
    const message =
      error instanceof Error ? error.message : "PayPal webhook handler failed";
    return apiResponse.serverError(message);
  }
}
