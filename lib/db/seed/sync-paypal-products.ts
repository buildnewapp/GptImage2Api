/**
 * PayPal Product Sync Script
 * PayPal 产品同步脚本
 *
 * Creates PayPal products and billing plans for recurring PayPal plans, then
 * writes paypalProductId / paypalPlanId back to pricing-config.ts.
 *
 * Usage:
 *   pnpm db:sync-paypal-products -- --dry-run
 *   pnpm db:sync-paypal-products
 *   pnpm db:sync-paypal-products -- --force
 */

import { loadEnvConfig } from '@next/env'
import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PayPalClient, isPayPalEnabled } from '@/lib/paypal/client'
import { applyPricingConfigFieldUpdates } from './creem-product-sync'
import { pricingPlans } from './pricing-config'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pricingConfigPath = path.join(__dirname, 'pricing-config.ts')

function normalizePayPalEnvironment(rawValue: string | null | undefined) {
  const normalized = (rawValue ?? 'test').toLowerCase().trim()

  if (normalized === 'test') {
    return {
      apiEnvironment: 'sandbox' as const,
      pricingEnvironment: 'test' as const,
    }
  }

  if (normalized === 'live') {
    return {
      apiEnvironment: 'production' as const,
      pricingEnvironment: 'live' as const,
    }
  }

  throw new Error(
    `PAY_ENV must be "test" or "live", received: ${rawValue ?? 'undefined'}`
  )
}

function hasUsableValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function getExistingPayPalPlanId(plan: (typeof pricingPlans)[number]) {
  if (hasUsableValue(plan.paypalPlanId)) {
    return plan.paypalPlanId!.trim()
  }

  if (hasUsableValue(plan.paypalProductId) && plan.paypalProductId!.trim().startsWith('P-')) {
    return plan.paypalProductId!.trim()
  }

  return null
}

function getExistingPayPalProductId(plan: (typeof pricingPlans)[number]) {
  if (hasUsableValue(plan.paypalProductId) && plan.paypalProductId!.trim().startsWith('PROD-')) {
    return plan.paypalProductId!.trim()
  }

  return null
}

function isPayPalRecurringPlan(plan: (typeof pricingPlans)[number]) {
  return (
    plan.provider === 'paypal' &&
    plan.paymentType === 'recurring' &&
    (plan.recurringInterval === 'month' || plan.recurringInterval === 'year')
  )
}

function buildPayPalProductPayload(plan: (typeof pricingPlans)[number]) {
  return {
    description: (plan.cardDescription ?? plan.cardTitle).trim(),
    name: plan.cardTitle.trim(),
    type: 'SERVICE',
  }
}

function buildPayPalPlanPayload(
  plan: (typeof pricingPlans)[number],
  productId: string
) {
  if (!plan.id) {
    throw new Error('Plan id is required for PayPal sync.')
  }

  const intervalUnit = plan.recurringInterval === 'year' ? 'YEAR' : 'MONTH'
  const normalizedPrice = String(plan.price ?? '').trim()

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedPrice)) {
    throw new Error(`Invalid price for PayPal plan ${plan.id}: ${plan.price}`)
  }

  return {
    billing_cycles: [
      {
        frequency: {
          interval_count: 1,
          interval_unit: intervalUnit,
        },
        pricing_scheme: {
          fixed_price: {
            currency_code: (plan.currency ?? 'USD').trim().toUpperCase(),
            value: normalizedPrice,
          },
        },
        sequence: 1,
        tenure_type: 'REGULAR',
        total_cycles: 0,
      },
    ],
    description: (plan.cardDescription ?? plan.cardTitle).trim(),
    name: `${plan.cardTitle.trim()} ${plan.recurringInterval === 'year' ? 'Yearly' : 'Monthly'}`,
    payment_preferences: {
      auto_bill_outstanding: true,
      payment_failure_threshold: 1,
    },
    product_id: productId,
    status: 'ACTIVE',
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const environment = normalizePayPalEnvironment(process.env.PAY_ENV)

  if (!dryRun && !isPayPalEnabled) {
    throw new Error(
      'PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.'
    )
  }

  const targetPlans = pricingPlans.filter(
    plan => isPayPalRecurringPlan(plan) && plan.environment === environment.pricingEnvironment
  )

  if (targetPlans.length === 0) {
    console.log(`No PayPal recurring plans found for PAY_ENV=${environment.pricingEnvironment}.`)
    return
  }

  console.log(`[sync] config: .env`)
  console.log(`[sync] PAY_ENV=${environment.pricingEnvironment}`)
  console.log(`[sync] PAYPAL_CLIENT_ID=${process.env.PAYPAL_CLIENT_ID}`)
  console.log(`[sync] Found ${targetPlans.length} PayPal recurring plan(s) in pricing-config.ts`)
  if (dryRun) {
    console.log('[dry-run] No API writes and no file changes.')
  }

  const client = new PayPalClient()
  let pricingConfigSource = dryRun ? '' : fs.readFileSync(pricingConfigPath, 'utf8')

  for (const plan of targetPlans) {
    if (!plan.id) {
      throw new Error(`Missing id for plan "${plan.cardTitle}"`)
    }

    const existingPlanId = getExistingPayPalPlanId(plan)
    const existingProductId = getExistingPayPalProductId(plan)

    if (!force && existingPlanId) {
      if (dryRun) {
        console.log(
          `- [DRY-RUN] Skip ${plan.cardTitle} (${plan.id}): paypalPlanId already exists (${existingPlanId})`
        )
        continue
      }

      if (!existingProductId) {
        const remotePlan = await client.getBillingPlan(existingPlanId)
        if (remotePlan.product_id) {
          pricingConfigSource = applyPricingConfigFieldUpdates(pricingConfigSource, [
            {
              planId: plan.id,
              fields: {
                paypalPlanId: existingPlanId,
                paypalProductId: remotePlan.product_id,
              },
            },
          ])
          fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')
          console.log(
            `[ok] Backfilled ${plan.cardTitle} (${plan.id}) -> product ${remotePlan.product_id}, plan ${existingPlanId}`
          )
          continue
        }
      }

      console.log(
        `- Skip ${plan.cardTitle} (${plan.id}): paypalPlanId already exists (${existingPlanId})`
      )
      continue
    }

    if (dryRun) {
      console.log(
        `- [DRY-RUN] ${plan.cardTitle} (${plan.id}) -> ${plan.recurringInterval}, ${plan.price} ${(plan.currency ?? 'USD').toUpperCase()}`
      )
      continue
    }

    let paypalProductId = existingProductId
    if (!paypalProductId || force) {
      const product = await client.createProduct(
        buildPayPalProductPayload(plan),
        `pricing-product-${environment.apiEnvironment}-${plan.id}`
      )
      paypalProductId = product.id
    }

    const billingPlan = await client.createBillingPlan(
      buildPayPalPlanPayload(plan, paypalProductId),
      `pricing-plan-${environment.apiEnvironment}-${plan.id}`
    )

    pricingConfigSource = applyPricingConfigFieldUpdates(pricingConfigSource, [
      {
        planId: plan.id,
        fields: {
          paypalPlanId: billingPlan.id,
          paypalProductId,
        },
      },
    ])
    fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')

    console.log(
      `[ok] Created ${plan.cardTitle} (${plan.id}) -> product ${paypalProductId}, plan ${billingPlan.id} (persisted)`
    )
  }

  if (dryRun) {
    console.log(`\nDry-run completed for ${targetPlans.length} PayPal plan(s).`)
    return
  }

  console.log(`\n[file] ${pricingConfigPath}`)
  console.log(`\n[next] file to db: pnpm db:seed`)
}

main().catch(error => {
  console.error('\n[error] Failed to sync PayPal products:', error)
  process.exit(1)
})
