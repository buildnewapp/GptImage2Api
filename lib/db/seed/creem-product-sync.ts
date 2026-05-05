import { siteConfig } from '@/config/site'

export type BillingType = 'recurring' | 'onetime'
export type BillingPeriod = 'every-month' | 'every-year'
export type PlanKind = 'monthly' | 'annual' | 'onetime'

export interface DeriveCreemBillingInput {
  paymentType: string | null | undefined
  recurringInterval: string | null | undefined
  planId: string
}

export interface DeriveCreemBillingResult {
  billingType: BillingType
  billingPeriod?: BillingPeriod
  planKind: PlanKind
}

export interface CreemProductIdUpdate {
  planId: string
  creemProductId: string
}

export interface PricingConfigFieldUpdate {
  planId: string
  fields: Record<string, string>
}

export interface BuildCreemProductPayloadInput extends DeriveCreemBillingInput {
  cardTitle: string
  cardDescription: string | null | undefined
  price: string | number | null | undefined
  currency: string | null | undefined
  environment: 'test' | 'live'
}

export interface BuildCreemProductPayloadResult extends DeriveCreemBillingResult {
  name: string
  description: string
  price: number
  currency: string
}

function normalizePaymentType(paymentType: string | null | undefined) {
  const value = (paymentType ?? '').toLowerCase().trim()
  if (value === 'one_time' || value === 'onetime') {
    return 'onetime' as const
  }
  if (value === 'recurring') {
    return 'recurring' as const
  }
  return value
}

function normalizeRecurringInterval(recurringInterval: string | null | undefined) {
  return (recurringInterval ?? '').toLowerCase().trim()
}

function parsePrice(value: string | number | null | undefined, planId: string): number {
  const normalized = typeof value === 'number' ? String(value) : (value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid price for plan ${planId}: ${value}`)
  }

  // Creem create product API expects integer amount in smallest currency unit.
  const majorUnitPrice = Number(normalized)
  const minorUnitPrice = Math.round(majorUnitPrice * 100)
  if (!Number.isFinite(minorUnitPrice) || minorUnitPrice <= 0) {
    throw new Error(`Invalid price for plan ${planId}: ${value}`)
  }

  return minorUnitPrice
}

function normalizeCurrency(value: string | null | undefined): string {
  const normalized = (value ?? 'USD').trim().toUpperCase()
  if (!normalized) {
    return 'USD'
  }
  return normalized
}

export function normalizePayEnvironment(rawValue: string | null | undefined): 'test' | 'live' {
  const normalized = (rawValue ?? '').toLowerCase().trim()
  if (normalized === 'test' || normalized === 'live') {
    return normalized
  }
  throw new Error(`PAY_ENV must be "test" or "live", received: ${rawValue ?? 'undefined'}`)
}

export function deriveCreemBilling(input: DeriveCreemBillingInput): DeriveCreemBillingResult {
  const paymentType = normalizePaymentType(input.paymentType)
  const recurringInterval = normalizeRecurringInterval(input.recurringInterval)

  if (paymentType === 'onetime' || recurringInterval === 'once') {
    return {
      billingType: 'onetime',
      planKind: 'onetime',
    }
  }

  if (paymentType === 'recurring') {
    if (recurringInterval === 'month' || recurringInterval === 'every-month') {
      return {
        billingType: 'recurring',
        billingPeriod: 'every-month',
        planKind: 'monthly',
      }
    }

    if (recurringInterval === 'year' || recurringInterval === 'every-year') {
      return {
        billingType: 'recurring',
        billingPeriod: 'every-year',
        planKind: 'annual',
      }
    }
  }

  throw new Error(
    `Unsupported paymentType/recurringInterval combination for plan ${input.planId}: ${input.paymentType}/${input.recurringInterval}`
  )
}

export function buildCreemProductPayload(
  input: BuildCreemProductPayloadInput
): BuildCreemProductPayloadResult {
  const billing = deriveCreemBilling(input)
  const siteName = siteConfig.name.trim()

  return {
    ...billing,
    name: `${siteName} ${input.cardTitle.trim()}`,
    description: (input.cardDescription ?? input.cardTitle).trim(),
    price: parsePrice(input.price, input.planId),
    currency: normalizeCurrency(input.currency),
  }
}

function upsertPricingConfigField(
  planObjectText: string,
  fieldName: string,
  fieldValue: string
): string {
  const lines = planObjectText.split('\n')
  const fieldPattern = new RegExp(`\\b${fieldName}\\s*:`)
  const existingIndex = lines.findIndex(line => fieldPattern.test(line))

  if (existingIndex >= 0) {
    const indent = lines[existingIndex].match(/^(\s*)/)?.[1] ?? '    '
    lines[existingIndex] = `${indent}${fieldName}: '${fieldValue}',`
    return lines.join('\n')
  }

  const anchorIndex = lines.findIndex(
    line =>
      /\bstripeProductId\s*:/.test(line) ||
      /\bstripePriceId\s*:/.test(line) ||
      /\bprovider\s*:/.test(line)
  )

  if (anchorIndex >= 0) {
    const indent = lines[anchorIndex].match(/^(\s*)/)?.[1] ?? '    '
    lines.splice(anchorIndex + 1, 0, `${indent}${fieldName}: '${fieldValue}',`)
    return lines.join('\n')
  }

  const idIndex = lines.findIndex(line => /\bid\s*:/.test(line))
  if (idIndex >= 0) {
    const indent = lines[idIndex].match(/^(\s*)/)?.[1] ?? '    '
    lines.splice(idIndex + 1, 0, `${indent}${fieldName}: '${fieldValue}',`)
  }

  return lines.join('\n')
}

interface PlanRange {
  id: string
  start: number
  end: number
  text: string
}

function collectPlanRangesFromArray(source: string, declaration: string): PlanRange[] {
  const anchor = source.indexOf(declaration)
  if (anchor < 0) {
    return []
  }

  const equalsSignIndex = source.indexOf('=', anchor)
  const arrayStart = source.indexOf('[', equalsSignIndex)
  if (arrayStart < 0) {
    throw new Error('Cannot locate pricingPlans array start in pricing-config.ts')
  }

  const ranges: PlanRange[] = []
  let objectStart = -1
  let braceDepth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplate = false
  let inLineComment = false
  let inBlockComment = false
  let escaped = false

  for (let i = arrayStart + 1; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        i += 1
      }
      continue
    }

    if (inSingleQuote) {
      if (char === "'" && !escaped) {
        inSingleQuote = false
      }
      escaped = char === '\\' && !escaped
      continue
    }

    if (inDoubleQuote) {
      if (char === '"' && !escaped) {
        inDoubleQuote = false
      }
      escaped = char === '\\' && !escaped
      continue
    }

    if (inTemplate) {
      if (char === '`' && !escaped) {
        inTemplate = false
      }
      escaped = char === '\\' && !escaped
      continue
    }

    escaped = false

    if (char === '/' && next === '/') {
      inLineComment = true
      i += 1
      continue
    }

    if (char === '/' && next === '*') {
      inBlockComment = true
      i += 1
      continue
    }

    if (char === "'") {
      inSingleQuote = true
      continue
    }

    if (char === '"') {
      inDoubleQuote = true
      continue
    }

    if (char === '`') {
      inTemplate = true
      continue
    }

    if (char === ']' && braceDepth === 0) {
      break
    }

    if (char === '{') {
      if (braceDepth === 0) {
        objectStart = i
      }
      braceDepth += 1
      continue
    }

    if (char === '}') {
      braceDepth -= 1
      if (braceDepth === 0 && objectStart >= 0) {
        const objectEnd = i + 1
        const objectText = source.slice(objectStart, objectEnd)
        const idMatch = objectText.match(/\bid\s*:\s*'([^']+)'/)

        if (idMatch?.[1]) {
          ranges.push({
            id: idMatch[1],
            start: objectStart,
            end: objectEnd,
            text: objectText,
          })
        }

        objectStart = -1
      }
    }
  }

  return ranges
}

function collectPricingPlanRanges(source: string): PlanRange[] {
  const ranges = [
    ...collectPlanRangesFromArray(source, 'const testPricingPlans'),
    ...collectPlanRangesFromArray(source, 'export const pricingPlans'),
  ]

  if (ranges.length === 0) {
    throw new Error('Cannot locate pricing plans arrays in pricing-config.ts')
  }

  return ranges
}

export function applyCreemProductIdUpdates(
  source: string,
  updates: CreemProductIdUpdate[]
): string {
  return applyPricingConfigFieldUpdates(
    source,
    updates.map(update => ({
      planId: update.planId,
      fields: {
        creemProductId: update.creemProductId,
      },
    }))
  )
}

export function applyPricingConfigFieldUpdates(
  source: string,
  updates: PricingConfigFieldUpdate[]
): string {
  if (updates.length === 0) {
    return source
  }

  const updatesByPlanId = new Map(updates.map(update => [update.planId, update.fields]))
  const planRanges = collectPricingPlanRanges(source)
  let nextSource = source

  for (const range of [...planRanges].sort((a, b) => b.start - a.start)) {
    const fields = updatesByPlanId.get(range.id)
    if (!fields || Object.keys(fields).length === 0) {
      continue
    }

    let updatedPlanText = range.text
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      updatedPlanText = upsertPricingConfigField(updatedPlanText, fieldName, fieldValue)
    }
    nextSource =
      nextSource.slice(0, range.start) + updatedPlanText + nextSource.slice(range.end)
    updatesByPlanId.delete(range.id)
  }

  if (updatesByPlanId.size > 0) {
    const notFoundIds = [...updatesByPlanId.keys()].join(', ')
    throw new Error(`Failed to locate plan ids in pricing-config.ts: ${notFoundIds}`)
  }

  return nextSource
}
