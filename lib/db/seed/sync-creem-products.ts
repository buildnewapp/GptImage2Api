/**
 * Creem Product Sync Script
 * Creem 产品同步脚本
 *
 * Creates Creem products for current PAY_ENV plans and writes product ids back
 * to pricing-config.ts.
 *
 * Usage:
 *   pnpm db:sync-creem-products -- --dry-run
 *   pnpm db:sync-creem-products
 *   pnpm db:sync-creem-products -- --force
 */

import { loadEnvConfig } from '@next/env'
import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CreemProductCreateParams } from '../../creem/types'
import {
  applyCreemProductIdUpdates,
  buildCreemProductPayload,
  normalizePayEnvironment,
} from './creem-product-sync'
import { pricingPlans } from './pricing-config'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pricingConfigPath = path.join(__dirname, 'pricing-config.ts')

function hasExistingCreemProductId(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return false
  }
  const normalized = value.trim()
  if (!normalized) {
    return false
  }
  return !normalized.toUpperCase().startsWith('TODO_')
}

function isCreemPlanProvider(value: unknown) {
  if (typeof value !== 'string') {
    return false
  }

  const provider = value.toLowerCase()
  return provider === 'creem' || provider === 'all'
}

function buildCreateParamsFromPlan(plan: (typeof pricingPlans)[number]): CreemProductCreateParams {
  if (!plan.id) {
    throw new Error('Plan id is required for Creem product sync.')
  }

  const payload = buildCreemProductPayload({
    planId: plan.id,
    environment: plan.environment,
    cardTitle: plan.cardTitle,
    cardDescription: plan.cardDescription,
    paymentType: plan.paymentType,
    recurringInterval: plan.recurringInterval,
    price: plan.price,
    currency: plan.currency,
  })

  return {
    name: payload.name,
    description: payload.description,
    price: payload.price,
    currency: payload.currency,
    billing_type: payload.billingType,
    billing_period: payload.billingPeriod,
  }
}

async function main() {
  const { createCreemProduct } = await import('../../creem/client')
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const payEnv = normalizePayEnvironment(process.env.PAY_ENV)
  const creemApiBaseUrl = process.env.CREEM_API_BASE_URL ?? 'https://api.creem.io/v1'

  if (!dryRun && !process.env.CREEM_API_KEY) {
    throw new Error('CREEM_API_KEY is not configured.')
  }

  if (payEnv === 'test' && !creemApiBaseUrl.includes('test-api')) {
    console.warn(
      `[warn] PAY_ENV=test but CREEM_API_BASE_URL is ${creemApiBaseUrl}. Creem test environment usually uses test-api domain.`
    )
  }

  if (payEnv === 'live' && creemApiBaseUrl.includes('test-api')) {
    console.warn(
      `[warn] PAY_ENV=live but CREEM_API_BASE_URL is ${creemApiBaseUrl}. Please verify environment settings before proceeding.`
    )
  }

  const targetPlans = pricingPlans.filter(
    plan => isCreemPlanProvider(plan.provider) && plan.environment === payEnv
  )

  if (targetPlans.length === 0) {
    console.log(`No Creem plans found for PAY_ENV=${payEnv}.`)
    return
  }

  console.log(`[sync] PAY_ENV=${payEnv}`)
  console.log(`[sync] Found ${targetPlans.length} Creem plan(s) in pricing-config.ts`)
  if (dryRun) {
    console.log('[dry-run] No API writes and no file changes.')
  }

  const updates: Array<{ planId: string; creemProductId: string }> = []
  let skippedCount = 0
  let pricingConfigSource = dryRun ? '' : fs.readFileSync(pricingConfigPath, 'utf8')

  for (const plan of targetPlans) {
    if (!plan.id) {
      throw new Error(`Missing id for plan "${plan.cardTitle}"`)
    }

    if (!force && hasExistingCreemProductId(plan.creemProductId)) {
      skippedCount += 1
      console.log(`- Skip ${plan.cardTitle} (${plan.id}): creemProductId already exists (${plan.creemProductId})`)
      continue
    }

    const createParams = buildCreateParamsFromPlan(plan)
    if (dryRun) {
      const billingPeriodDisplay = createParams.billing_period ?? '-'
      console.log(
        `- [DRY-RUN] ${plan.cardTitle} (${plan.id}) -> ${createParams.billing_type}/${billingPeriodDisplay}, ${createParams.price} ${createParams.currency}`
      )
      continue
    }

    const product = await createCreemProduct(createParams)
    const update = {
      planId: plan.id,
      creemProductId: product.id,
    }
    updates.push(update)

    // Persist each successful creation immediately so reruns can safely resume.
    pricingConfigSource = applyCreemProductIdUpdates(pricingConfigSource, [update])
    fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')

    console.log(`[ok] Created ${plan.cardTitle} (${plan.id}) -> ${product.id} (persisted)`)
  }

  if (dryRun) {
    console.log(`\nDry-run completed. ${targetPlans.length - skippedCount} plan(s) would be created.`)
    return
  }

  if (updates.length === 0) {
    console.log('\nNo new Creem products created. pricing-config.ts is unchanged.')
    return
  }

  console.log(`\n[ok] Updated ${updates.length} plan(s) in pricing-config.ts`)
  console.log(`[file] ${pricingConfigPath}`)
}

main().catch(error => {
  console.error('\n[error] Failed to sync Creem products:', error)
  process.exit(1)
})
