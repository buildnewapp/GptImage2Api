/**
 * Stripe Product Sync Script
 * Stripe 产品与价格同步脚本
 *
 * Creates Stripe products and prices for the selected environment, then
 * writes stripeProductId / stripePriceId back to pricing-config.ts.
 *
 * Usage:
 *   pnpm db:sync-stripe-products -- env=test --dry-run
 *   pnpm db:sync-stripe-products -- env=test
 *   pnpm db:sync-stripe-products -- env=live --force
 */

import { siteConfig } from '@/config/site'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import {
  applyPricingConfigFieldUpdates,
  loadProductSyncEnvironmentFile,
  parseProductSyncEnvironmentArgument,
  type ProductSyncEnvironment,
} from './creem-product-sync'
import { pricingPlans } from './pricing-config'

const projectDir = process.cwd()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pricingConfigPath = path.join(__dirname, 'pricing-config.ts')
const defaultStripeProductTaxCode = 'txcd_10103000'

type PricingPlan = (typeof pricingPlans)[number]

interface StripeBilling {
  paymentType: 'one_time' | 'recurring'
  recurringInterval?: 'month' | 'year'
}

function hasUsableStripeId(
  value: string | null | undefined,
  prefix: 'prod_' | 'price_'
) {
  return typeof value === 'string' && value.trim().startsWith(prefix)
}

function isStripePlanProvider(value: unknown) {
  if (typeof value !== 'string') {
    return false
  }

  const provider = value.toLowerCase()
  return provider === 'stripe' || provider === 'all'
}

function deriveStripeBilling(plan: PricingPlan): StripeBilling {
  const paymentType = (plan.paymentType ?? '').toLowerCase().trim()
  const recurringInterval = (plan.recurringInterval ?? '').toLowerCase().trim()

  if (
    paymentType === 'one_time' ||
    paymentType === 'onetime' ||
    recurringInterval === 'once'
  ) {
    return {
      paymentType: 'one_time',
    }
  }

  if (paymentType === 'recurring') {
    if (recurringInterval === 'month' || recurringInterval === 'every-month') {
      return {
        paymentType: 'recurring',
        recurringInterval: 'month',
      }
    }

    if (recurringInterval === 'year' || recurringInterval === 'every-year') {
      return {
        paymentType: 'recurring',
        recurringInterval: 'year',
      }
    }
  }

  throw new Error(
    `Unsupported paymentType/recurringInterval for plan ${plan.id}: ${plan.paymentType}/${plan.recurringInterval}`
  )
}

function parseUnitAmount(
  value: string | number | null | undefined,
  planId: string
) {
  const normalized =
    typeof value === 'number' ? String(value) : (value ?? '').trim()

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid price for Stripe plan ${planId}: ${value}`)
  }

  const unitAmount = Math.round(Number(normalized) * 100)
  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    throw new Error(`Invalid price for Stripe plan ${planId}: ${value}`)
  }

  return unitAmount
}

function normalizeCurrency(value: string | null | undefined) {
  const currency = (value ?? 'USD').trim().toLowerCase()
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error(`Invalid Stripe currency: ${value}`)
  }
  return currency
}

function buildStripeProductParams(
  plan: PricingPlan,
  environment: ProductSyncEnvironment,
  taxCode: string
): Stripe.ProductCreateParams {
  if (!plan.id) {
    throw new Error('Plan id is required for Stripe product sync.')
  }

  return {
    name: `${siteConfig.name.trim()} ${plan.cardTitle.trim()}`,
    description: (plan.cardDescription ?? plan.cardTitle).trim(),
    tax_code: taxCode,
    metadata: {
      environment,
      pricingPlanId: plan.id,
    },
  }
}

function buildStripePriceParams(
  plan: PricingPlan,
  productId: string
): Stripe.PriceCreateParams {
  if (!plan.id) {
    throw new Error('Plan id is required for Stripe price sync.')
  }

  const billing = deriveStripeBilling(plan)

  return {
    product: productId,
    currency: normalizeCurrency(plan.currency),
    unit_amount: parseUnitAmount(plan.price, plan.id),
    recurring:
      billing.paymentType === 'recurring'
        ? {
            interval: billing.recurringInterval!,
          }
        : undefined,
    metadata: {
      paymentType: billing.paymentType,
      pricingPlanId: plan.id,
      recurringInterval: billing.recurringInterval ?? 'once',
    },
  }
}

function assertStripeKeyMatchesEnvironment(
  secretKey: string,
  environment: ProductSyncEnvironment
) {
  const expectedMarker = `_${environment}_`
  if (
    !secretKey.startsWith(`sk${expectedMarker}`) &&
    !secretKey.startsWith(`rk${expectedMarker}`)
  ) {
    throw new Error(
      `STRIPE_SECRET_KEY does not match env=${environment}. Refusing to create Stripe resources in the wrong environment.`
    )
  }
}

function getProductIdFromPrice(price: Stripe.Price) {
  return typeof price.product === 'string' ? price.product : price.product.id
}

async function ensureStripeProductTaxCode(
  stripe: Stripe,
  productId: string,
  taxCode: string
) {
  const product = await stripe.products.retrieve(productId)
  if ('deleted' in product && product.deleted) {
    throw new Error(`Stripe product ${productId} has been deleted.`)
  }

  if (product.tax_code === taxCode) {
    return false
  }

  await stripe.products.update(productId, {
    tax_code: taxCode,
  })
  return true
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const environment = parseProductSyncEnvironmentArgument(process.argv.slice(2))
  const environmentFile = loadProductSyncEnvironmentFile(environment, projectDir)
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  const taxCode =
    process.env.STRIPE_PRODUCT_TAX_CODE?.trim() ??
    defaultStripeProductTaxCode

  if (!/^txcd_\d{8}$/.test(taxCode)) {
    throw new Error(
      `Invalid STRIPE_PRODUCT_TAX_CODE: ${taxCode}. Expected a Stripe tax code such as ${defaultStripeProductTaxCode}.`
    )
  }

  if (!dryRun) {
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.')
    }
    assertStripeKeyMatchesEnvironment(secretKey, environment)
  }

  const targetPlans = pricingPlans.filter(
    plan =>
      isStripePlanProvider(plan.provider) && plan.environment === environment
  )

  if (targetPlans.length === 0) {
    console.log(`No Stripe plans found for env=${environment}.`)
    return
  }

  console.log(`[sync] env=${environment}`)
  console.log(`[sync] Loaded configuration from ${environmentFile}`)
  console.log(
    `[sync] Found ${targetPlans.length} Stripe plan(s) in pricing-config.ts`
  )
  console.log(`[sync] Stripe product tax code: ${taxCode}`)
  if (dryRun) {
    console.log('[dry-run] No API writes and no file changes.')
  }

  const stripe = dryRun
    ? null
    : new Stripe(secretKey, {
        httpClient: Stripe.createFetchHttpClient(),
        typescript: true,
      })
  let pricingConfigSource = dryRun
    ? ''
    : fs.readFileSync(pricingConfigPath, 'utf8')
  let updatedCount = 0
  let skippedCount = 0

  for (const plan of targetPlans) {
    if (!plan.id) {
      throw new Error(`Missing id for plan "${plan.cardTitle}"`)
    }

    const existingProductId = hasUsableStripeId(
      plan.stripeProductId,
      'prod_'
    )
      ? plan.stripeProductId!.trim()
      : null
    const existingPriceId = hasUsableStripeId(plan.stripePriceId, 'price_')
      ? plan.stripePriceId!.trim()
      : null

    if (!force && existingPriceId) {
      if (existingProductId) {
        if (dryRun) {
          console.log(
            `- [DRY-RUN] ${plan.cardTitle} (${plan.id}) -> verify product ${existingProductId} uses tax code ${taxCode}; keep price ${existingPriceId}`
          )
          continue
        }

        const taxCodeUpdated = await ensureStripeProductTaxCode(
          stripe!,
          existingProductId,
          taxCode
        )
        if (taxCodeUpdated) {
          updatedCount += 1
          console.log(
            `[ok] Updated ${plan.cardTitle} (${plan.id}) -> product ${existingProductId}, tax code ${taxCode}; kept price ${existingPriceId}`
          )
          continue
        }

        skippedCount += 1
        console.log(
          `- Skip ${plan.cardTitle} (${plan.id}): stripePriceId already exists (${existingPriceId})`
        )
        continue
      }

      if (dryRun) {
        console.log(
          `- [DRY-RUN] ${plan.cardTitle} (${plan.id}) -> backfill product from price ${existingPriceId}`
        )
        continue
      }

      const remotePrice = await stripe!.prices.retrieve(existingPriceId, {
        expand: ['product'],
      })
      const remoteProductId = getProductIdFromPrice(remotePrice)
      await ensureStripeProductTaxCode(stripe!, remoteProductId, taxCode)
      pricingConfigSource = applyPricingConfigFieldUpdates(
        pricingConfigSource,
        [
          {
            planId: plan.id,
            fields: {
              stripeProductId: remoteProductId,
            },
          },
        ]
      )
      fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')
      updatedCount += 1
      console.log(
        `[ok] Backfilled ${plan.cardTitle} (${plan.id}) -> product ${remoteProductId}, price ${existingPriceId}`
      )
      continue
    }

    const priceParams = buildStripePriceParams(
      plan,
      existingProductId ?? 'prod_dry_run'
    )
    const billingDisplay = priceParams.recurring?.interval ?? 'one-time'

    if (dryRun) {
      const productAction =
        force || !existingProductId
          ? 'create product'
          : `reuse product ${existingProductId}`
      console.log(
        `- [DRY-RUN] ${plan.cardTitle} (${plan.id}) -> ${productAction}, create ${billingDisplay} price, ${priceParams.unit_amount} ${priceParams.currency}`
      )
      continue
    }

    let stripeProductId = existingProductId
    if (force || !stripeProductId) {
      const product = await stripe!.products.create(
        buildStripeProductParams(plan, environment, taxCode)
      )
      stripeProductId = product.id

      pricingConfigSource = applyPricingConfigFieldUpdates(
        pricingConfigSource,
        [
          {
            planId: plan.id,
            fields: {
              stripeProductId,
            },
          },
        ]
      )
      fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')
      console.log(
        `[ok] Created ${plan.cardTitle} (${plan.id}) -> product ${stripeProductId} (persisted)`
      )
    } else {
      const taxCodeUpdated = await ensureStripeProductTaxCode(
        stripe!,
        stripeProductId,
        taxCode
      )
      if (taxCodeUpdated) {
        console.log(
          `[ok] Updated ${plan.cardTitle} (${plan.id}) -> product ${stripeProductId}, tax code ${taxCode}`
        )
      }
    }

    const price = await stripe!.prices.create(
      buildStripePriceParams(plan, stripeProductId)
    )
    pricingConfigSource = applyPricingConfigFieldUpdates(
      pricingConfigSource,
      [
        {
          planId: plan.id,
          fields: {
            stripePriceId: price.id,
            stripeProductId,
          },
        },
      ]
    )
    fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')
    updatedCount += 1

    console.log(
      `[ok] Created ${plan.cardTitle} (${plan.id}) -> product ${stripeProductId}, price ${price.id} (persisted)`
    )
  }

  if (dryRun) {
    console.log(
      `\nDry-run completed. ${targetPlans.length - skippedCount} plan(s) would be synchronized.`
    )
    return
  }

  if (updatedCount === 0) {
    console.log('\nNo Stripe products or prices synchronized.')
    return
  }

  console.log(`\n[ok] Updated ${updatedCount} plan(s) in pricing-config.ts`)
  console.log(`[file] ${pricingConfigPath}`)
  console.log('[next] file to db: pnpm db:seed')
}

main().catch(error => {
  console.error('\n[error] Failed to sync Stripe products:', error)
  process.exit(1)
})
