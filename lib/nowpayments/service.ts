import { randomUUID } from "node:crypto";

import { DEFAULT_LOCALE } from "@/i18n/routing";
import { getDb } from "@/lib/db";
import { orders as ordersSchema, pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import {
  extractNowpaymentsOrderNo,
  extractNowpaymentsPaymentId,
  getNowpaymentsClient,
  getNowpaymentsCheckoutUrl,
  getNowpaymentsErrorMessage,
  getNowpaymentsSessionId,
  mapNowpaymentsStatusToOrderStatus,
} from "@/lib/nowpayments";
import {
  upgradeOneTimeCredits,
  upgradeSubscriptionCredits,
} from "@/lib/payments/credit-manager";
import { grantConfiguredFirstOrderReward } from "@/lib/referrals/first-order";
import { getURL } from "@/lib/url";
import { and, eq, sql } from "drizzle-orm";

type JsonRecord = Record<string, unknown>;

type NowpaymentsMetadata = {
  invoiceId?: string;
  invoiceUrl?: string;
  lastError?: string;
  lastSyncedAt?: string;
  paymentData?: Record<string, unknown>;
  paymentId?: string;
  providerStatus?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  sessionId?: string;
};

type NowpaymentsOrderRow = typeof ordersSchema.$inferSelect;

export type SyncNowpaymentsOrderResult = {
  message: string;
  order: NowpaymentsOrderRow;
  paymentId: string;
  providerStatus: string;
  status: "pending" | "succeeded" | "failed";
};

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as JsonRecord) }
    : {};
}

function getNowpaymentsMetadata(metadata: unknown): NowpaymentsMetadata {
  const source = asObject(metadata).nowpayments;
  return asObject(source) as NowpaymentsMetadata;
}

function mergeOrderMetadata(
  metadata: unknown,
  nextNowpayments: Partial<NowpaymentsMetadata>,
): JsonRecord {
  const current = asObject(metadata);
  const currentNowpayments = getNowpaymentsMetadata(metadata);

  return {
    ...current,
    nowpayments: {
      ...currentNowpayments,
      ...nextNowpayments,
    },
  };
}

function normalizeLocale(locale: string | null | undefined) {
  return locale && locale.trim() ? locale : DEFAULT_LOCALE;
}

function buildNowpaymentsPageUrl(locale?: string, query?: URLSearchParams) {
  const normalizedLocale = normalizeLocale(locale);
  const path =
    normalizedLocale === DEFAULT_LOCALE
      ? "/payment/nowpayments"
      : `/${normalizedLocale}/payment/nowpayments`;

  return getURL(query?.toString() ? `${path}?${query.toString()}` : path);
}

function buildCallbackUrl(orderNo: string, locale?: string) {
  const params = new URLSearchParams({
    locale: normalizeLocale(locale),
    order_no: orderNo,
  });

  return getURL(`api/nowpayments/callback?${params.toString()}`);
}

function buildWebhookUrl() {
  return getURL("api/nowpayments/webhook");
}

function buildCancelUrl(locale?: string) {
  return buildNowpaymentsPageUrl(locale);
}

function normalizePriceAmount(price: unknown): number {
  const amount = typeof price === "number" ? price : Number(price ?? 0);
  return Number(amount.toFixed(2));
}

export function buildNowpaymentsOrderNo() {
  return `np_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export async function createNowpaymentsInvoiceOrder({
  locale,
  planId,
  user,
}: {
  locale?: string;
  planId: string;
  user: {
    email?: string | null;
    id: string;
  };
}) {
  const db = getDb();
  const client = getNowpaymentsClient();

  const [plan] = await db
    .select()
    .from(pricingPlansSchema)
    .where(eq(pricingPlansSchema.id, planId))
    .limit(1);

  if (!plan) {
    throw new Error("Plan not found.");
  }

  if ((plan.currency ?? "").toLowerCase() !== "usd") {
    throw new Error("NOWPayments only supports USD plans.");
  }

  const priceAmount = normalizePriceAmount(plan.price);
  if (!priceAmount || priceAmount <= 0) {
    throw new Error("NOWPayments plan price is invalid.");
  }

  const orderNo = buildNowpaymentsOrderNo();
  const callbackUrl = buildCallbackUrl(orderNo, locale);

  const invoicePayload = {
    cancel_url: buildCancelUrl(locale),
    ipn_callback_url: buildWebhookUrl(),
    is_fee_paid_by_user: false,
    order_description: `order_no:${orderNo};plan:${plan.cardTitle}`,
    order_id: orderNo,
    price_amount: priceAmount,
    price_currency: "usd",
    success_url: callbackUrl,
  };

  const initialMetadata = mergeOrderMetadata(
    {
      locale: normalizeLocale(locale),
      planId: plan.id,
      planName: plan.cardTitle,
      userEmail: user.email ?? null,
    },
    {
      request: invoicePayload,
    },
  );

  const [insertedOrder] = await db
    .insert(ordersSchema)
    .values({
      userId: user.id,
      provider: "nowpayments",
      providerOrderId: orderNo,
      orderType: "one_time_purchase",
      status: "pending",
      planId: plan.id,
      productId: plan.id,
      priceId: null,
      amountSubtotal: priceAmount.toFixed(2),
      amountDiscount: "0",
      amountTax: "0",
      amountTotal: priceAmount.toFixed(2),
      currency: "USD",
      metadata: initialMetadata,
    })
    .returning();

  try {
    const invoice = await client.createInvoice(invoicePayload);
    const checkoutUrl = getNowpaymentsCheckoutUrl(invoice);
    const sessionId = getNowpaymentsSessionId(invoice);

    if (!checkoutUrl) {
      throw new Error("NOWPayments invoice_url is empty.");
    }

    await db
      .update(ordersSchema)
      .set({
        metadata: mergeOrderMetadata(insertedOrder.metadata, {
          invoiceId:
            typeof invoice.id === "number" || typeof invoice.id === "string"
              ? String(invoice.id)
              : undefined,
          invoiceUrl: checkoutUrl,
          paymentId:
            typeof invoice.payment_id === "number" ||
            typeof invoice.payment_id === "string"
              ? String(invoice.payment_id)
              : undefined,
          response: invoice,
          sessionId,
        }),
      })
      .where(eq(ordersSchema.id, insertedOrder.id));

    return {
      orderNo,
      sessionId,
      url: checkoutUrl,
    };
  } catch (error) {
    await db
      .update(ordersSchema)
      .set({
        status: "failed",
        metadata: mergeOrderMetadata(insertedOrder.metadata, {
          lastError: getNowpaymentsErrorMessage(error),
        }),
      })
      .where(eq(ordersSchema.id, insertedOrder.id));

    throw error;
  }
}

async function findNowpaymentsOrder({
  orderNo,
  paymentId,
}: {
  orderNo?: string;
  paymentId?: string;
}) {
  const db = getDb();

  if (orderNo) {
    const [order] = await db
      .select()
      .from(ordersSchema)
      .where(
        and(
          eq(ordersSchema.provider, "nowpayments"),
          eq(ordersSchema.providerOrderId, orderNo),
        ),
      )
      .limit(1);

    if (order) {
      return order;
    }
  }

  if (!paymentId) {
    return null;
  }

  const [order] = await db
    .select()
    .from(ordersSchema)
    .where(
      and(
        eq(ordersSchema.provider, "nowpayments"),
        sql`(
          coalesce(${ordersSchema.metadata}->'nowpayments'->>'paymentId', '') = ${paymentId}
          or coalesce(${ordersSchema.metadata}->'nowpayments'->>'invoiceId', '') = ${paymentId}
          or coalesce(${ordersSchema.metadata}->'nowpayments'->>'sessionId', '') = ${paymentId}
        )`,
      ),
    )
    .limit(1);

  return order ?? null;
}

async function resolveNowpaymentsPayment(
  order: NowpaymentsOrderRow,
  paymentIdHint?: string,
): Promise<{
  payment: Record<string, unknown> | null;
  paymentId: string;
  providerStatus: string;
}> {
  const client = getNowpaymentsClient();
  const metadata = getNowpaymentsMetadata(order.metadata);

  const sessionCandidates = [
    paymentIdHint,
    metadata.paymentId,
    metadata.sessionId,
    metadata.invoiceId,
  ].filter((value): value is string => Boolean(value && value.trim()));

  let payment: Record<string, unknown> | null = null;
  let paymentId = paymentIdHint ?? metadata.paymentId ?? "";

  for (const sessionId of sessionCandidates) {
    payment =
      (await client.getPayment(sessionId).catch(() => null)) ??
      payment;
    if (payment) {
      paymentId = extractNowpaymentsPaymentId(payment) || sessionId;
      break;
    }

    const invoice = await client.getInvoice(sessionId).catch(() => null);
    if (!invoice) {
      continue;
    }

    paymentId = extractNowpaymentsPaymentId(invoice) || paymentId || sessionId;

    if (invoice.payment_id) {
      payment =
        (await client.getPayment(String(invoice.payment_id)).catch(() => null)) ??
        payment;
    }

    if (!payment && Array.isArray(invoice.payments) && invoice.payments.length > 0) {
      payment = asObject(invoice.payments[0]);
    }

    if (payment) {
      break;
    }
  }

  if (!payment) {
    const payments = await client
      .listPayments({
        orderId: order.providerOrderId,
      })
      .catch(() => []);

    const matched = payments.find((item) => {
      const itemOrderNo = extractNowpaymentsOrderNo(asObject(item));
      return itemOrderNo === order.providerOrderId;
    });

    if (matched) {
      payment = asObject(matched);
      paymentId = extractNowpaymentsPaymentId(payment);
    }
  }

  return {
    payment,
    paymentId,
    providerStatus:
      typeof payment?.payment_status === "string"
        ? payment.payment_status
        : "",
  };
}

async function setNowpaymentsOrderStatus(params: {
  metadataPatch: Partial<NowpaymentsMetadata>;
  orderId: string;
  status?: string;
}) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(ordersSchema)
    .where(eq(ordersSchema.id, params.orderId))
    .limit(1);

  if (!order) {
    return null;
  }

  const updateData: Partial<typeof ordersSchema.$inferInsert> = {
    metadata: mergeOrderMetadata(order.metadata, params.metadataPatch),
  };

  if (params.status) {
    updateData.status = params.status;
  }

  const [updated] = await db
    .update(ordersSchema)
    .set(updateData)
    .where(eq(ordersSchema.id, params.orderId))
    .returning();

  return updated ?? null;
}

async function markOrderProcessing(orderId: string, metadataPatch: Partial<NowpaymentsMetadata>) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersSchema)
      .where(eq(ordersSchema.id, orderId))
      .limit(1)
      .for("update");

    if (!order) {
      return null;
    }

    if (order.status === "succeeded" || order.status === "processing") {
      return order;
    }

    const [updated] = await tx
      .update(ordersSchema)
      .set({
        status: "processing",
        metadata: mergeOrderMetadata(order.metadata, metadataPatch),
      })
      .where(eq(ordersSchema.id, orderId))
      .returning();

    return updated ?? null;
  });
}

async function grantNowpaymentsBenefits(order: NowpaymentsOrderRow) {
  if (!order.planId) {
    throw new Error("NOWPayments order planId is missing.");
  }

  const db = getDb();
  const [plan] = await db
    .select({
      paymentType: pricingPlansSchema.paymentType,
    })
    .from(pricingPlansSchema)
    .where(eq(pricingPlansSchema.id, order.planId))
    .limit(1);

  if (plan?.paymentType === "recurring") {
    await upgradeSubscriptionCredits(
      order.userId,
      order.planId,
      order.id,
      Date.now(),
    );
  } else {
    await upgradeOneTimeCredits(order.userId, order.planId, order.id);
  }

  try {
    await grantConfiguredFirstOrderReward({
      inviteeUserId: order.userId,
      orderAmountUsd: Number(order.amountTotal ?? 0),
      sourceOrderId: order.id,
    });
  } catch (error) {
    console.error(
      `[NOWPayments] Failed to grant first-order reward for order ${order.id}`,
      error,
    );
  }
}

export async function syncNowpaymentsOrder(params: {
  orderNo?: string;
  paymentIdHint?: string;
  userId?: string;
}) : Promise<SyncNowpaymentsOrderResult | null> {
  const order = await findNowpaymentsOrder({
    orderNo: params.orderNo,
    paymentId: params.paymentIdHint,
  });

  if (!order) {
    return null;
  }

  if (params.userId && order.userId !== params.userId) {
    return null;
  }

  if (order.status === "succeeded") {
    const metadata = getNowpaymentsMetadata(order.metadata);
    return {
      message: "Payment confirmed.",
      order,
      paymentId: metadata.paymentId ?? "",
      providerStatus: metadata.providerStatus ?? "finished",
      status: "succeeded",
    };
  }

  if (order.status === "processing") {
    const metadata = getNowpaymentsMetadata(order.metadata);
    return {
      message: "Payment is still processing. Please check again shortly.",
      order,
      paymentId: metadata.paymentId ?? "",
      providerStatus: metadata.providerStatus ?? "processing",
      status: "pending",
    };
  }

  const { payment, paymentId, providerStatus } = await resolveNowpaymentsPayment(
    order,
    params.paymentIdHint,
  );

  const normalizedStatus = mapNowpaymentsStatusToOrderStatus(providerStatus);
  const metadataPatch: Partial<NowpaymentsMetadata> = {
    lastSyncedAt: new Date().toISOString(),
    paymentData: payment ?? undefined,
    paymentId: paymentId || undefined,
    providerStatus: providerStatus || undefined,
    sessionId: paymentId || undefined,
  };

  if (normalizedStatus === "failed") {
    const updated = await setNowpaymentsOrderStatus({
      metadataPatch,
      orderId: order.id,
      status: "failed",
    });

    return {
      message: "Payment failed or expired.",
      order: updated ?? order,
      paymentId,
      providerStatus,
      status: "failed",
    };
  }

  if (normalizedStatus === "pending") {
    const updated = await setNowpaymentsOrderStatus({
      metadataPatch,
      orderId: order.id,
    });

    return {
      message:
        "Payment detected, but final confirmation is still pending. Please check again shortly.",
      order: updated ?? order,
      paymentId,
      providerStatus,
      status: "pending",
    };
  }

  const processingOrder = await markOrderProcessing(order.id, metadataPatch);
  if (!processingOrder) {
    return null;
  }

  if (processingOrder.status === "succeeded") {
    return {
      message: "Payment confirmed.",
      order: processingOrder,
      paymentId,
      providerStatus,
      status: "succeeded",
    };
  }

  if (processingOrder.status === "processing" && order.status === "processing") {
    return {
      message: "Payment is still processing. Please check again shortly.",
      order: processingOrder,
      paymentId,
      providerStatus,
      status: "pending",
    };
  }

  try {
    await grantNowpaymentsBenefits(processingOrder);

    const updated = await setNowpaymentsOrderStatus({
      metadataPatch,
      orderId: processingOrder.id,
      status: "succeeded",
    });

    return {
      message: "Payment confirmed.",
      order: updated ?? processingOrder,
      paymentId,
      providerStatus,
      status: "succeeded",
    };
  } catch (error) {
    await setNowpaymentsOrderStatus({
      metadataPatch: {
        ...metadataPatch,
        lastError: getNowpaymentsErrorMessage(error),
      },
      orderId: processingOrder.id,
      status: "pending",
    });

    throw error;
  }
}

export function extractNowpaymentsCallbackPaymentId(searchParams: URLSearchParams) {
  return (
    searchParams.get("payment_id") ||
    searchParams.get("NP_id") ||
    searchParams.get("iid") ||
    ""
  );
}

export function extractNowpaymentsPayloadIdentity(payload: Record<string, unknown>) {
  return {
    orderNo: extractNowpaymentsOrderNo(payload),
    paymentId: extractNowpaymentsPaymentId(payload),
  };
}

export function buildNowpaymentsRedirectUrl({
  locale,
  orderNo,
  paymentId,
}: {
  locale?: string;
  orderNo: string;
  paymentId?: string;
}) {
  const query = new URLSearchParams();

  if (orderNo) {
    query.set("order_no", orderNo);
  }

  if (paymentId) {
    query.set("payment_id", paymentId);
  }

  return buildNowpaymentsPageUrl(locale, query);
}
