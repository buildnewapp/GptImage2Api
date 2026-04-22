import { createHmac, timingSafeEqual } from "node:crypto";

import { getErrorMessage } from "@/lib/error-utils";

const NOWPAYMENTS_API_BASE_URL =
  process.env.NOWPAYMENTS_API_URL ?? "https://api.nowpayments.io";
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

export type NowpaymentsOrderStatus = "pending" | "succeeded" | "failed";

export type NowpaymentsInvoiceResponse = {
  id?: string | number;
  invoice_url?: string;
  order_id?: string;
  payment_id?: string | number;
  [key: string]: unknown;
};

export type NowpaymentsPayment = {
  payment_id?: string | number;
  payment_status?: string;
  order_id?: string;
  order_description?: string;
  [key: string]: unknown;
};

export type NowpaymentsInvoice = {
  id?: string | number;
  order_id?: string;
  payment_id?: string | number;
  payment_status?: string;
  payments?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type NowpaymentsPaymentListResponse = {
  data?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

type NowpaymentsRequestInit = Omit<RequestInit, "headers" | "body"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const record = value as Record<string, unknown>;

    return Object.keys(record)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep(record[key]);
        return acc;
      }, {});
  }

  return value;
}

export function computeNowpaymentsSignature(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const canonicalPayload = JSON.stringify(sortKeysDeep(payload));
  return createHmac("sha512", secret).update(canonicalPayload).digest("hex");
}

export function verifyNowpaymentsSignature({
  payload,
  signature,
  secret,
}: {
  payload: Record<string, unknown>;
  signature: string;
  secret: string;
}): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expected = computeNowpaymentsSignature(payload, secret);
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature.trim().toLowerCase(), "hex");

  if (left.length === 0 || left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function mapNowpaymentsStatusToOrderStatus(
  status: string | null | undefined,
): NowpaymentsOrderStatus {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "finished" || normalized === "confirmed") {
    return "succeeded";
  }

  if (
    normalized === "failed" ||
    normalized === "expired" ||
    normalized === "refunded"
  ) {
    return "failed";
  }

  return "pending";
}

export function extractNowpaymentsOrderNo(
  payload: Record<string, unknown>,
): string {
  const orderId = payload.order_id;
  if (typeof orderId === "string" && orderId.trim()) {
    return orderId.trim();
  }

  const description = payload.order_description;
  if (typeof description === "string" && description.trim()) {
    const matches = description.match(/(?:^|[;\s])order_no:([a-zA-Z0-9_-]+)/);
    if (matches?.[1]) {
      return matches[1];
    }
  }

  return "";
}

export function extractNowpaymentsPaymentId(
  payload: Record<string, unknown>,
): string {
  const paymentId = payload.payment_id;
  if (typeof paymentId === "string" && paymentId.trim()) {
    return paymentId.trim();
  }
  if (typeof paymentId === "number" && Number.isFinite(paymentId)) {
    return String(paymentId);
  }
  return "";
}

export function getNowpaymentsSessionId(
  payload: Record<string, unknown>,
): string {
  const paymentId = extractNowpaymentsPaymentId(payload);
  if (paymentId) {
    return paymentId;
  }

  const invoiceId = payload.id;
  if (typeof invoiceId === "string" && invoiceId.trim()) {
    return invoiceId.trim();
  }
  if (typeof invoiceId === "number" && Number.isFinite(invoiceId)) {
    return String(invoiceId);
  }

  return "";
}

export class NowpaymentsClient {
  constructor(
    private readonly apiKey: string,
    private readonly apiUrl = NOWPAYMENTS_API_BASE_URL,
  ) {}

  private async request<T>(
    path: string,
    init: NowpaymentsRequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      body:
        init.body === undefined || init.body === null
          ? undefined
          : typeof init.body === "string"
            ? init.body
            : JSON.stringify(init.body),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message =
        json?.message ||
        json?.error ||
        `NOWPayments request failed: ${response.status}`;
      throw new Error(message);
    }

    return json as T;
  }

  createInvoice(payload: Record<string, unknown>) {
    return this.request<NowpaymentsInvoiceResponse>("/v1/invoice", {
      method: "POST",
      body: payload,
    });
  }

  getPayment(paymentId: string) {
    return this.request<NowpaymentsPayment>(
      `/v1/payment/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
      },
    );
  }

  getInvoice(invoiceId: string) {
    return this.request<NowpaymentsInvoice>(
      `/v1/invoice/${encodeURIComponent(invoiceId)}`,
      {
        method: "GET",
      },
    );
  }

  async listPayments({
    orderId,
    limit = 20,
    offset = 0,
  }: {
    orderId: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<Record<string, unknown>>> {
    const result = await this.request<NowpaymentsPaymentListResponse>(
      `/v1/payment?limit=${limit}&offset=${offset}&order_id=${encodeURIComponent(orderId)}`,
      {
        method: "GET",
      },
    );

    return Array.isArray(result.data) ? result.data : [];
  }
}

export function getNowpaymentsClient(): NowpaymentsClient {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error(
      "NOWPayments API key is not configured. Set NOWPAYMENTS_API_KEY to enable NOWPayments integration.",
    );
  }

  return new NowpaymentsClient(NOWPAYMENTS_API_KEY);
}

export function getNowpaymentsIpnSecret(): string {
  if (!NOWPAYMENTS_IPN_SECRET) {
    throw new Error(
      "NOWPayments IPN secret is not configured. Set NOWPAYMENTS_IPN_SECRET to verify NOWPayments webhooks.",
    );
  }

  return NOWPAYMENTS_IPN_SECRET;
}

export function getNowpaymentsCheckoutUrl(
  payload: Record<string, unknown>,
): string {
  const url = payload.invoice_url;
  return typeof url === "string" ? url.trim() : "";
}

export function getNowpaymentsErrorMessage(error: unknown): string {
  return getErrorMessage(error);
}
