import type {
  PayPalCustomIdPayload,
  PayPalLink,
  PayPalOrder,
  PayPalWebhookVerificationPayload,
} from "@/lib/paypal/types";

export function encodePayPalCustomId(payload: PayPalCustomIdPayload): string {
  if (payload.checkoutOrderId) {
    // Three UUIDs fit within PayPal's 127-character custom_id limit as an array.
    return JSON.stringify([payload.planId, payload.userId, payload.checkoutOrderId]);
  }
  return JSON.stringify(payload);
}

export function decodePayPalCustomId(
  value: string | null | undefined,
): PayPalCustomIdPayload | null {
  if (!value) {
    return null;
  }

  try {
    const valueParsed = JSON.parse(value);
    const parsed: Partial<PayPalCustomIdPayload> | null = Array.isArray(valueParsed)
      ? { planId: valueParsed[0], userId: valueParsed[1], checkoutOrderId: valueParsed[2] }
      : valueParsed;
    if (!parsed || typeof parsed.userId !== 'string' || !parsed.userId ||
        typeof parsed.planId !== 'string' || !parsed.planId ||
        (parsed.checkoutOrderId !== undefined && typeof parsed.checkoutOrderId !== 'string')) {
      return null;
    }

    return {
      planId: parsed.planId,
      userId: parsed.userId,
      ...(parsed.checkoutOrderId && { checkoutOrderId: parsed.checkoutOrderId }),
    };
  } catch {
    return null;
  }
}

export function getPayPalApprovalUrl(
  links: PayPalLink[] | null | undefined,
): string | null {
  return links?.find((link) => link.rel === "approve")?.href ?? null;
}

export function mapPayPalOrderStatus(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return "succeeded";
    case "VOIDED":
    case "DECLINED":
    case "FAILED":
      return "failed";
    case "APPROVED":
    case "CREATED":
    case "PAYER_ACTION_REQUIRED":
    default:
      return "pending";
  }
}

export function mapPayPalSubscriptionStatus(
  status: string | null | undefined,
): string {
  return status?.toLowerCase() || "pending";
}

export function getPayPalOrderCustomId(
  order: Pick<PayPalOrder, "purchase_units">,
): string | null {
  return order.purchase_units?.[0]?.custom_id ?? null;
}

export function buildPayPalWebhookVerificationPayload({
  body,
  headers,
  webhookId,
}: {
  body: unknown;
  headers: Headers;
  webhookId: string;
}): PayPalWebhookVerificationPayload {
  return {
    auth_algo: headers.get("paypal-auth-algo") ?? "",
    cert_url: headers.get("paypal-cert-url") ?? "",
    transmission_id: headers.get("paypal-transmission-id") ?? "",
    transmission_sig: headers.get("paypal-transmission-sig") ?? "",
    transmission_time: headers.get("paypal-transmission-time") ?? "",
    webhook_event: body,
    webhook_id: webhookId,
  };
}

export function getPayPalCaptureId(
  order: Pick<PayPalOrder, "purchase_units">,
): string | null {
  return order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
}

export function parsePayPalAmount(value: string | null | undefined): string {
  if (!value) {
    return "0.00";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}
