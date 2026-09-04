'use server';

import { actionResponse, type ActionResult } from '@/lib/action-response';
import { configuredPricingPlans, isActivePricingPlan } from '@/lib/pricing';
import { getErrorMessage } from '@/lib/error-utils';
import type { PublicPricingPlan } from '@/types/pricing';
import 'server-only';

/**
 * Read active plans and their translations directly from the pricing config.
 * Group filtering is handled by the frontend.
 */
export async function getPublicPricingPlans(): Promise<ActionResult<PublicPricingPlan[]>> {
  try {
    const plans = configuredPricingPlans
      .filter(isActivePricingPlan)
      .sort((left, right) => left.displayOrder - right.displayOrder)

    return actionResponse.success(plans)
  } catch (error) {
    console.error('Unexpected error in getPublicPricingPlans:', error)
    return actionResponse.error(getErrorMessage(error))
  }
}
