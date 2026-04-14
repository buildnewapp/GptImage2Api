import { getErrorMessage } from "@/lib/error-utils";
import { buildPayPalWebhookVerificationPayload } from "@/lib/paypal";
import type {
  PayPalBillingPlan,
  PayPalOrder,
  PayPalProduct,
  PayPalSubscription,
} from "@/lib/paypal/types";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
const PAYPAL_API_BASE_URL =
  PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const isPayPalEnabled = Boolean(
  PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET,
);

type PayPalRequestInit = Omit<RequestInit, "body" | "headers"> & {
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
};

export class PayPalClient {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error(
        "PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      );
    }

    const basicAuth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const message = await this.readErrorMessage(response);
      throw new Error(`Failed to get PayPal access token: ${message}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt =
      Date.now() + Math.max((payload.expires_in ?? 300) - 60, 60) * 1000;

    return payload.access_token;
  }

  async createOrder(payload: Record<string, unknown>): Promise<PayPalOrder> {
    return this.request<PayPalOrder>("/v2/checkout/orders", {
      body: payload,
      method: "POST",
    });
  }

  async captureOrder(orderId: string): Promise<PayPalOrder> {
    return this.request<PayPalOrder>(
      `/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
      },
    );
  }

  async getOrder(orderId: string): Promise<PayPalOrder> {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${orderId}`, {
      method: "GET",
    });
  }

  async createSubscription(
    payload: Record<string, unknown>,
  ): Promise<PayPalSubscription> {
    return this.request<PayPalSubscription>("/v1/billing/subscriptions", {
      body: payload,
      method: "POST",
    });
  }

  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    return this.request<PayPalSubscription>(
      `/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: "GET",
      },
    );
  }

  async createProduct(
    payload: Record<string, unknown>,
    requestId?: string,
  ): Promise<PayPalProduct> {
    return this.request<PayPalProduct>("/v1/catalogs/products", {
      body: payload,
      headers: requestId
        ? {
            "PayPal-Request-Id": requestId,
          }
        : undefined,
      method: "POST",
    });
  }

  async createBillingPlan(
    payload: Record<string, unknown>,
    requestId?: string,
  ): Promise<PayPalBillingPlan> {
    return this.request<PayPalBillingPlan>("/v1/billing/plans", {
      body: payload,
      headers: requestId
        ? {
            "PayPal-Request-Id": requestId,
          }
        : undefined,
      method: "POST",
    });
  }

  async getBillingPlan(planId: string): Promise<PayPalBillingPlan> {
    return this.request<PayPalBillingPlan>(`/v1/billing/plans/${planId}`, {
      method: "GET",
    });
  }

  async verifyWebhookSignature({
    body,
    headers,
    webhookId,
  }: {
    body: unknown;
    headers: Headers;
    webhookId: string;
  }): Promise<boolean> {
    const payload = buildPayPalWebhookVerificationPayload({
      body,
      headers,
      webhookId,
    });

    const response = await this.request<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        body: payload,
        method: "POST",
      },
    );

    return response.verification_status === "SUCCESS";
  }

  private async request<T>(
    path: string,
    init: PayPalRequestInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    };

    if (!init.skipAuth) {
      headers.Authorization = `Bearer ${await this.getAccessToken()}`;
    }

    const response = await fetch(`${PAYPAL_API_BASE_URL}${path}`, {
      ...init,
      body:
        init.body === undefined
          ? undefined
          : typeof init.body === "string"
            ? init.body
            : JSON.stringify(init.body),
      headers,
    });

    if (!response.ok) {
      const message = await this.readErrorMessage(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = await response.clone().json();
      const detail = Array.isArray(payload?.details)
        ? payload.details
            .map((item: { description?: string }) => item.description)
            .filter(Boolean)
            .join(", ")
        : "";

      return (
        payload?.message ||
        detail ||
        payload?.error_description ||
        `PayPal API responded with status ${response.status}`
      );
    } catch (error) {
      const text = await response.text().catch(() => "");
      return text || getErrorMessage(error);
    }
  }
}
