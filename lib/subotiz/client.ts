import { randomUUID } from "node:crypto";
import { getErrorMessage } from "@/lib/error-utils";
import type {
  SubotizApiResponse,
  SubotizCheckoutSession,
  SubotizCheckoutSessionCreateParams,
  SubotizCheckoutSessionDetails,
  SubotizSubscription,
} from "./types";

const SUBOTIZ_API_BASE_URL = (
  process.env.SUBOTIZ_API_BASE_URL ?? "https://api.subotiz.com"
).replace(/\/+$/, "");

const SUBOTIZ_API_KEY = process.env.SUBOTIZ_API_KEY;
const SUBOTIZ_ACCESS_NO = process.env.SUBOTIZ_ACCESS_NO;
const SUBOTIZ_MERCHANT_ID = process.env.SUBOTIZ_MERCHANT_ID;

export const isSubotizEnabled = Boolean(
  SUBOTIZ_API_KEY && SUBOTIZ_ACCESS_NO && SUBOTIZ_MERCHANT_ID,
);

type SubotizRequestInit = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

async function subotizRequest<T>(
  path: string,
  init: SubotizRequestInit = {},
): Promise<SubotizApiResponse<T>> {
  if (!SUBOTIZ_API_KEY) {
    throw new Error(
      "Subotiz API key is not configured. Set SUBOTIZ_API_KEY to enable Subotiz integration.",
    );
  }

  const response = await fetch(`${SUBOTIZ_API_BASE_URL}${path}`, {
    ...init,
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === "string"
          ? init.body
          : JSON.stringify(init.body),
    headers: {
      Authorization: `Bearer ${SUBOTIZ_API_KEY}`,
      "Content-Type": "application/json",
      "Request-Id": randomUUID(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `Subotiz API responded with status ${response.status}`;
    try {
      const errorBody = (await response.clone().json()) as {
        code?: string;
        message?: string;
      };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  return (await response.json()) as SubotizApiResponse<T>;
}

export async function createSubotizCheckoutSession(
  params: SubotizCheckoutSessionCreateParams,
): Promise<SubotizCheckoutSession> {
  if (!SUBOTIZ_ACCESS_NO || !SUBOTIZ_MERCHANT_ID) {
    throw new Error(
      "Subotiz merchant credentials are not configured. Set SUBOTIZ_ACCESS_NO and SUBOTIZ_MERCHANT_ID.",
    );
  }

  try {
    const response = await subotizRequest<SubotizCheckoutSession>(
      "/api/v1/session",
      {
        method: "POST",
        body: {
          access_no: SUBOTIZ_ACCESS_NO,
          sub_merchant_id: SUBOTIZ_MERCHANT_ID,
          ...params,
        },
      },
    );

    if (!response.data?.session_id || !response.data.session_url) {
      throw new Error("Subotiz did not return a checkout session URL.");
    }

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to create Subotiz checkout session: ${getErrorMessage(error)}`,
    );
  }
}

export async function getSubotizCheckoutSession(
  sessionId: string,
): Promise<SubotizCheckoutSessionDetails> {
  const response = await subotizRequest<SubotizCheckoutSessionDetails>(
    `/api/v1/session/${encodeURIComponent(sessionId)}`,
  );

  if (!response.data?.id) {
    throw new Error(`Subotiz checkout session ${sessionId} was not found.`);
  }

  return response.data;
}

export async function getSubotizSubscription(
  subscriptionId: string,
): Promise<SubotizSubscription> {
  const response = await subotizRequest<SubotizSubscription>(
    `/api/v1/subscription/${encodeURIComponent(subscriptionId)}`,
  );

  if (!response.data?.id) {
    throw new Error(`Subotiz subscription ${subscriptionId} was not found.`);
  }

  return response.data;
}

export async function createSubotizCustomerPortalLink(
  customerId: string,
  locale?: string,
): Promise<string> {
  try {
    const response = await subotizRequest<{
      customer_portal_link: string;
    }>("/api/v1/customer_portal/auth", {
      method: "POST",
      body: {
        customer_id: customerId,
        locale,
      },
    });

    if (!response.data?.customer_portal_link) {
      throw new Error("Subotiz did not return a customer portal URL.");
    }

    return response.data.customer_portal_link;
  } catch (error) {
    throw new Error(
      `Failed to create Subotiz customer portal link: ${getErrorMessage(error)}`,
    );
  }
}
