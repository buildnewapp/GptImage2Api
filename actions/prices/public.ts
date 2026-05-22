'use server';

import { actionResponse, ActionResult } from '@/lib/action-response';
import { getDb, isDatabaseEnabled } from '@/lib/db';
import { pricingPlans as pricingPlansSchema } from '@/lib/db/schema';
import { getErrorMessage } from '@/lib/error-utils';
import { and, asc, eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import 'server-only';

type PricingPlan = typeof pricingPlansSchema.$inferSelect
type PricingEnvironment = 'live' | 'test'

const PUBLIC_PRICING_REVALIDATE_SECONDS = 300;

const fetchPublicPricingPlans = async (
  environment: PricingEnvironment,
): Promise<PricingPlan[]> => {
  const db = getDb();

  const plans = await db
    .select()
    .from(pricingPlansSchema)
    .where(
      and(
        eq(pricingPlansSchema.environment, environment),
        eq(pricingPlansSchema.isActive, true)
      )
    )
    .orderBy(asc(pricingPlansSchema.displayOrder))

  return (plans as unknown as PricingPlan[]) || []
}

const getCachedPublicPricingPlans = unstable_cache(
  fetchPublicPricingPlans,
  ['public-pricing-plans'],
  {
    revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
    tags: ['public-pricing-plans'],
  },
)

/**
 * Public List - Returns all active pricing plans for the current environment
 * Filtering by groupSlug is handled on the frontend for better flexibility and caching
 */
export async function getPublicPricingPlans(): Promise<ActionResult<PricingPlan[]>> {
  if (!isDatabaseEnabled) {
    return actionResponse.success([])
  }

  const environment = process.env.PAY_ENV === 'live' ? 'live' : 'test'

  try {
    const plans = await getCachedPublicPricingPlans(environment)

    return actionResponse.success(plans)
  } catch (error) {
    console.error('Unexpected error in getPublicPricingPlans:', error)
    return actionResponse.error(getErrorMessage(error))
  }
}
