import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, gte, isNull, like, or, sql } from "drizzle-orm";
import { siteConfig } from "@/config/site";
import common from "@/i18n/messages/en/common.json";
import { getDb } from "@/lib/db";
import {
  cacheDb,
  emailLogs,
  orders,
  subscriptions,
  user,
} from "@/lib/db/schema";
import { FounderRecallEmail, getRecallSubject } from "@/emails/founder-recall";
import { getConfiguredEmailProvider } from "@/lib/email/providers";
import { sendEmail } from "@/lib/email/send";
import { readRecallAttachment } from "./attachment";
import {
  getFounderIdentity,
  getRecallPurchaseBonusConfig,
  getRecallIdempotencyKey,
  getRecallStep,
  type RecallState,
} from "./rules";

const NAMESPACE = "email_recall";
const SETTINGS_KEY = "runner";
const PURCHASE_TYPES = [
  "one_time_purchase",
  "subscription_initial",
  "subscription_renewal",
  "recurring",
];
const PURCHASE_STATUSES = [
  "succeeded",
  "active",
  "refunded",
  "partially_refunded",
];

type RunnerState = {
  startedAt: string;
  leaseOwner: string | null;
  leaseUntil: string | null;
};

async function getUserRecallState(userId: string, startedAt: Date) {
  const db = getDb();
  const [[recipient], userOrders, userSubscriptions] = await Promise.all([
    db.select().from(user).where(eq(user.id, userId)).limit(1),
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(asc(orders.createdAt)),
    db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId)),
  ]);
  if (!recipient) return null;
  const purchases = userOrders.filter((order) =>
    PURCHASE_TYPES.includes(order.orderType),
  );
  const firstPaid = purchases
    .filter(
      (order) =>
        PURCHASE_STATUSES.includes(order.status) &&
        Number(order.amountTotal) > 0,
    )
    .sort(
      (a, b) =>
        (a.paidAt ?? a.createdAt).getTime() -
        (b.paidAt ?? b.createdAt).getTime(),
    )[0];
  const checkouts = purchases.filter((order) => order.checkoutStartedAt);
  const currentCheckouts = checkouts.filter(
    (order) => order.checkoutStartedAt! >= startedAt,
  );
  const checkout =
    [...currentCheckouts].sort(
      (a, b) => a.checkoutStartedAt!.getTime() - b.checkoutStartedAt!.getTime(),
    )[0] ?? checkouts[0];
  const pending = [...currentCheckouts]
    .reverse()
    .find((order) => order.status === "pending");
  const state: RecallState = {
    registeredAt: recipient.recallRegisteredAt,
    checkoutAt: checkout?.checkoutStartedAt ?? null,
    paidAt: firstPaid?.paidAt ?? null,
    hasPurchased: Boolean(firstPaid),
    paymentRefunded: Boolean(
      firstPaid && firstPaid.status.includes("refunded"),
    ),
    hasSubscription: userSubscriptions.some((item) =>
      ["active", "trialing", "past_due", "unpaid"].includes(item.status),
    ),
    paymentProcessing: purchases.some((order) => order.status === "processing"),
    hasPendingCheckout: Boolean(pending),
    paused: recipient.recallPaused,
    eligible:
      recipient.emailVerified && !recipient.isAnonymous && !recipient.banned,
  };
  return {
    recipient,
    state,
    planName: (pending?.metadata as { planName?: string } | null)?.planName,
  };
}

export async function runRecallEmails({ dryRun = false } = {}) {
  const result = {
    enabled: process.env.RECALL_ENABLED === "true",
    dryRun,
    busy: false,
    startedAt: "",
    scanned: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    candidates: [] as Array<{ userId: string; step: string }>,
  };
  if (!result.enabled || !getConfiguredEmailProvider()) return result;
  const founder = getFounderIdentity(siteConfig.url);
  const defaultBonus = getRecallPurchaseBonusConfig();
  const db = getDb();
  const now = new Date();
  const whereSettings = and(
    eq(cacheDb.namespace, NAMESPACE),
    eq(cacheDb.cacheKey, SETTINGS_KEY),
  );
  // Persist the first activation boundary; restarts and repeated cron calls never backfill old events.
  if (!dryRun) {
    await db
      .insert(cacheDb)
      .values({
        namespace: NAMESPACE,
        cacheKey: SETTINGS_KEY,
        valueJsonb: {
          startedAt: now.toISOString(),
          leaseOwner: null,
          leaseUntil: null,
        },
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      })
      .onConflictDoNothing({ target: [cacheDb.namespace, cacheDb.cacheKey] });
  }
  const [settings] = await db
    .select()
    .from(cacheDb)
    .where(whereSettings)
    .limit(1);
  const saved = settings?.valueJsonb as RunnerState | undefined;
  const startedAt = new Date(saved?.startedAt ?? now.toISOString());
  if (!Number.isFinite(startedAt.getTime()))
    throw new Error("Invalid recall activation time");
  result.startedAt = startedAt.toISOString();
  const leaseOwner = randomUUID();
  if (!dryRun) {
    const [claimed] = await db
      .update(cacheDb)
      .set({
        valueJsonb: {
          startedAt: result.startedAt,
          leaseOwner,
          leaseUntil: new Date(now.getTime() + 120_000).toISOString(),
        },
      })
      .where(
        and(
          whereSettings,
          sql`coalesce((${cacheDb.valueJsonb}->>'leaseUntil')::timestamptz, '-infinity'::timestamptz) < now()`,
        ),
      )
      .returning({ id: cacheDb.id });
    if (!claimed) return { ...result, busy: true };
  }
  try {
    const attachments = await readRecallAttachment();
    const pricingUrl = new URL(
      process.env.NEXT_PUBLIC_PRICING_PATH || "/pricing",
      siteConfig.url,
    ).href;
    let cursor: string | undefined;
    // Bounded request duration; the database lease covers the final provider request as well.
    while (
      Date.now() - now.getTime() < 45_000 &&
      result.sent + result.failed < 50
    ) {
      const recipients = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.emailVerified, true),
            eq(user.isAnonymous, false),
            eq(user.recallPaused, false),
            or(isNull(user.banned), eq(user.banned, false)),
            cursor ? gt(user.id, cursor) : undefined,
            or(
              gte(user.recallRegisteredAt, startedAt),
              sql`exists (
          select 1 from ${orders} where ${orders.userId} = ${user.id}
          and (${orders.checkoutStartedAt} >= ${startedAt.toISOString()}::timestamptz or ${orders.paidAt} >= ${startedAt.toISOString()}::timestamptz)
        )`,
            ),
          ),
        )
        .orderBy(asc(user.id))
        .limit(100);
      if (!recipients.length) break;
      for (const row of recipients) {
        cursor = row.id;
        if (
          Date.now() - now.getTime() >= 45_000 ||
          result.sent + result.failed >= 50
        )
          break;
        result.scanned++;
        const current = await getUserRecallState(row.id, startedAt);
        if (!current) continue;
        const step = getRecallStep(current.state, new Date(), startedAt);
        if (!step) continue;
        const history = await db
          .select()
          .from(emailLogs)
          .where(like(emailLogs.idempotencyKey, `recall:${row.id}:%`));
        const idempotencyKey = getRecallIdempotencyKey(row.id, step);
        if (history.some((log) => log.idempotencyKey === idempotencyKey))
          continue;
        // Avoid crowding messages when a previous cron ran late or a signup just became a checkout.
        if (
          step !== "paid-help" &&
          history.some(
            (log) => log.createdAt.getTime() > Date.now() - 4 * 60 * 60 * 1000,
          )
        )
          continue;
        const previousBonus = history.find(
          (log) =>
            log.templateKey.endsWith("-bonus") && log.status !== "failed",
        )?.variables;
        const previousPercent = Number(previousBonus?.bonusPercent);
        const previousValidHours = Number(previousBonus?.bonusValidHours);
        const bonusPercent =
          Number.isInteger(previousPercent) &&
          previousPercent > 0 &&
          previousPercent <= 100
            ? previousPercent
            : defaultBonus.percent;
        const bonusValidHours =
          Number.isInteger(previousValidHours) &&
          previousValidHours > 0 &&
          previousValidHours <= 24 * 30
            ? previousValidHours
            : defaultBonus.validHours;
        result.candidates.push({ userId: row.id, step });
        if (dryRun) continue;
        // Re-read after rendering inputs/history lookup so purchases and manual pauses win.
        const fresh = await getUserRecallState(row.id, startedAt);
        if (
          !fresh ||
          getRecallStep(fresh.state, new Date(), startedAt) !== step
        ) {
          result.skipped++;
          continue;
        }
        try {
          const sendResult = await sendEmail({
            email: fresh.recipient.email,
            fromName: `${founder.name} | ${siteConfig.name}`,
            fromEmail: founder.email,
            replyTo: founder.email,
            subject: getRecallSubject(step, siteConfig.name, bonusPercent),
            templateKey: `recall-${step}`,
            idempotencyKey,
            react: FounderRecallEmail,
            attachments,
            reactProps: {
              step,
              name: fresh.recipient.name,
              founderName: founder.name,
              founderEmail: founder.email,
              productName: siteConfig.name,
              productDescription: common.Home.description,
              siteUrl: siteConfig.url,
              pricingUrl,
              planName: fresh.planName,
              bonusPercent,
              bonusValidHours,
              hasAttachment: Boolean(attachments?.length),
            },
          });
          if (sendResult.status === "sent") result.sent++;
          else result.skipped++;
        } catch (error) {
          result.failed++;
          console.error(
            `Recall email failed for user ${row.id}, step ${step}:`,
            error,
          );
        }
      }
      if (recipients.length < 100) break;
    }
    return result;
  } finally {
    if (!dryRun) {
      await db
        .update(cacheDb)
        .set({
          valueJsonb: {
            startedAt: result.startedAt,
            leaseOwner: null,
            leaseUntil: null,
          },
        })
        .where(
          and(
            whereSettings,
            sql`${cacheDb.valueJsonb}->>'leaseOwner' = ${leaseOwner}`,
          ),
        );
    }
  }
}
