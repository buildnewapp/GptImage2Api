import type {
  PayPalCustomIdPayload,
  PayPalLink,
  PayPalOrder,
  PayPalWebhookVerificationPayload,
} from "@/lib/paypal/types";

export function encodePayPalCustomId(payload: PayPalCustomIdPayload): string {
  return JSON.stringify(payload);
}

export function decodePayPalCustomId(
  value: string | null | undefined,
): PayPalCustomIdPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PayPalCustomIdPayload>;
    if (!parsed.userId || !parsed.planId) {
      return null;
    }

    return {
      planId: parsed.planId,
      userId: parsed.userId,
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
  switch (status) {
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
