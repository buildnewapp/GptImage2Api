/**
 * Subotiz Product Sync Script
 * Subotiz 商品与定价同步脚本
 *
 * Creates Subotiz products and prices for the selected environment, then
 * writes price ids back to pricing-config.ts.
 *
 * Usage:
 *   pnpm db:sync-subotiz-products -- env=test --dry-run
 *   pnpm db:sync-subotiz-products -- env=test
 *   pnpm db:sync-subotiz-products -- env=live --force
 */

import * as fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteConfig } from '@/config/site'
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

type PayEnvironment = ProductSyncEnvironment
type BillingCycleUnit = 'month' | 'year'

interface SubotizApiResponse<T> {
  code: string
  message: string
  data: T
}

interface SubotizListResponse<T> {
  has_more?: boolean
  list: T[]
}

interface SubotizCategory {
  category_id: string
  category_name: string
  category_status?: string
  is_default?: boolean
}

interface SubotizProduct {
  product_id: string
  product_version_id?: string
  merchant_product_id?: string
  product_status?: string
}

interface SubotizCreatedProduct {
  product_id: string
  product_version_id: string
}

interface SubotizCreatedPrice {
  price_id?: string
  id?: string
}

interface SubotizRequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}

interface PlanBilling {
  billingType: 'one_time' | 'recurring'
  billingCycleUnit?: BillingCycleUnit
  label: 'One-Time' | 'Monthly' | 'Annual'
}

function hasExistingSubotizPriceId(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  return Boolean(normalized) && !normalized.toUpperCase().startsWith('TODO_')
}

function isSubotizPlanProvider(value: unknown) {
  if (typeof value !== 'string') {
    return false
  }

  const provider = value.toLowerCase()
  return provider === 'subotiz' || provider === 'all'
}

function deriveBilling(
  plan: (typeof pricingPlans)[number]
): PlanBilling {
  const paymentType = (plan.paymentType ?? '').toLowerCase().trim()
  const interval = (plan.recurringInterval ?? '').toLowerCase().trim()

  if (
    paymentType === 'one_time' ||
    paymentType === 'onetime' ||
    interval === 'once'
  ) {
    return {
      billingType: 'one_time',
      label: 'One-Time',
    }
  }

  if (paymentType === 'recurring') {
    if (interval === 'month' || interval === 'every-month') {
      return {
        billingType: 'recurring',
        billingCycleUnit: 'month',
        label: 'Monthly',
      }
    }

    if (interval === 'year' || interval === 'every-year') {
      return {
        billingType: 'recurring',
        billingCycleUnit: 'year',
        label: 'Annual',
      }
    }
  }

  throw new Error(
    `Unsupported paymentType/recurringInterval for plan ${plan.id}: ${plan.paymentType}/${plan.recurringInterval}`
  )
}

function normalizePrice(
  value: string | number | null | undefined,
  planId: string
) {
  const normalized = typeof value === 'number' ? String(value) : (value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error(`Invalid price for plan ${planId}: ${value}`)
  }

  return Number(normalized).toFixed(2)
}

function getProductImageUrl() {
  const configuredUrl = process.env.SUBOTIZ_PRODUCT_IMAGE_URL?.trim()
  if (configuredUrl) {
    return configuredUrl
  }

  return 'https://sdanceai.com/logo-512.png'
}

async function validateProductImageUrl(imageUrl: string) {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    throw new Error(`Invalid SUBOTIZ_PRODUCT_IMAGE_URL: ${imageUrl}`)
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(
      `SUBOTIZ_PRODUCT_IMAGE_URL must use HTTP or HTTPS: ${imageUrl}`
    )
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: 'image/*',
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  await response.body?.cancel()

  if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
    throw new Error(
      `Subotiz product image is not publicly accessible as an image: ${imageUrl} (HTTP ${response.status}, ${contentType || 'unknown content type'})`
    )
  }
}

function getIncludedFeatures(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(feature => {
    if (
      !feature ||
      typeof feature !== 'object' ||
      !('included' in feature) ||
      feature.included !== true ||
      !('description' in feature) ||
      typeof feature.description !== 'string' ||
      !feature.description.trim()
    ) {
      return []
    }

    return [
      {
        name: feature.description.trim(),
        type: 'qualitative',
      },
    ]
  })
}

function buildProductName(
  plan: (typeof pricingPlans)[number],
  billing: PlanBilling
) {
  return `${siteConfig.name.trim()} ${plan.cardTitle.trim()} ${billing.label}`
}

function getMerchantProductId(
  planId: string,
  payEnv: PayEnvironment,
  imageUrl: string
) {
  const imageVersion = createHash('sha256')
    .update(imageUrl)
    .digest('hex')
    .slice(0, 8)
  return `pricing-${payEnv}-${planId}-${imageVersion}`
}

async function subotizRequest<T>(
  apiBaseUrl: string,
  apiKey: string,
  requestPath: string,
  options: SubotizRequestOptions = {}
) {
  const response = await fetch(`${apiBaseUrl}${requestPath}`, {
    method: options.method ?? 'GET',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Request-Id': randomUUID(),
    },
  })

  const responseText = await response.text()
  let result: SubotizApiResponse<T> | undefined

  try {
    result = JSON.parse(responseText) as SubotizApiResponse<T>
  } catch {
    // The fallback error below includes the raw response when it is not JSON.
  }

  if (!response.ok || !result) {
    const message =
      result?.message ||
      responseText ||
      `Subotiz API responded with status ${response.status}`
    throw new Error(message)
  }

  return result.data
}

async function resolveCategoryId(apiBaseUrl: string, apiKey: string) {
  const configuredCategoryId = process.env.SUBOTIZ_PRODUCT_CATEGORY_ID?.trim()
  if (configuredCategoryId) {
    return configuredCategoryId
  }

  const data = await subotizRequest<{
    total: number
    list: SubotizCategory[]
  }>(apiBaseUrl, apiKey, '/api/v1/product-categories')
  const categories = data.list ?? []
  const category =
    categories.find(item => item.category_name === 'Software as a service (SaaS)') ??
    categories.find(item => item.is_default) ??
    categories.find(item => item.category_status === '1') ??
    categories[0]

  if (!category?.category_id) {
    throw new Error(
      'No Subotiz product category is available. Set SUBOTIZ_PRODUCT_CATEGORY_ID explicitly.'
    )
  }

  console.log(
    `[sync] Using Subotiz category: ${category.category_name} (${category.category_id})`
  )
  return category.category_id
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const payEnv = parseProductSyncEnvironmentArgument(process.argv.slice(2))
  const environmentFile = loadProductSyncEnvironmentFile(payEnv, projectDir)
  const defaultApiBaseUrl =
    payEnv === 'test'
      ? 'https://api.sandbox.subotiz.com'
      : 'https://api.subotiz.com'
  const apiBaseUrl = (
    process.env.SUBOTIZ_API_BASE_URL ?? defaultApiBaseUrl
  ).replace(/\/+$/, '')
  const apiKey = process.env.SUBOTIZ_API_KEY?.trim() ?? ''
  const imageUrl = getProductImageUrl()

  if (!dryRun && !apiKey) {
    throw new Error('SUBOTIZ_API_KEY is not configured.')
  }

  if (payEnv === 'test' && !apiBaseUrl.includes('sandbox')) {
    const message = `env=test loaded ${environmentFile}, but SUBOTIZ_API_BASE_URL is ${apiBaseUrl}.`
    if (!dryRun) {
      throw new Error(`${message} Refusing to write test products to a non-sandbox API.`)
    }
    console.warn(`[warn] ${message}`)
  }

  if (payEnv === 'live' && apiBaseUrl.includes('sandbox')) {
    const message = `env=live loaded ${environmentFile}, but SUBOTIZ_API_BASE_URL is ${apiBaseUrl}.`
    if (!dryRun) {
      throw new Error(`${message} Refusing to write live products to the sandbox API.`)
    }
    console.warn(`[warn] ${message}`)
  }

  const targetPlans = pricingPlans.filter(
    plan => isSubotizPlanProvider(plan.provider) && plan.environment === payEnv
  )

  if (targetPlans.length === 0) {
    console.log(`No Subotiz plans found for env=${payEnv}.`)
    return
  }

  console.log(`[sync] env=${payEnv}`)
  console.log(`[sync] Loaded configuration from ${environmentFile}`)
  console.log(`[sync] Found ${targetPlans.length} Subotiz plan(s) in pricing-config.ts`)
  console.log(`[sync] Product image: ${imageUrl}`)
  if (dryRun) {
    console.log('[dry-run] No API writes and no file changes.')
  }

  const plansToCreate = targetPlans.filter(
    plan => force || !hasExistingSubotizPriceId(plan.subotizPriceId)
  )
  const skippedCount = targetPlans.length - plansToCreate.length

  for (const plan of targetPlans) {
    if (!force && hasExistingSubotizPriceId(plan.subotizPriceId)) {
      console.log(
        `- Skip ${plan.cardTitle} (${plan.id}): subotizPriceId already exists (${plan.subotizPriceId})`
      )
    }
  }

  if (plansToCreate.length === 0) {
    console.log('\nNo new Subotiz prices need to be created.')
    return
  }

  if (dryRun) {
    for (const plan of plansToCreate) {
      if (!plan.id) {
        throw new Error(`Missing id for plan "${plan.cardTitle}"`)
      }
      const billing = deriveBilling(plan)
      const price = normalizePrice(plan.price, plan.id)
      console.log(
        `- [DRY-RUN] ${buildProductName(plan, billing)} (${plan.id}) -> ${billing.billingType}/${billing.billingCycleUnit ?? '-'}, ${price} ${(plan.currency ?? 'USD').toUpperCase()}`
      )
    }

    console.log(
      `\nDry-run completed. ${targetPlans.length - skippedCount} plan(s) would be created.`
    )
    return
  }

  await validateProductImageUrl(imageUrl)
  const categoryId = await resolveCategoryId(apiBaseUrl, apiKey)
  const [productData, productVersionData] = await Promise.all([
    subotizRequest<SubotizListResponse<SubotizProduct>>(
      apiBaseUrl,
      apiKey,
      '/api/v1/products?limit=100'
    ),
    subotizRequest<SubotizListResponse<SubotizProduct>>(
      apiBaseUrl,
      apiKey,
      '/api/v1/products/version?limit=100'
    ),
  ])
  const products = productData.list ?? []
  const productVersions = productVersionData.list ?? []
  let pricingConfigSource = fs.readFileSync(pricingConfigPath, 'utf8')
  let createdCount = 0

  for (const plan of plansToCreate) {
    if (!plan.id) {
      throw new Error(`Missing id for plan "${plan.cardTitle}"`)
    }

    const billing = deriveBilling(plan)
    const productName = buildProductName(plan, billing)
    const merchantProductId = getMerchantProductId(plan.id, payEnv, imageUrl)
    const description = (plan.cardDescription ?? plan.cardTitle).trim()
    const price = normalizePrice(plan.price, plan.id)
    let product = products.find(
      item => item.merchant_product_id === merchantProductId
    )
    let productVersion = productVersions.find(
      item => item.product_id === product?.product_id
    )

    if (!product || !productVersion?.product_version_id) {
      const createdProduct = await subotizRequest<SubotizCreatedProduct>(
        apiBaseUrl,
        apiKey,
        '/api/v1/products',
        {
          method: 'POST',
          body: {
            product_name: productName,
            merchant_product_id: merchantProductId,
            category_id: categoryId,
            image_url: imageUrl,
            description,
            features: getIncludedFeatures(plan.features),
          },
        }
      )

      if (!createdProduct.product_id || !createdProduct.product_version_id) {
        throw new Error(`Subotiz did not return product ids for plan ${plan.id}.`)
      }

      product = {
        product_id: createdProduct.product_id,
        merchant_product_id: merchantProductId,
        product_status: 'draft',
      }
      productVersion = {
        product_id: createdProduct.product_id,
        product_version_id: createdProduct.product_version_id,
        product_status: 'draft',
      }
      products.push(product)
      productVersions.push(productVersion)
      console.log(
        `[ok] Created product ${productName} -> ${createdProduct.product_id}`
      )
    } else {
      console.log(`[reuse] Product ${productName} -> ${product.product_id}`)
    }

    const productVersionId = productVersion.product_version_id
    if (!productVersionId) {
      throw new Error(`Missing Subotiz product version id for plan ${plan.id}.`)
    }

    if (
      product.product_status !== 'active' ||
      productVersion.product_status !== 'active'
    ) {
      await subotizRequest<Record<string, never>>(
        apiBaseUrl,
        apiKey,
        `/api/v1/products/${encodeURIComponent(productVersionId)}/status`,
        {
          method: 'POST',
          body: {
            product_version_id: productVersionId,
            status: 'active',
          },
        }
      )
      product.product_status = 'active'
      productVersion.product_status = 'active'
      console.log(`[ok] Activated product ${productName}`)
    }

    const priceBody =
      billing.billingType === 'one_time'
        ? {
            name: productName,
            product_id: product.product_id,
            product_version_id: productVersionId,
            billing_type: 'one_time',
            description,
            price_type: 'flat_price',
            price_val: price,
            status: 'active',
          }
        : {
            name: productName,
            product_id: product.product_id,
            product_version_id: productVersionId,
            billing_type: 'recurring',
            description,
            price_type: 'flat_price',
            price_plan: {
              base_price_val: price,
              billing_cycle_unit: billing.billingCycleUnit,
              price_tier_type: 'common',
            },
            status: 'active',
          }

    const createdPrice = await subotizRequest<SubotizCreatedPrice>(
      apiBaseUrl,
      apiKey,
      '/api/v1/prices',
      {
        method: 'POST',
        body: priceBody,
      }
    )
    const priceId = createdPrice.price_id ?? createdPrice.id
    if (!priceId) {
      throw new Error(`Subotiz did not return a price id for plan ${plan.id}.`)
    }

    // Persist every successful price immediately so a failed run can resume.
    pricingConfigSource = applyPricingConfigFieldUpdates(pricingConfigSource, [
      {
        planId: plan.id,
        fields: {
          subotizPriceId: priceId,
        },
      },
    ])
    fs.writeFileSync(pricingConfigPath, pricingConfigSource, 'utf8')
    createdCount += 1
    console.log(`[ok] Created price ${productName} -> ${priceId} (persisted)`)
  }

  console.log(`\n[ok] Updated ${createdCount} plan(s) in pricing-config.ts`)
  console.log(`[file] ${pricingConfigPath}`)
  console.log('[next] Run pnpm db:seed to sync the new price ids to the database.')
}

main().catch(error => {
  console.error('\n[error] Failed to sync Subotiz products:', error)
  process.exit(1)
})
