---
name: create-new-site
description: Use when creating a new product site from a copied NEXTY.DEV template. Keeps the original quick-start workflow, then adds Product Hunt copy, template-aware homepage updates, legal policy pages, content marketing pages, database env setup, pricing seed updates, and final cleanup.
---

# NEXTY Quick Start - Product Customization

Quickly transform the NEXTY.DEV template into a customized product by collecting product information and generating all necessary content.

## Overview

This skill guides the developer through customizing the template for their specific product. It modifies:

1. **Site Configuration** (`config/site.ts`) - Product name, author, social links
2. **SEO & Branding** (`i18n/messages/*/common.json`) - Title, tagline, description
3. **Active Homepage Template** (`i18n/messages/*/{ActiveTemplate}.json`) - Hero, Features, FAQ, CTA, and current template copy
4. **Navigation** (`i18n/messages/*/common.json`) - Header links, Footer links
5. **Product Hunt Copy Package** - Title, Description, Short Description, Long Description, Tagline, Slogan, Categories, Tags
6. **Legal Policy Pages** - `/privacy-policy`, `/terms-of-service`, `/refund-policy`
7. **Content Marketing Pages** - `/prompts`, `/showcase`, `/blog`, `/alternatives`, `/compare`, `/templates`, `/use-cases`
8. **LLM Site Files** - `public/llms.txt`, `public/llms-full.txt`
9. **Database Setup** - PostgreSQL SQL, `DATABASE_URL`, `.env`, `.env.local`
10. **Pricing Seed Data** - `lib/db/seed/pricing-config.ts`, provider ID cleanup, `pnpm db:seed`
11. **Incremental Missed Content Pass** - Only fill missed content after a new-site rewrite, without redoing homepage, Pricing, API, Legal, or About.

## Global Safety Rules

- Do not modify configuration files such as `.env` or `.env.local` unless the user explicitly asks for that exact change. If database setup is requested, confirm before editing env files.
- Do not modify resource asset URLs for images, videos, posters, CDN files, or demo media unless the user explicitly provides replacements or asks to change assets.
- Preserve Header and Footer menus as much as possible. Only change navigation when a link is clearly wrong for the new product, points to an old product/domain, or the user asks for navigation changes.
- Homepage FAQ should contain 12 questions when the active template supports FAQ items. If the template supports fewer fixed slots, fill the supported slots and note the limitation.
- Keep `new_site.md` as the running output ledger for the whole workflow. Every phase must write its generated materials, decisions, skipped items, and verification results to `new_site.md`; do not wait until final cleanup.
- When the user asks for a missed-content or incremental pass, do not redo already updated homepage, Pricing, API, Legal, About, database, payment, model, or asset work unless explicitly requested.

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Information Gathering                                 │
│  - Product name                                                 │
│  - Target audience & business description                       │
│  - Key features (3-5)                                           │
│  - Social media links (optional)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Market Research & SEO Discovery  ★ CRITICAL          │
│  - Search: What problems does this product solve?               │
│  - Search: What keywords do users search for this need?         │
│  - Search: How do competitors describe similar products?        │
│  - For each language: Research local search terms & user needs  │
│  ★ Use WebSearch tool to gather real market data                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Content Generation & Review                           │
│  - Generate SEO content based on research findings              │
│  - Generate Hero section with validated keywords                │
│  - Generate Features addressing real user pain points           │
│  - Generate FAQ from actual user questions                      │
│  - Generate CTA section                                         │
│  ★ CHECKPOINT: Present content for review before proceeding     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Navigation Configuration                              │
│  - Analyze current Header links                                 │
│  - Analyze current Footer links                                 │
│  ★ CHECKPOINT: Confirm Header/Footer changes (add/remove/keep)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Apply Changes                                         │
│  - Update config/site.ts                                        │
│  - Update i18n/messages/en/common.json                          │
│  - Update i18n/messages/zh/common.json                          │
│  - Update i18n/messages/ja/common.json                          │
│  - Detect active homepage template                              │
│  - Update i18n/messages/en/{ActiveTemplate}.json                │
│  - Update i18n/messages/zh/{ActiveTemplate}.json                │
│  - Update i18n/messages/ja/{ActiveTemplate}.json                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 6: Product Hunt Copy Package                             │
│  - Generate launch copy fields                                  │
│  - Confirm title/description/tagline/categories/tags             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 7: Legal Policy Pages Update                             │
│  - Update privacy-policy / terms-of-service / refund-policy      │
│  - Preserve legal structure and avoid invented company facts     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 8: Content Marketing Pages And SEO Update                 │
│  - Update prompts/showcase/blog/alternatives/compare/templates   │
│  - Update use-cases and page SEO from real routes/content        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 9: LLM Site Files                                        │
│  - Generate public/llms.txt and public/llms-full.txt             │
│  - Use configured locales and real public links only             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 10: Database Provision SQL And Env Update                 │
│  - Generate PostgreSQL SQL and DATABASE_URL                      │
│  - Edit .env/.env.local only when explicitly confirmed           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 11: Pricing Seed Content Update                          │
│  - Update pricing-config.ts copy and clear provider IDs          │
│  - Run pnpm db:seed when database env is ready                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 12: Final Cleanup                                        │
│  - Search old brand/domain/email/keywords                        │
│  - Create or update new_site.md and run verification             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Optional Phase 13: Incremental Missed Content Pass             │
│  - Only check requested missed areas after a site rewrite        │
│  - Do not redo homepage/Pricing/API/Legal/About blocks           │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Information Gathering

Collect information **one question at a time**. Use follow-up questions if answers are unclear.

### Required Information

1. **Product Name**
   - "What is your product name?"
   - Example: "CloudSync", "AIWriter", "DevTools Pro"

2. **Business Description**
   - "Describe your product in 1-2 sentences. What does it do and who is it for?"
   - Example: "An AI-powered writing assistant for content creators and marketers"

3. **Key Features** (3-5 features)
   - "What are the 3-5 main features of your product?"
   - For each feature: title + brief description
   - Example: "AI Writing - Generate blog posts in seconds"

4. **Target Audience**
   - "Who is your primary target audience?"
   - Example: "Solo developers", "Marketing teams", "Small businesses"

### Optional Information

5. **Social Media Links**
   - "Do you have any social media links to add? (GitHub, Twitter/X, Discord, YouTube, etc.)"
   - Skip if not provided - existing placeholder values will remain

6. **Author/Creator Info**
   - "What name should appear as the author/creator?"
   - Default: Use product name if not provided

## Phase 2: Market Research & SEO Discovery

**CRITICAL: Do not skip this phase. SEO without research is guesswork.**

Before generating any content, use WebSearch to understand:
1. What real users are searching for
2. What problems they're trying to solve
3. How competitors position similar products
4. Language-specific search patterns

### 2.1 Problem & Need Research

Search to understand the user's pain points:

```
WebSearch queries (adapt based on product type):
- "{product category} problems"
- "why do people need {product type}"
- "{target audience} challenges with {problem area}"
- "best {product category} for {use case}"
```

**Goal:** Identify 3-5 real pain points your product solves.

### 2.2 Keyword Research by Language

For each language, search for actual user queries:

#### English Keywords
```
WebSearch queries:
- "{product category} software"
- "best {product type} tools"
- "{use case} solution"
- "{product category} for {audience}"
```

#### Chinese Keywords (中文关键词)
```
WebSearch queries:
- "{产品类别} 工具推荐"
- "{产品类别} 哪个好"
- "{使用场景} 解决方案"
- "{产品类别} 软件"
```

#### Japanese Keywords (日本語キーワード)
```
WebSearch queries:
- "{製品カテゴリ} おすすめ"
- "{製品カテゴリ} ツール"
- "{ユースケース} 効率化"
- "{製品タイプ} 比較"
```

### 2.3 Competitor Analysis

Search for how competitors describe their products:

```
WebSearch queries:
- "top {product category} tools 2024"
- "{competitor name} vs alternatives"
- "{product category} comparison"
```

**Extract from competitors:**
- Common value propositions
- Frequently used keywords
- How they describe features
- Their taglines and headlines

### 2.4 User Intent Analysis

Understand what users actually want to achieve:

```
WebSearch queries:
- "how to {solve problem that product addresses}"
- "{target audience} workflow {product area}"
- "{product category} use cases"
```

### 2.5 Research Summary Template

After research, document findings before content generation:

```markdown
## SEO Research Findings

### User Pain Points Discovered:
1. {Pain point 1} - from search: "{query}"
2. {Pain point 2} - from search: "{query}"
3. {Pain point 3} - from search: "{query}"

### High-Value Keywords by Language:

| English | Chinese | Japanese | Search Intent |
|---------|---------|----------|---------------|
| {keyword} | {关键词} | {キーワード} | {what users want} |
| {keyword} | {关键词} | {キーワード} | {what users want} |

### Competitor Insights:
- Common positioning: {how competitors describe products}
- Gaps we can fill: {what competitors don't emphasize}

### Content Strategy:
- Primary message: {address pain point 1}
- Keywords to include: {list}
- User benefit to emphasize: {what they achieve}
```

### Research Examples

**Example: AI Writing Tool**

Before researching:
- ❌ Guessing tagline: "AI-powered content creation"

After researching:
- Search "AI writing tool problems" → Users complain about generic content
- Search "AI写作工具" → Chinese users search "AI写作助手 免费"
- Search "AIライティング おすすめ" → Japanese users want "文章作成 効率化"

Result:
- ✅ EN: "Create content that sounds like you, not a robot"
- ✅ ZH: "AI写作助手 - 告别千篇一律的AI味文案"
- ✅ JA: "あなたらしい文章を、AIがサポート"

**Example: SaaS Boilerplate**

Before researching:
- ❌ Guessing: "Build apps faster"

After researching:
- Search "SaaS boilerplate" → Users want "production-ready", "save weeks"
- Search "Next.js 模板" → Chinese devs search "Next.js SaaS 脚手架"
- Search "SaaS テンプレート" → Japanese devs search "開発効率化"

Result:
- ✅ EN: "Ship your SaaS in days, not months"
- ✅ ZH: "省下3个月开发时间，专注你的核心业务"
- ✅ JA: "開発期間を大幅短縮、すぐにローンチ"

## Phase 3: Content Generation

Based on collected information AND research findings, generate content for all sections. 

**Key principle:** Every piece of content must be informed by the research in Phase 2. Don't generate content that ignores the discovered keywords, pain points, and user intent.

### Content to Generate

#### 3.1 SEO Metadata (Home section in common.json)

```json
{
  "Home": {
    "title": "{Product Name}",
    "tagLine": "{Short compelling tagline in target language}",
    "description": "{2-3 sentence description for SEO}"
  }
}
```

#### 3.2 Hero Section (Landing.json)

```json
{
  "Hero": {
    "badge": { "label": "NEW", "text": "{Category or highlight}", "href": "/#pricing" },
    "title": "{Main headline}",
    "description": "{Compelling description}",
    "getStarted": "{CTA text}",
    "getStartedLink": "/#pricing",
    "viewDocs": "{Secondary CTA}",
    "viewDocsLink": "/docs"
  }
}
```

#### 3.3 Features Section (Landing.json)

Transform the 3-5 features into detailed feature cards with:
- Title
- Description
- 2-3 detail points
- Placeholder for images (keep existing image paths or use placeholders)

#### 3.4 FAQ Section (Landing.json)

Generate 12 FAQs based on:
- Common questions about the product type
- Pricing/payment questions
- Feature-related questions
- Support/onboarding questions

If the active homepage template has a fixed FAQ structure that cannot render 12 items, keep the existing supported structure and note the limitation in `new_site.md`.

#### 3.5 CTA Section (Landing.json)

```json
{
  "CTA": {
    "title": "{Compelling call to action title}",
    "description": "{Why they should act now}",
    "button": "{Button text}",
    "trustText": "{Social proof text}",
    "features": {
      "feature1": "{Key benefit 1}",
      "feature2": "{Key benefit 2}",
      "feature3": "{Key benefit 3}",
      "feature4": "{Key benefit 4}"
    }
  }
}
```

### CHECKPOINT: Content Review

Before proceeding, present all generated content in a clear format:

```markdown
## Generated Content Preview

### SEO & Branding
- **Title:** {value}
- **Tagline:** {value}
- **Description:** {value}

### Hero Section
- **Headline:** {value}
- **Description:** {value}

### Features
1. {Feature 1 title} - {brief description}
2. {Feature 2 title} - {brief description}
...

### FAQ (showing first 3)
1. Q: {question}
   A: {answer}
...

Does this content look correct? (Y to proceed, or provide specific changes)
```

## Phase 4: Navigation Configuration

Default policy: keep Header and Footer mostly unchanged. Only recommend changes when links are clearly inappropriate for the new product, still point to the old product/domain, or the user explicitly asks for menu changes.

### Header Links Analysis

Read current Header links from `common.json` and present options:

```markdown
## Current Header Links:
1. Features (/#features) - ✓ KEEP (standard)
2. Pricing (/#pricing) - ✓ KEEP (standard)
3. AI Demo (/ai-demo) - ❓ Your product related?
4. Blog (/blog) - ✓ KEEP (content marketing)
5. Demo (dropdown) - ❓ Remove or customize?

For each link, choose:
- KEEP: Keep as-is
- UPDATE: Update name/href
- REMOVE: Remove from navigation
- ADD: Add new link

Which links should I modify?
```

### Footer Links Analysis

```markdown
## Current Footer Link Groups:

### Group 1: Products
- Features, Pricing, Blog, Glossary

### Group 2: Support
- Docs, Roadmap

### Group 3: Languages
- English, 中文, 日本語 (auto-handled)

Should I update the Products or Support links?
```

### CHECKPOINT: Navigation Confirmation

Present the final navigation structure before applying:

```markdown
## Proposed Navigation Changes

### Header:
[List final header structure]

### Footer:
[List final footer structure]

Confirm these changes? (Y/N)
```

## Phase 5: Apply Changes

Once all content is confirmed, apply changes to files.

### Active Homepage Template Rule

Do not assume the homepage uses `Landing.json`.

Before updating homepage copy:

1. Inspect the active route, usually `app/[locale]/page.tsx` or the current homepage route.
2. Check imported homepage components and `useTranslations(...)` namespaces.
3. Identify the active message file for each locale, such as `Landing.json`, `HomeTemplate1.json`, `ImageTemplate.json`, `VideoTemplate.json`, `Seedance15.json`, or a custom template file.
4. Read the active JSON structure before editing.
5. Preserve existing field names, nesting, arrays, image fields, link fields, form fields, and component-supported fields.
6. Update only content fields that the current template actually uses.
7. Do not add unsupported FAQ, CTA, Features, or other sections unless the component can render them or the user explicitly approves adding support.

### Files to Update

| File | Changes |
|------|---------|
| `config/site.ts` | name, authors, socialLinks |
| `i18n/messages/en/common.json` | Home, Header, Footer |
| `i18n/messages/zh/common.json` | Home, Header, Footer (translated) |
| `i18n/messages/ja/common.json` | Home, Header, Footer (translated) |
| `i18n/messages/en/{ActiveTemplate}.json` | Active homepage template copy |
| `i18n/messages/zh/{ActiveTemplate}.json` | Active homepage template copy (localized) |
| `i18n/messages/ja/{ActiveTemplate}.json` | Active homepage template copy (localized) |

### Localization & SEO Guidelines

**CRITICAL: Generate native-quality content, NOT translations.**

Each language version must read as if written by a native speaker for that market. Avoid word-for-word translation—adapt for cultural context, natural expression, and local SEO.

#### English (en)
- **Tone:** Direct, action-oriented, benefit-focused
- **SEO Keywords:** Use high-search-volume terms natural to English speakers
- **CTA Style:** Imperative verbs ("Get Started", "Try Free", "Build Now")
- **Description:** Concise, scannable, front-load key benefits

#### Chinese (zh-CN)
- **Use:** 简体中文 (Simplified Chinese)
- **Tone:** 专业但亲和，避免过于正式或机械的表达
- **表达习惯:**
  - 避免直译，使用符合中文表达的句式
  - ❌ "构建应用程序在几天内而不是几个月" (直译)
  - ✅ "几天上线，而非数月等待" (本土化)
  - ❌ "获取开始" (Get Started 直译)
  - ✅ "立即开始" 或 "免费试用"
- **SEO 优化:**
  - 使用中国用户常用的搜索词
  - 标题控制在 30 字以内
  - 描述控制在 150 字以内，包含核心关键词
  - 考虑百度 SEO 习惯，关键词靠前
- **技术术语:**
  - API、SaaS、SDK 保持英文
  - Dashboard → 仪表盘 / 控制台
  - Authentication → 身份认证
  - Subscription → 订阅

#### Japanese (ja)
- **Use:** です/ます form (敬語) for user-facing content
- **Tone:** 丁寧で親しみやすい、過度にカジュアルにならない
- **表達習慣:**
  - 直訳を避け、日本語として自然な表現を使用
  - ❌ "あなたのビジネスを変革する準備ができていますか？" (直訳調)
  - ✅ "ビジネスの成長を加速させませんか？" (自然な日本語)
  - ❌ "開始する" (Get Started 直訳)
  - ✅ "今すぐ始める" または "無料で試す"
- **SEO 最適化:**
  - 日本のユーザーが検索するキーワードを使用
  - タイトルは32文字以内（Google表示上限）
  - ディスクリプションは120文字程度
  - 重要なキーワードを文頭に配置
- **技術用語:**
  - API、SaaS、SDK は英語のまま
  - Dashboard → ダッシュボード
  - Authentication → 認証
  - Subscription → サブスクリプション

#### Common Localization Mistakes to Avoid

| Mistake | Example | Fix |
|---------|---------|-----|
| Literal translation | ZH: "一站式商店" (one-stop shop) | ZH: "一站式解决方案" |
| Unnatural word order | JA: "高速で、安全で、信頼性があります" | JA: "高速・安全・信頼性の高い" |
| Ignoring cultural context | Using "10x" claims in JP | Use more modest claims in JP |
| Wrong formality level | Using casual JP for business | Use です/ます form |
| Keyword stuffing | Repeating same keyword | Use semantic variations |

#### SEO Content Length Guidelines

| Element | English | Chinese | Japanese |
|---------|---------|---------|----------|
| Title (meta) | 50-60 chars | 25-30 chars | 28-32 chars |
| Tagline | 60-80 chars | 30-40 chars | 35-45 chars |
| Description (meta) | 150-160 chars | 120-150 chars | 100-120 chars |
| H1 Headline | 6-12 words | 10-20 chars | 15-25 chars |

### Update Order

1. Update `config/site.ts` first (base configuration)
2. Update English files (source content)
3. Update Chinese translations
4. Update Japanese translations

## Common Scenarios

### Scenario: Developer wants minimal changes
- Only update product name and description
- Keep existing Header/Footer structure
- Skip optional sections

### Scenario: Complete rebranding
- Update all product information
- Customize Header/Footer completely
- Update social media links
- Regenerate all landing page content

### Scenario: Keeping some template content
- Some features from NEXTY template may still apply
- Mark sections to keep vs replace
- Merge new features with existing ones

## File Reference

### config/site.ts Structure

```typescript
export const siteConfig: SiteConfig = {
  name: "ProductName",
  url: BASE_URL,
  authors: [{ name: "AuthorName", url: BASE_URL }],
  creator: '@handle',
  socialLinks: {
    github: 'https://github.com/...',
    twitter: 'https://twitter.com/...',
    discord: 'https://discord.gg/...',
    // ...
  },
  // ... rest remains unchanged
}
```

### common.json Key Sections

```json
{
  "Home": { "title", "tagLine", "description" },
  "Header": { "links": [...] },
  "Footer": { "Copyright", "Links": { "groups": [...] } }
}
```

### Active Homepage Template Key Sections

```json
{
  "Hero": { "badge", "title", "description", "getStarted", "viewDocs" },
  "Features": { "badge", "title", "description", "items": [...] },
  "UseCases": { ... },
  "FAQ": { "title", "description", "items": [...] },
  "CTA": { "title", "description", "button", "features" }
}
```

## Create-New-Site Production Phases

Phases 6-12 are part of the main `create-new-site` workflow. Do not stop at Phase 5 when creating or initializing a real new site. Continue through final cleanup unless the user explicitly asks to stop earlier or a required confirmation/input is missing.

### Phase 6: Product Hunt Copy Package

Generate a launch copy package from the latest confirmed product profile and research.

Required fields:

- Title
- Description
- Short Description
- Long Description
- Tagline
- Slogan
- Categories
- Tags

Rules:

- Include the primary keyword naturally.
- Write for Product Hunt-style launch copy: clear, compact, benefit-led.
- Do not keyword-stuff.
- Categories and tags must match actual product capabilities.
- Do not claim unsupported integrations, models, APIs, or providers.
- Write the confirmed Product Hunt copy package to `new_site.md`.

### Phase 7: Legal Policy Pages Update

Update `/privacy-policy`, `/terms-of-service`, and `/refund-policy` based on the latest confirmed product profile.

#### 7.1 Locate Policy Routes

Do not assume fixed file paths. Check:

- `app/[locale]/privacy-policy/**`
- `app/[locale]/terms-of-service/**`
- `app/[locale]/refund-policy/**`
- `content/**`
- `i18n/messages/**`
- MDX / Markdown files
- shared policy components

Identify whether content is hardcoded, loaded from i18n JSON, loaded from MDX/Markdown, or data-driven.

#### 7.2 Read Existing Structure

Preserve section order, heading style, formatting, route behavior, localization pattern, links, and reusable components.

Do not replace the whole legal document unless the user explicitly asks.

#### 7.3 Replace Product-Specific Facts

Update only confirmed facts:

- brand name
- website URL
- support email
- product description
- service type
- account/login model
- billing model
- credit or subscription model
- refund contact method
- effective date / last updated date if already present

Do not invent company legal name, address, tax ID, jurisdiction, phone number, or legal representative.

#### 7.4 Privacy Policy Rules

Adapt wording to actual project behavior:

- login/auth providers
- cookies
- analytics
- payment providers
- email providers
- file uploads
- generated content
- API keys
- user dashboard
- newsletter
- support email

Keep wording generic if exact providers are not configured.

#### 7.5 Terms Of Service Rules

Cover or preserve:

- use of the service
- account responsibility
- acceptable use
- API usage if applicable
- AI-generated content if applicable
- credits/subscriptions if applicable
- service availability
- intellectual property
- prohibited behavior
- termination
- disclaimers
- limitation of liability
- contact email

#### 7.6 Refund Policy Rules

If the product uses credits:

- consumed credits or completed generation tasks are generally non-refundable
- unused credits may be reviewed case by case via support
- failed charges or technical failures can be reviewed

If the product uses subscriptions:

- cancellation affects future renewals
- partial-period refunds only apply if explicitly offered
- billing issues should go through support

If the product uses one-time payments:

- include the refund window only if provided
- otherwise use conservative generic wording and mark it for user confirmation

#### 7.7 Localization

If localized policy content exists, update all active locales consistently. English is the source legal wording; Chinese must be natural Simplified Chinese; Japanese must use natural business Japanese.

#### 7.8 Verification

Verify the three routes still exist, syntax is valid, links point to the new domain or relative routes, no old brand/domain/email remains, and no fake company/legal details were introduced.

### Phase 8: Content Marketing Pages And SEO Update

Update content and SEO for:

- `/prompts`
- `/showcase`
- `/blog`
- `/alternatives`
- `/compare`
- `/templates`
- `/use-cases`

#### 8.1 Locate Active Routes And Sources

Check:

- `app/[locale]/prompts/**`
- `app/[locale]/showcase/**`
- `app/[locale]/blog/**`
- `app/[locale]/alternatives/**`
- `app/[locale]/compare/**`
- `app/[locale]/templates/**`
- `app/[locale]/use-cases/**`
- `i18n/messages/{locale}/Prompts.json`
- `i18n/messages/{locale}/Showcase.json`
- `i18n/messages/{locale}/SeoContent.json`
- `blogs/{locale}/**/*.mdx`
- `docs/posts/**`
- `content/**`
- shared page components
- database/CMS seed files

For each route, identify whether it exists, whether it is static or dynamic, where content comes from, which locale files are active, and where SEO metadata is defined.

#### 8.2 Preserve Existing Structure

Preserve route behavior, JSON schema, MDX frontmatter, heading hierarchy, card/list structures, image fields, slug fields, CTA/link fields, pagination/search/filter behavior, and localization patterns.

Do not add unsupported fields.

#### 8.3 SEO Rules

Generate or update:

- meta title
- meta description
- H1
- intro paragraph
- section headings
- CTA copy
- internal links
- image alt text if fields exist
- FAQ content if supported
- MDX frontmatter if relevant

Use the primary keyword naturally in title, H1, first paragraph, at least one H2, and meta description.

#### 8.4 Route-Specific Rules

`/prompts`: update prompt categories, examples, card descriptions, empty states, and CTA. Prompts must match actual product capabilities.

`/showcase`: update gallery item titles, descriptions, tags, categories, CTA, and image alt text. Do not claim images were generated by the product unless confirmed.

`/blog`: update blog listing SEO, category/tag labels, starter articles, MDX frontmatter, internal links, and old product mentions.

`/alternatives`: research competitors before writing. Use fair comparison wording. Do not fabricate pricing, limits, API features, or model support.

`/compare`: update comparison intro, tables, feature rows, pros/cons, best-fit sections, CTA, and FAQ. Competitor facts require research or user input.

`/templates`: adapt templates to real product workflows only.

`/use-cases`: each use case should include problem, how the product helps, expected outcome, relevant keyword, and CTA.

#### 8.5 Internal Linking

Prefer relative links among homepage, pricing, prompts, showcase, blog, alternatives, compare, templates, use-cases, and API docs if available. Do not link to missing routes or old domains.

#### 8.6 Verification

Verify route existence, current product SEO metadata, valid JSON/MDX/TSX syntax, valid frontmatter, existing internal links, fair competitor claims, complete localized content where locale files exist, and no unsupported feature claims.

### Phase 9: Database Provision SQL And Env Update

### Phase 9: LLM Site Files

Generate `public/llms.txt` and `public/llms-full.txt` for search engines and AI crawlers.

#### 9.1 Read Source Files First

Before writing, read and use these files for site information, route configuration, and public links:

- `config/site.ts`
- `i18n/routing.ts`
- `app/sitemap.ts`
- `components/header/Header.tsx`
- `components/header/HeaderLinks.tsx`
- `components/footer/Footer.tsx`

If needed, also read i18n message files:

- `i18n/messages/en/*.json`
- `i18n/messages/zh/*.json`
- `i18n/messages/ja/*.json`

#### 9.2 Locale Rules

Do not hardcode or guess locales.

Read from `i18n/routing.ts`:

- supported locales from `LOCALES`
- default locale from `DEFAULT_LOCALE`
- locale display names from `LOCALE_NAMES`

Rules:

- Default locale uses root path, for example `https://example.com`.
- Non-default locales use locale prefixes, for example `https://example.com/zh`.
- Do not add languages that are not configured.
- If a locale lacks translated content, fallback to default locale text while keeping the locale URL correct.

#### 9.3 Public Link Rules

Do not invent page links.

Only include public pages that are real and discoverable from project routes, header, footer, or sitemap.

Do not include:

- dashboard
- admin
- auth
- api
- stripe
- private
- webhook
- error pages
- `_next` static asset paths

All links must be absolute URLs using the domain from `siteConfig.url`.

#### 9.4 `public/llms.txt`

Keep this file concise as an LLM site navigation summary.

Requirements:

- Markdown format
- start with `# {site name}`
- one short site description
- list default-language core public pages first
- include localized entry points
- do not expand every localized page
- optional resources section

Recommended structure:

```markdown
# {Site Name}

{One sentence description.}

## Primary Pages

- [Home](https://example.com)
- [Pricing](https://example.com/#pricing)

## Localized Versions

- [English](https://example.com)
- [中文](https://example.com/zh)
- [日本語](https://example.com/ja)

## Resources

- [Blog](https://example.com/blog)
```

#### 9.5 `public/llms-full.txt`

Use this file as a fuller LLM site context file.

Requirements:

- Markdown format
- include site name, overview, target users, core features, primary pages, content resources, contact/social links, and notes for AI assistants
- explain the purpose of each public page
- expand localized page lists
- page titles/descriptions should come from the matching i18n message files when available
- do not use exaggerated marketing language
- do not include unsupported facts
- do not include sensitive information, backend links, internal APIs, or environment values

Recommended structure:

```markdown
# {Site Name}

## Overview

## Core Features

## Primary Pages

## Localized Pages

## Content Resources

## Contact / Social Links

## Notes for AI Assistants
```

#### 9.6 Editing Scope

Keep implementation simple.

Only create or modify:

- `public/llms.txt`
- `public/llms-full.txt`

Do not:

- add routes
- add generation scripts
- add test files
- modify middleware
- extract helper functions
- change business code

#### 9.7 Verification

After generation, verify:

- both files exist in `public/`
- content is Markdown
- only public pages are included
- locale links match `i18n/routing.ts`
- default locale uses root path
- non-default locales use locale prefixes
- links use absolute URLs from `siteConfig.url`
- output mentions deployed access paths: `/llms.txt` and `/llms-full.txt`
- Write generated llms file summaries, included routes, locale source, and deployed access paths to `new_site.md`.

### Phase 10: Database Provision SQL And Env Update

Generate PostgreSQL database creation SQL, generate `DATABASE_URL`, and update `.env` plus `.env.local`.

#### 10.1 Inputs

Required:

- project slug, for example `tikdek`
- database host
- database port

Default naming:

- user: `user_{slug}`
- database: `db_{slug}`

Normalize slug to lowercase, convert hyphens to underscores, and keep only letters, digits, and underscores.

#### 10.2 Password

Generate a random strong password:

- at least 16 characters
- uppercase, lowercase, digits
- prefer alphanumeric to avoid URL encoding issues
- do not reuse example passwords

#### 10.3 SQL Template

```sql
-- 1. 创建新用户（请替换为强密码）
CREATE USER user_tikdek WITH ENCRYPTED PASSWORD 'RANDOM_PASSWORD';

-- 2. 创建新数据库，并将所有者直接指定为刚才创建的新用户
CREATE DATABASE db_tikdek OWNER user_tikdek;

-- 3. 撤销默认 PUBLIC 角色对该数据库的所有权限（这是隔离的核心）
-- 这一步确保了其他普通用户（哪怕是以后创建的用户）无法连接到这个新库
REVOKE ALL PRIVILEGES ON DATABASE db_tikdek FROM PUBLIC;

-- 4. 显式授予新用户对该库的所有权限
-- （注意：因为该用户已经是 Owner，默认就有完整权限，但作为标准化脚本显式声明会更清晰）
GRANT ALL PRIVILEGES ON DATABASE db_tikdek TO user_tikdek;
```

Do not execute SQL automatically unless explicitly requested and admin access is available.

#### 10.4 DATABASE_URL

Generate:

```text
postgresql://user_tikdek:RANDOM_PASSWORD@HOST:PORT/db_tikdek
```

URL-encode the password if it contains reserved URL characters.

Write the generated SQL and DATABASE_URL status to `new_site.md`. If a real password is included, redact it in summary sections unless the user explicitly asks to keep full credentials in the file.

#### 10.5 Env Files

Do not edit `.env` or `.env.local` by default.

Only update `.env` and `.env.local` when the user explicitly asks to modify env files or confirms this checkpoint. If the user only asks to generate SQL/DATABASE_URL, show the output and do not write env files.

If confirmed, update `.env` and `.env.local` if they exist. If the user explicitly requested both files, create missing ones.

Set or replace only:

```env
DATABASE_URL="postgresql://..."
```

Preserve unrelated env values.

#### 10.6 Verification

Verify `.env` and `.env.local` contain the new `DATABASE_URL`, old database names/users are gone, SQL and URL use the same credentials, password is not the example password, and URL syntax is valid.

### Phase 11: Pricing Seed Content Update

Update `lib/db/seed/pricing-config.ts`, clear provider IDs, then run `pnpm db:seed`.

#### 11.1 Locate Pricing Files

Primary file:

- `lib/db/seed/pricing-config.ts`

Also check:

- `lib/db/seed/index.ts`
- `package.json` script `db:seed`

#### 11.2 Read Pricing Structure

Inspect pricing groups, active plans, environment, `groupSlug`, `cardTitle`, `cardDescription`, `features`, `langJsonb`, `benefitsJsonb`, payment type, recurring interval, credits, display order, and highlighted plan.

Preserve plan IDs, groups, prices, credits, billing intervals, and ordering unless the user explicitly asks to change them.

#### 11.3 Update Pricing Copy

Update copy based on the latest product:

- `cardDescription`
- `features[].description`
- `highlightText`
- `buttonText` if needed
- `langJsonb.en`
- `langJsonb.zh`
- `langJsonb.ja`

Remove old product terms such as Seedance, old brand names, and old feature descriptions.

#### 11.4 Clear Provider Product IDs

For every pricing plan, set these fields to `null` if they exist:

```ts
paypalProductId: null
paypalPlanId: null
creemProductId: null
```

Use `null`, not empty strings. Do not run provider sync scripts unless explicitly requested.

#### 11.5 Seed Database

Run:

```bash
pnpm db:seed
```

If `DATABASE_URL` is missing, stop and report that database seeding cannot run until env is configured.

#### 11.6 Verification

Verify `pnpm db:seed` succeeds, no old PayPal/Creem IDs remain, no old product terms remain, localized pricing copy exists, and TypeScript syntax is valid.

### Phase 12: Final Cleanup

Search for old brand, old domain, old email, and old keywords. Verify new brand/domain/email cover core pages. Check JSON, MDX, TSX syntax, internal links, and no fabricated legal/company/competitor/payment details.

Finalize `new_site.md` at the project root. It should already contain phase-by-phase materials; ensure it includes:

- input product profile
- market research summary
- Product Hunt copy package
- SEO title/tagline/description
- active homepage template detected
- homepage sections changed
- policy pages changed
- content marketing pages changed
- llms files changed and deployed paths
- database SQL and DATABASE_URL status; redact password if appropriate
- pricing seed changes and whether `pnpm db:seed` ran
- files modified
- items intentionally not changed, including env files or asset URLs if skipped
- verification commands and results

Run appropriate project verification, usually:

```bash
pnpm lint
pnpm build
```

If verification fails, diagnose the failure before claiming the site is ready.

### Optional Phase 13: Incremental Missed Content Pass

Use this phase when the site has already gone through a new-site rewrite and the user asks to fill only missed content. This phase is intentionally narrow.

Do not redo already updated large content blocks unless the user explicitly asks:

- homepage
- Pricing
- API pages or API route logic
- Legal pages
- About pages
- payment setup
- model configuration

#### 13.1 Partners Copy And Page

Files:

- `i18n/messages/en/Partners.json`
- `i18n/messages/zh/Partners.json`
- `i18n/messages/ja/Partners.json`
- `app/[locale]/(basic-layout)/partners/page.tsx`

Rules:

- Replace old brand name, old domain, and old email with the latest product information.
- Change the partners page fallback support email to `{SUPPORT_EMAIL}`.
- Preserve page logic.
- Only edit copy and default values.

#### 13.2 SEO Content Copy And Seed Content

Files:

- `i18n/messages/en/SeoContent.json`
- `i18n/messages/zh/SeoContent.json`
- `i18n/messages/ja/SeoContent.json`
- `lib/db/seed/seo-content-data.ts`

Rules:

- Replace generic AI/test placeholder content with new-product-relevant content.
- Cover use cases, templates, alternatives, compare, and related SEO page copy.
- In seed data, only edit content fields such as `title`, `description`, `content`, `keywords`, and `slug`.
- Do not change schema.
- Do not change seed execution logic.
- Do not run database seed.

#### 13.3 Demo Blog Drafts

Files:

- `blogs/en/1.demo.mdx`
- `blogs/zh/1.demo.mdx`
- `blogs/zh/2.demo2.mdx`
- `blogs/ja/1.demo.mdx`

Rules:

- Convert demo/placeholder blog posts into short drafts relevant to the new product.
- Frontmatter `title`, `description`, `slug`, and `tags` should use the new product and SEO keywords.
- Preserve the existing `status`.
- Keep content short; do not expand into long-form articles.

#### 13.4 Admin Pricing Form Placeholder

File:

- `app/[locale]/(protected)/dashboard/(admin)/prices/PricePlanForm.tsx`

Rules:

- Only replace old brand names in placeholder examples.
- Do not change form logic.
- Do not change field structure.
- Do not change validation logic.

#### 13.5 Optional Public Template Residue

Files:

- `i18n/messages/en/Seedance15.json`
- `i18n/messages/zh/Seedance15.json`
- `i18n/messages/ja/Seedance15.json`

Rules:

- Only clean obvious old brand, old domain, and old email if these templates are still reachable through public routes.
- Model names may be valid model names; do not remove model configuration meaning.
- Do not heavily rewrite page structure or functional descriptions.

#### 13.6 Do Not Modify

In this phase, do not modify:

- `.env`
- `.env.local`
- payment IDs
- prices
- credits
- provider IDs
- product IDs
- plan IDs
- model IDs
- API route logic
- demo images
- videos
- CDN resources
- `.claude/skills`
- `.cursor/skills`
- other AI workflow files

#### 13.7 Verification

After edits:

- Run JSON parsing for every modified JSON file.
- Run `pnpm exec tsc --noEmit`.
- Search for old brand name, old domain, and old email residues.
- Summarize modified files and high-risk items intentionally not touched.

Also update `new_site.md` with:

- incremental pass scope
- files modified
- files checked but not changed
- verification commands and results
- high-risk items intentionally not touched

## Checklist

### Phase 1: Information Gathering
- [ ] Collect product name
- [ ] Collect business description  
- [ ] Collect 3-5 key features
- [ ] Collect target audience
- [ ] Ask about social media links

### Phase 2: Market Research (DO NOT SKIP)
- [ ] **WebSearch:** User pain points & problems in this product area
- [ ] **WebSearch:** English keywords users search for
- [ ] **WebSearch:** Chinese keywords (中文关键词)
- [ ] **WebSearch:** Japanese keywords (日本語キーワード)
- [ ] **WebSearch:** Competitor analysis (how they position)
- [ ] Document research findings before proceeding

### Phase 3: Content Generation
- [ ] Generate SEO content (3 languages) - based on research
- [ ] Generate Hero section (3 languages) - using discovered pain points
- [ ] Generate Features section (3 languages) - addressing real needs
- [ ] Generate FAQ section (3 languages) - from real user questions
- [ ] Generate CTA section (3 languages)
- [ ] **CHECKPOINT:** Review generated content with user

### Phase 4: Navigation Configuration
- [ ] Analyze Header links
- [ ] Analyze Footer links
- [ ] **CHECKPOINT:** Confirm navigation changes

### Phase 5: Apply Changes
- [ ] Update config/site.ts
- [ ] Update en/common.json
- [ ] Update zh/common.json
- [ ] Update ja/common.json
- [ ] Detect active homepage template
- [ ] Update en/{ActiveTemplate}.json
- [ ] Update zh/{ActiveTemplate}.json
- [ ] Update ja/{ActiveTemplate}.json
- [ ] Verify no JSON syntax errors

### Phase 6: Product Hunt Copy Package
- [ ] Generate Title
- [ ] Generate Description
- [ ] Generate Short Description
- [ ] Generate Long Description
- [ ] Generate Tagline
- [ ] Generate Slogan
- [ ] Generate Categories
- [ ] Generate Tags
- [ ] **CHECKPOINT:** Confirm Product Hunt copy package

### Phase 7: Legal Policy Pages
- [ ] Locate `/privacy-policy`
- [ ] Locate `/terms-of-service`
- [ ] Locate `/refund-policy`
- [ ] Preserve existing policy structure
- [ ] Update only confirmed product facts
- [ ] Avoid invented company/legal details
- [ ] Update active locales when policy content is localized

### Phase 8: Content Marketing Pages
- [ ] Locate `/prompts`
- [ ] Locate `/showcase`
- [ ] Locate `/blog`
- [ ] Locate `/alternatives`
- [ ] Locate `/compare`
- [ ] Locate `/templates`
- [ ] Locate `/use-cases`
- [ ] Update page copy and SEO only for real routes/content sources
- [ ] Research competitor facts before alternatives/compare copy

### Phase 9: LLM Site Files
- [ ] Read `config/site.ts`
- [ ] Read `i18n/routing.ts`
- [ ] Read `app/sitemap.ts`
- [ ] Read header/footer public links
- [ ] Generate `public/llms.txt`
- [ ] Generate `public/llms-full.txt`
- [ ] Verify locales and public links

### Phase 10: Database Provision SQL And Env
- [ ] Generate database user/database names from slug
- [ ] Generate strong password
- [ ] Generate PostgreSQL SQL
- [ ] Generate DATABASE_URL
- [ ] Update `.env` only if explicitly confirmed
- [ ] Update `.env.local` only if explicitly confirmed

### Phase 11: Pricing Seed Content
- [ ] Update `lib/db/seed/pricing-config.ts` pricing descriptions
- [ ] Update pricing `langJsonb` copy
- [ ] Clear `paypalProductId`
- [ ] Clear `paypalPlanId`
- [ ] Clear `creemProductId`
- [ ] Run `pnpm db:seed` if DATABASE_URL is configured and user expects seeding

### Phase 12: Final Cleanup
- [ ] Search old brand terms
- [ ] Search old domain
- [ ] Search old email
- [ ] Search old product keywords
- [ ] Verify no unsupported feature claims
- [ ] Verify no invented legal/company/competitor facts
- [ ] Create or update `new_site.md`
- [ ] Run appropriate verification commands

### Optional Phase 13: Incremental Missed Content Pass
- [ ] Confirm narrow incremental scope
- [ ] Do not redo homepage, Pricing, API, Legal, or About
- [ ] Check Partners i18n files and partners page fallback email
- [ ] Check SeoContent i18n files
- [ ] Check `lib/db/seed/seo-content-data.ts` content fields only
- [ ] Check demo blog drafts and preserve existing status
- [ ] Check admin pricing form placeholder examples only
- [ ] Check `Seedance15.json` only if publicly reachable
- [ ] Do not touch env, payment IDs, prices, credits, provider/product/plan IDs, model IDs, API logic, assets, or AI workflow files
- [ ] JSON.parse modified JSON files
- [ ] Run `pnpm exec tsc --noEmit`
- [ ] Search old brand/domain/email residues
- [ ] Summarize modified files and high-risk items not touched
