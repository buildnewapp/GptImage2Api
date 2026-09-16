import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { getErrorMessage } from '@/lib/error-utils';
import { isRecurringPaymentType } from '@/lib/payments/provider-utils';
import type { PublicPricingPlan } from '@/types/pricing';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export async function createPendingCheckoutOrder({
  provider,
  plan,
  user,
}: {
  provider: 'stripe' | 'creem' | 'subotiz' | 'paypal';
  plan: PublicPricingPlan;
  user: { id: string; email?: string | null };
}): Promise<string> {
  const id = randomUUID();
  const amount = Number(plan.price ?? 0);
  await getDb().insert(orders).values({
    id,
    userId: user.id,
    provider,
    providerOrderId: `checkout:${id}`,
    orderType: isRecurringPaymentType(plan.paymentType)
      ? 'subscription_initial'
      : 'one_time_purchase',
    status: 'pending',
    planId: plan.id,
    // Checkout amounts are estimates; the paid webhook supplies the final totals.
    amountSubtotal: Number.isFinite(amount) ? amount.toFixed(2) : '0.00',
    amountTotal: Number.isFinite(amount) ? amount.toFixed(2) : '0.00',
    currency: plan.currency || 'usd',
    metadata: {
      checkoutOrderId: id,
      planId: plan.id,
      planName: plan.cardTitle,
      userEmail: user.email ?? null,
    },
  });
  return id;
}

export async function markCheckoutOrderFailed(id: string, error: unknown) {
  await getDb().update(orders).set({
    status: 'failed',
    metadata: sql`coalesce(${orders.metadata}, '{}'::jsonb) || ${JSON.stringify({
      checkoutError: getErrorMessage(error),
    })}::jsonb`,
  }).where(and(
    eq(orders.id, id),
    eq(orders.providerOrderId, `checkout:${id}`),
    eq(orders.status, 'pending'),
  ));
}

export async function markCheckoutOrderStarted(id: string, sessionId: string, url: string | undefined) {
  if (!url) throw new Error('Checkout URL is missing');
  await getDb().update(orders).set({
    checkoutStartedAt: sql`coalesce(${orders.checkoutStartedAt}, now())`,
    metadata: sql`coalesce(${orders.metadata}, '{}'::jsonb) || ${JSON.stringify({ checkoutSessionId: sessionId })}::jsonb`,
  }).where(eq(orders.id, id));
}
