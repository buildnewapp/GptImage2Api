import {
  handleSubotizInvoicePaid,
  handleSubotizRefundSucceeded,
  handleSubotizSubscriptionUpdated,
  handleSubotizTradeSucceeded,
} from "@/app/api/subotiz/webhook/handlers";
import { apiResponse } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/error-utils";
import type {
  SubotizInvoice,
  SubotizRefund,
  SubotizSubscription,
  SubotizTrade,
  SubotizWebhookEvent,
} from "@/lib/subotiz/types";
import { verifySubotizSignature } from "@/lib/subotiz/webhook";

const SUBSCRIPTION_EVENTS = new Set([
  "v2.subscription.first",
  "v2.subscription.canceled",
  "v2.subscription.price_changed",
  "v2.subscription.paused",
  "v2.subscription.resumed",
  "v2.subscription.past_due",
  "v2.subscription.unpaid",
  "v2.subscription.cancellation_revoked",
  "v2.subscription.cancellation_requested",
  "v2.subscription.fixed_term_updated",
  "v2.subscription.price_change_revoked",
]);

async function processWebhookEvent(event: SubotizWebhookEvent) {
  if (event.type === "v2.trades.succeeded") {
    await handleSubotizTradeSucceeded(
      event as SubotizWebhookEvent<SubotizTrade>,
    );
    return;
  }

  if (event.type === "v2.invoice.paid") {
    await handleSubotizInvoicePaid(
      event as SubotizWebhookEvent<SubotizInvoice>,
    );
    return;
  }

  if (event.type === "v2.refunds.succeeded") {
    await handleSubotizRefundSucceeded(
      event as SubotizWebhookEvent<SubotizRefund>,
    );
    return;
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    await handleSubotizSubscriptionUpdated(
      event as SubotizWebhookEvent<SubotizSubscription>,
    );
    return;
  }

  console.info(`[Subotiz webhook] Ignored event type ${event.type}`);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");
  const currentSecret =
    process.env.SUBOTIZ_WEBHOOK_SECRET || process.env.SUBOTIZ_API_KEY;
  const previousSecret = process.env.SUBOTIZ_WEBHOOK_PREVIOUS_SECRET;

  if (!currentSecret) {
    console.error("Subotiz webhook secret is not configured.");
    return apiResponse.serverError("Webhook secret not configured.");
  }
  if (!timestamp || !signature) {
    return apiResponse.badRequest("Missing Subotiz webhook signature headers.");
  }

  const secrets = [previousSecret, currentSecret].filter(
    (secret): secret is string => Boolean(secret),
  );
  const isValid = secrets.some((secret) =>
    verifySubotizSignature({
      body: rawBody,
      secret,
      signature,
      timestamp,
    }),
  );
  if (!isValid) {
    return apiResponse.badRequest(
      "Subotiz webhook signature verification failed.",
    );
  }

  let event: SubotizWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SubotizWebhookEvent;
  } catch {
    return apiResponse.badRequest("Invalid Subotiz webhook payload.");
  }

  if (!event.id || !event.type || !event.data) {
    return apiResponse.badRequest("Incomplete Subotiz webhook payload.");
  }

  try {
    await processWebhookEvent(event);
    return apiResponse.success({ received: true });
  } catch (error) {
    console.error(`[Subotiz webhook] Failed to process ${event.type}:`, error);
    return apiResponse.serverError(
      `Subotiz webhook handler failed: ${getErrorMessage(error)}`,
    );
  }
}
