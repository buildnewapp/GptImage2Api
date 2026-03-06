/**
 * Pricing Configuration File
 * 定价配置文件
 *
 * This file serves as the single source of truth for pricing plans.
 * AI can edit this file directly, then run `pnpm db:seed` to sync to database.
 *
 * 此文件作为定价计划的单一真相来源。
 * AI 可以直接编辑此文件，然后运行 `pnpm db:seed` 同步到数据库。
 *
 * Usage / 使用方法:
 * 1. Edit this file to add/update/remove pricing plans
 * 2. Run `pnpm db:seed` to sync changes to database
 * 3. Run `pnpm db:export-pricing` to export current database state back to this file
 *
 * Type Safety / 类型安全:
 * Types are derived from database schema (lib/db/schema.ts).
 * If schema changes, TypeScript will catch any mismatches.
 * 类型从数据库 schema 推导，如果 schema 变更，TypeScript 会捕获不匹配的错误。
 *
 * Auto-generated at: 2025-12-30T04:02:42.809Z
 */

import type { InferInsertModel } from 'drizzle-orm'
import { pricingPlanGroups as pricingPlanGroupsTable, pricingPlans as pricingPlansTable } from '../schema'

// ============================================================================
// Type Definitions - Derived from Schema / 类型定义 - 从 Schema 推导
// ============================================================================

/**
 * Pricing Plan Config type derived from database schema.
 * Omit auto-generated fields (createdAt, updatedAt).
 *
 * 从数据库 schema 推导的定价计划配置类型。
 * 排除自动生成的字段（createdAt, updatedAt）。
 */
export type PricingPlanConfig = Omit<
  InferInsertModel<typeof pricingPlansTable>,
  'createdAt' | 'updatedAt'
>

/**
 * Pricing Group Config type derived from database schema.
 *
 * 从数据库 schema 推导的定价分组配置类型。
 */
export type PricingGroupConfig = Omit<
  InferInsertModel<typeof pricingPlanGroupsTable>,
  'createdAt'
>

// ============================================================================
// Helper Types for JSONB Fields / JSONB 字段的辅助类型
// ============================================================================

/**
 * Feature item structure for the features JSONB field.
 * 功能项结构，用于 features JSONB 字段。
 */
export interface PricingFeature {
  description: string
  included: boolean
  bold?: boolean
  href?: string
}

/**
 * Localized content structure for langJsonb field.
 * 多语言内容结构，用于 langJsonb 字段。
 */
export interface LocalizedPricingContent {
  cardTitle?: string
  cardDescription?: string
  displayPrice?: string
  originalPrice?: string
  priceSuffix?: string
  highlightText?: string
  buttonText?: string
  currency?: string
  features?: PricingFeature[]
}

/**
 * Benefits structure for benefitsJsonb field.
 * 权益结构，用于 benefitsJsonb 字段。
 */
export interface PricingBenefits {
  /** One-time credits granted on purchase / 购买时授予的一次性积分 */
  oneTimeCredits?: number
  /** Monthly credits for subscriptions / 订阅的月度积分 */
  monthlyCredits?: number
  /** Total months for yearly plans / 年度计划的总月数 */
  totalMonths?: number
  /** Custom fields / 自定义字段 */
  [key: string]: unknown
}

// ============================================================================
// Pricing Groups / 定价分组
// ============================================================================

export const pricingGroups: PricingGroupConfig[] = [
  { slug: 'default' },
  { slug: 'monthly' },
  { slug: 'onetime' },
  { slug: 'no-payment' },
  { slug: 'annual' },
]

// ============================================================================
// Pricing Plans / 定价计划
// ============================================================================

export const pricingPlans: PricingPlanConfig[] = [
  // ==========================================================================
  // Annual Plans
  // ==========================================================================
  {
    id: 'annual-standard',
    environment: 'live',
    groupSlug: 'annual',
    cardTitle: 'Standard',
    cardDescription: 'For individuals just getting started.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'year',
    price: '118.80',
    currency: 'USD',
    displayPrice: '$9.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '1,600 Credits / month' },
      { included: true, description: 'Standard Queue' },
      { included: true, description: 'Commercial Use' },
    ],
    isHighlighted: false,
    buttonText: 'Subscribe',
    displayOrder: 1,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Standard',
        cardDescription: 'For individuals just getting started.',
        displayPrice: '$9.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '1,600 Credits / month' },
          { included: true, description: 'Standard Queue' },
          { included: true, description: 'Commercial Use' },
        ],
        buttonText: 'Subscribe',
      },
      zh: {
        cardTitle: '标准版',
        cardDescription: '适合刚刚起步的个人。',
        displayPrice: '$9.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 1,600 积分' },
          { included: true, description: '标准队列' },
          { included: true, description: '商业用途' },
        ],
        buttonText: '订阅',
      },
      ja: {
        cardTitle: 'スタンダード',
        cardDescription: 'これから始める個人向け。',
        displayPrice: '$9.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 1,600 クレジット' },
          { included: true, description: '標準キュー' },
          { included: true, description: '商用利用' },
        ],
        buttonText: '購読する',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 1600,
      totalMonths: 12,
    },
  },
  {
    id: 'annual-pro',
    environment: 'live',
    groupSlug: 'annual',
    cardTitle: 'Pro',
    cardDescription: 'For creators who need more power.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'year',
    price: '358.80',
    currency: 'USD',
    displayPrice: '$29.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '5,400 Credits / month' },
      { included: true, description: 'Fast Generation Queue' },
      { included: true, description: 'Priority Support' },
    ],
    isHighlighted: true,
    highlightText: 'Most Popular',
    buttonText: 'Subscribe',
    displayOrder: 2,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Pro',
        cardDescription: 'For creators who need more power.',
        displayPrice: '$29.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '5,400 Credits / month' },
          { included: true, description: 'Fast Generation Queue' },
          { included: true, description: 'Priority Support' },
        ],
        buttonText: 'Subscribe',
        highlightText: 'Most Popular',
      },
      zh: {
        cardTitle: '专业版',
        cardDescription: '适合需要更多功能的创作者。',
        displayPrice: '$29.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 5,400 积分' },
          { included: true, description: '快速生成队列' },
          { included: true, description: '优先支持' },
        ],
        buttonText: '订阅',
        highlightText: '最受欢迎',
      },
      ja: {
        cardTitle: 'プロ',
        cardDescription: 'より多くの機能を必要とするクリエイター向け。',
        displayPrice: '$29.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 5,400 クレジット' },
          { included: true, description: '高速生成キュー' },
          { included: true, description: '優先サポート' },
        ],
        buttonText: '購読する',
        highlightText: '一番人気',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 5400,
      totalMonths: 12,
    },
  },
  {
    id: 'annual-max',
    environment: 'live',
    groupSlug: 'annual',
    cardTitle: 'Max',
    cardDescription: 'For studios and professionals.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'year',
    price: '958.80',
    currency: 'USD',
    displayPrice: '$79.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '16,000 Credits / month' },
      { included: true, description: 'Instant Queue' },
      { included: true, description: 'API Access' },
    ],
    isHighlighted: false,
    buttonText: 'Subscribe',
    displayOrder: 3,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Max',
        cardDescription: 'For studios and professionals.',
        displayPrice: '$79.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '16,000 Credits / month' },
          { included: true, description: 'Instant Queue' },
          { included: true, description: 'API Access' },
        ],
        buttonText: 'Subscribe',
      },
      zh: {
        cardTitle: '终极版',
        cardDescription: '适合工作室和专业人士。',
        displayPrice: '$79.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 16,000 积分' },
          { included: true, description: '即时队列' },
          { included: true, description: 'API 访问' },
        ],
        buttonText: '订阅',
      },
      ja: {
        cardTitle: 'マックス',
        cardDescription: 'スタジオや専門家向け。',
        displayPrice: '$79.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 16,000 クレジット' },
          { included: true, description: '即時キュー' },
          { included: true, description: 'APIアクセス' },
        ],
        buttonText: '購読する',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 16000,
      totalMonths: 12,
    },
  },

  // ==========================================================================
  // Monthly Plans
  // ==========================================================================
  {
    id: 'monthly-standard',
    environment: 'live',
    groupSlug: 'monthly',
    cardTitle: 'Standard',
    cardDescription: 'For individuals just getting started.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'month',
    price: '19.90',
    currency: 'USD',
    displayPrice: '$19.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '2,800 Credits / month' },
      { included: true, description: 'Standard Queue' },
      { included: true, description: 'Commercial Use' },
    ],
    isHighlighted: false,
    buttonText: 'Subscribe',
    displayOrder: 1,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Standard',
        cardDescription: 'For individuals just getting started.',
        displayPrice: '$19.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '2,800 Credits / month' },
          { included: true, description: 'Standard Queue' },
          { included: true, description: 'Commercial Use' },
        ],
        buttonText: 'Subscribe',
      },
      zh: {
        cardTitle: '标准版',
        cardDescription: '适合刚刚起步的个人。',
        displayPrice: '$19.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 2,800 积分' },
          { included: true, description: '标准队列' },
          { included: true, description: '商业用途' },
        ],
        buttonText: '订阅',
      },
      ja: {
        cardTitle: 'スタンダード',
        cardDescription: 'これから始める個人向け。',
        displayPrice: '$19.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 2,800 クレジット' },
          { included: true, description: '標準キュー' },
          { included: true, description: '商用利用' },
        ],
        buttonText: '購読する',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 2800,
      totalMonths: 1,
    },
  },
  {
    id: 'monthly-pro',
    environment: 'live',
    groupSlug: 'monthly',
    cardTitle: 'Pro',
    cardDescription: 'For creators who need more power.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'month',
    price: '59.90',
    currency: 'USD',
    displayPrice: '$59.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '9,600 Credits / month' },
      { included: true, description: 'Fast Generation Queue' },
      { included: true, description: 'Priority Support' },
    ],
    isHighlighted: true,
    highlightText: 'Most Popular',
    buttonText: 'Subscribe',
    displayOrder: 2,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Pro',
        cardDescription: 'For creators who need more power.',
        displayPrice: '$59.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '9,600 Credits / month' },
          { included: true, description: 'Fast Generation Queue' },
          { included: true, description: 'Priority Support' },
        ],
        buttonText: 'Subscribe',
        highlightText: 'Most Popular',
      },
      zh: {
        cardTitle: '专业版',
        cardDescription: '适合需要更多功能的创作者。',
        displayPrice: '$59.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 9,600 积分' },
          { included: true, description: '快速生成队列' },
          { included: true, description: '优先支持' },
        ],
        buttonText: '订阅',
        highlightText: '最受欢迎',
      },
      ja: {
        cardTitle: 'プロ',
        cardDescription: 'より多くの機能を必要とするクリエイター向け。',
        displayPrice: '$59.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 9,600 クレジット' },
          { included: true, description: '高速生成キュー' },
          { included: true, description: '優先サポート' },
        ],
        buttonText: '購読する',
        highlightText: '一番人気',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 9600,
      totalMonths: 1,
    },
  },
  {
    id: 'monthly-max',
    environment: 'live',
    groupSlug: 'monthly',
    cardTitle: 'Max',
    cardDescription: 'For studios and professionals.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'recurring',
    recurringInterval: 'month',
    price: '149.90',
    currency: 'USD',
    displayPrice: '$149.90',
    priceSuffix: '/mo',
    features: [
      { included: true, description: '27,000 Credits / month' },
      { included: true, description: 'Instant Queue' },
      { included: true, description: 'API Access' },
    ],
    isHighlighted: false,
    buttonText: 'Subscribe',
    displayOrder: 3,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Max',
        cardDescription: 'For studios and professionals.',
        displayPrice: '$149.90',
        priceSuffix: '/mo',
        features: [
          { included: true, description: '27,000 Credits / month' },
          { included: true, description: 'Instant Queue' },
          { included: true, description: 'API Access' },
        ],
        buttonText: 'Subscribe',
      },
      zh: {
        cardTitle: '终极版',
        cardDescription: '适合工作室和专业人士。',
        displayPrice: '$149.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '每月 27,000 积分' },
          { included: true, description: '即时队列' },
          { included: true, description: 'API 访问' },
        ],
        buttonText: '订阅',
      },
      ja: {
        cardTitle: 'マックス',
        cardDescription: 'スタジオや専門家向け。',
        displayPrice: '$149.90',
        priceSuffix: '/月',
        features: [
          { included: true, description: '毎月 27,000 クレジット' },
          { included: true, description: '即時キュー' },
          { included: true, description: 'APIアクセス' },
        ],
        buttonText: '購読する',
      },
    },
    benefitsJsonb: {
      monthlyCredits: 27000,
      totalMonths: 1,
    },
  },

  // ==========================================================================
  // One-Time Plans
  // ==========================================================================
  {
    id: 'onetime-standard',
    environment: 'live',
    groupSlug: 'onetime',
    cardTitle: 'Standard Pack',
    cardDescription: 'Perfect for trying out.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'one_time',
    recurringInterval: null,
    price: '9.90',
    currency: 'USD',
    displayPrice: '$9.90',
    priceSuffix: '',
    features: [
      { included: true, description: '1,000 Credits' },
      { included: true, description: 'Never expire' },
    ],
    isHighlighted: false,
    buttonText: 'Buy Now',
    displayOrder: 1,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Standard Pack',
        cardDescription: 'Perfect for trying out.',
        displayPrice: '$9.90',
        features: [
          { included: true, description: '1,000 Credits' },
          { included: true, description: 'Never expire' },
        ],
        buttonText: 'Buy Now',
      },
      zh: {
        cardTitle: '标准包',
        cardDescription: '适合尝试。',
        displayPrice: '$9.90',
        features: [
          { included: true, description: '1,000 积分' },
          { included: true, description: '永不过期' },
        ],
        buttonText: '立即购买',
      },
      ja: {
        cardTitle: 'スタンダードパック',
        cardDescription: 'お試しに最適。',
        displayPrice: '$9.90',
        features: [
          { included: true, description: '1,000 クレジット' },
          { included: true, description: '有効期限なし' },
        ],
        buttonText: '今すぐ購入',
      },
    },
    benefitsJsonb: {
      oneTimeCredits: 1000,
    },
  },
  {
    id: 'onetime-pro',
    environment: 'live',
    groupSlug: 'onetime',
    cardTitle: 'Pro Pack',
    cardDescription: 'Most popular choice.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'one_time',
    recurringInterval: null,
    price: '29.90',
    currency: 'USD',
    displayPrice: '$29.90',
    priceSuffix: '',
    features: [
      { included: true, description: '3,750 Credits' },
      { included: true, description: 'Never expire' },
      { included: true, description: 'Priority Generation' },
    ],
    isHighlighted: true,
    highlightText: 'Best Value',
    buttonText: 'Buy Now',
    displayOrder: 2,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Pro Pack',
        cardDescription: 'Most popular choice.',
        displayPrice: '$29.90',
        features: [
          { included: true, description: '3,750 Credits' },
          { included: true, description: 'Never expire' },
          { included: true, description: 'Priority Generation' },
        ],
        buttonText: 'Buy Now',
        highlightText: 'Best Value',
      },
      zh: {
        cardTitle: '专业包',
        cardDescription: '最受欢迎的选择。',
        displayPrice: '$29.90',
        features: [
          { included: true, description: '3,750 积分' },
          { included: true, description: '永不过期' },
          { included: true, description: '优先生成' },
        ],
        buttonText: '立即购买',
        highlightText: '超值推荐',
      },
      ja: {
        cardTitle: 'プロパック',
        cardDescription: '一番人気の選択。',
        displayPrice: '$29.90',
        features: [
          { included: true, description: '3,750 クレジット' },
          { included: true, description: '有効期限なし' },
          { included: true, description: '優先生成' },
        ],
        buttonText: '今すぐ購入',
        highlightText: 'ベストバリュー',
      },
    },
    benefitsJsonb: {
      oneTimeCredits: 3750,
    },
  },
  {
    id: 'onetime-max',
    environment: 'live',
    groupSlug: 'onetime',
    cardTitle: 'Max Pack',
    cardDescription: 'For heavy users.',
    provider: 'stripe',
    stripePriceId: 'TODO_UPDATE_STRIPE_PRICE_ID',
    stripeProductId: 'TODO_UPDATE_STRIPE_PRODUCT_ID',
    paymentType: 'one_time',
    recurringInterval: null,
    price: '79.90',
    currency: 'USD',
    displayPrice: '$79.90',
    priceSuffix: '',
    features: [
      { included: true, description: '12,000 Credits' },
      { included: true, description: 'Never expire' },
      { included: true, description: 'Priority Generation' },
    ],
    isHighlighted: false,
    buttonText: 'Buy Now',
    displayOrder: 3,
    isActive: true,
    langJsonb: {
      en: {
        cardTitle: 'Max Pack',
        cardDescription: 'For heavy users.',
        displayPrice: '$79.90',
        features: [
          { included: true, description: '12,000 Credits' },
          { included: true, description: 'Never expire' },
          { included: true, description: 'Priority Generation' },
        ],
        buttonText: 'Buy Now',
      },
      zh: {
        cardTitle: '终极包',
        cardDescription: '适合重度用户。',
        displayPrice: '$79.90',
        features: [
          { included: true, description: '12,000 积分' },
          { included: true, description: '永不过期' },
          { included: true, description: '优先生成' },
        ],
        buttonText: '立即购买',
      },
      ja: {
        cardTitle: 'マックスパック',
        cardDescription: 'ヘビーユーザー向け。',
        displayPrice: '$79.90',
        features: [
          { included: true, description: '12,000 クレジット' },
          { included: true, description: '有効期限なし' },
          { included: true, description: '優先生成' },
        ],
        buttonText: '今すぐ購入',
      },
    },
    benefitsJsonb: {
      oneTimeCredits: 12000,
    },
  },
]
