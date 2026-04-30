# Confirmation Checkpoints Guide

Detailed guidance for handling user confirmations at critical points in the quick start process.

## Pre-Checkpoint: Research Summary

### Purpose
Before generating content, present research findings to user for validation.

### What to Present

```markdown
## Market Research Summary

I've researched your product area and discovered the following insights:

### User Pain Points Found:
Based on web searches, users in this space commonly struggle with:
1. **{Pain point 1}** - Found via search: "{search query}"
2. **{Pain point 2}** - Found via search: "{search query}"
3. **{Pain point 3}** - Found via search: "{search query}"

### Keywords Users Actually Search:

| Language | High-Value Keywords | Search Intent |
|----------|---------------------|---------------|
| English | {keyword1}, {keyword2} | {what users want} |
| Chinese | {关键词1}, {关键词2} | {用户需求} |
| Japanese | {キーワード1}, {キーワード2} | {ユーザーの意図} |

### Competitor Positioning:
- {Competitor 1}: "{their tagline/positioning}"
- {Competitor 2}: "{their tagline/positioning}"

### Recommended Content Strategy:
Based on research, I recommend:
- **Primary message:** Address {pain point 1}
- **Key differentiator:** {how you're different from competitors}
- **Target keywords:** {list for each language}

---

Does this research align with your understanding of the market?
- Reply **Y** to proceed with content generation based on these findings
- Reply **adjust** to modify the strategy
- Provide corrections if any findings are inaccurate
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Proceed to content generation |
| "adjust" | Ask what should be changed |
| "our target is actually..." | Update understanding and re-confirm |
| "this keyword is wrong" | Research again with corrected info |
| "we should emphasize X instead" | Adjust content strategy |

---

## Checkpoint 1: Content Review

### Purpose
Ensure generated content matches the user's expectations before applying changes.

### What to Present

```markdown
## Generated Content Preview

I've generated the following content based on your product information AND market research:

### 1. SEO & Branding

| Language | Title | Tagline | Description (truncated) |
|----------|-------|---------|------------------------|
| English | {value} | {value} | {first 50 chars}... |
| Chinese | {value} | {value} | {first 50 chars}... |
| Japanese | {value} | {value} | {first 50 chars}... |

### 2. Hero Section (English)
**Headline:** {value}
**Description:** {value}
**CTA:** {value}

### 3. Features (English)
| # | Title | Description |
|---|-------|-------------|
| 1 | {title} | {description} |
| 2 | {title} | {description} |
| ... | ... | ... |

### 4. FAQ (showing 3 of {total})
1. **Q:** {question}
   **A:** {answer}
2. ...

---

**Options:**
- Reply **Y** or **yes** to proceed with these changes
- Reply **edit [section]** to modify a specific section (e.g., "edit hero")
- Reply **regenerate** to regenerate all content
- Provide specific feedback for targeted changes
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes", "proceed" | Continue to Checkpoint 2 |
| "edit hero" | Ask for specific hero changes |
| "edit feature 2" | Ask what to change in feature 2 |
| "regenerate" | Re-collect information or regenerate all |
| "the tagline should be..." | Apply specific change and re-confirm |
| "looks good but change X" | Apply change and proceed |

## Checkpoint 2: Navigation Changes

### Purpose
Header and Footer changes significantly impact site structure. Require explicit confirmation.

Default policy: keep Header and Footer menus mostly unchanged. Only recommend changes when links are clearly inappropriate for the new product, still point to old products/domains, or the user explicitly asks for navigation changes.

### Step 2.1: Header Analysis

First, read current Header and present analysis:

```markdown
## Header Navigation Analysis

Current header links in your template:

| # | Name | URL | Recommendation |
|---|------|-----|----------------|
| 1 | Features | /#features | ✅ KEEP - Standard SaaS navigation |
| 2 | Pricing | /#pricing | ✅ KEEP - Essential for conversions |
| 3 | AI Demo | /ai-demo | ⚠️ REVIEW - Only keep if your product has AI |
| 4 | Blog | /blog | ✅ KEEP - Good for SEO and content marketing |
| 5 | Demo (dropdown) | # | ⚠️ REVIEW - Contains NEXTY-specific demos |

### Questions:

1. **AI Demo link:** Does your product have AI capabilities?
   - If yes → Keep or rename
   - If no → Remove
   
2. **Demo dropdown:** This contains links to NEXTY demos.
   - Remove entirely?
   - Replace with your own demos/products?
   - Keep as-is?

3. **Add new links?**
   - Documentation (/docs)?
   - Contact (/contact)?
   - Other pages?
```

### Step 2.2: Footer Analysis

```markdown
## Footer Navigation Analysis

Current footer structure:

### Group 1: Products
- Features (/#features)
- Pricing (/#pricing)
- Blog (/blog)
- Glossary (/glossary)

### Group 2: Support
- Docs (https://docs.nexty.dev/docs) ⚠️ Points to NEXTY docs
- Roadmap (https://nexty.dev/roadmap) ⚠️ Points to NEXTY site

### Group 3: Languages
- English, 中文, 日本語 (auto-handled, no changes needed)

### Questions:

1. **Products group:** 
   - Keep Glossary link?
   - Add other pages?

2. **Support group:**
   - Update Docs link to your documentation?
   - Update/remove Roadmap link?
   - Add Contact page?
```

### Step 2.3: Social Media Links

```markdown
## Social Media Configuration

Current social links in `config/site.ts`:

| Platform | Current Value | Your Link |
|----------|---------------|-----------|
| GitHub | (empty) | |
| Twitter/X | (empty) | |
| YouTube | (empty) | |
| Discord | (from env) | |
| Email | (empty) | |

Please provide any social links you'd like to add:
- Leave blank to skip
- Provide "remove" to explicitly clear
```

### Step 2.4: Final Navigation Confirmation

```markdown
## Final Navigation Structure

### Header (after changes):
```json
[
  { "name": "Features", "href": "/#features" },
  { "name": "Pricing", "href": "/#pricing" },
  { "name": "Blog", "href": "/blog" }
]
```

### Footer Groups (after changes):
```json
[
  {
    "title": "Products",
    "links": [
      { "href": "/#features", "name": "Features" },
      { "href": "/#pricing", "name": "Pricing" },
      { "href": "/blog", "name": "Blog" }
    ]
  },
  {
    "title": "Support", 
    "links": [
      { "name": "Documentation", "href": "/docs" },
      { "name": "Contact", "href": "mailto:hello@example.com" }
    ]
  }
]
```

### Social Links:
- GitHub: https://github.com/yourname
- Twitter: https://twitter.com/yourhandle
- Discord: (kept from environment)

---

**Confirm these navigation changes?**
- Reply **Y** to apply all changes
- Reply **adjust [section]** to make adjustments
- Reply **skip navigation** to keep original navigation
```

## Handling Complex Scenarios

### Scenario: User wants partial changes

```markdown
User: "Keep the header as is, but update the footer docs link"

Response: 
I'll make these changes:
- ✅ Header: No changes
- ✅ Footer: Update Docs link from `https://docs.nexty.dev/docs` to your docs URL

What URL should the Docs link point to?
```

### Scenario: User is unsure about changes

```markdown
User: "I'm not sure what to do with the Demo dropdown"

Response:
Here are your options for the Demo dropdown:

1. **Remove entirely** - If you don't have demos to show
2. **Keep and customize** - Replace NEXTY demos with your own:
   - Your demo site URLs
   - Your product screenshots/videos
3. **Keep as-is** - Leave NEXTY demos (not recommended for production)
4. **Convert to single link** - Change from dropdown to single "Demo" link

Which option works best for your product?
```

### Scenario: User provides incomplete information

```markdown
User: "Just use my GitHub"

Response:
I'll add your GitHub link. Could you provide:
- Your GitHub URL (e.g., https://github.com/username or https://github.com/username/repo)

The other social links will remain empty unless you'd like to add them:
- Twitter/X
- Discord
- YouTube
```

### Scenario: User wants to add custom links

```markdown
User: "I want to add a Changelog page to the header"

Response:
I'll add a Changelog link to the header. Please confirm:
- **Name:** "Changelog" (or different name?)
- **URL:** "/changelog" (or different path?)
- **Position:** After Blog (or different position?)

Updated header will be:
1. Features → /#features
2. Pricing → /#pricing
3. Blog → /blog
4. Changelog → /changelog

Confirm? (Y/N)
```

## Error Recovery

### Invalid JSON after changes

If file updates result in invalid JSON:

1. Show the error to user
2. Offer to:
   - Retry the update
   - Show the problematic content for manual review
   - Restore from git (if changes were committed)

### Missing translations

If translations cannot be generated:

1. Generate English content first
2. Flag incomplete translations
3. Offer to:
   - Use English as placeholder
   - Skip that language
   - Let user provide translation

## Summary Checklist for Checkpoints

### Checkpoint 1 (Content Review):
- [ ] Present SEO content in table format
- [ ] Show Hero section content
- [ ] List all features with titles/descriptions
- [ ] Show sample FAQs
- [ ] Wait for explicit confirmation before proceeding

### Checkpoint 2 (Navigation):
- [ ] Analyze current Header links with recommendations
- [ ] Analyze current Footer links with recommendations
- [ ] Collect social media links
- [ ] Present final structure before applying
- [ ] Wait for explicit confirmation
- [ ] Handle partial change requests

### Final Verification:
- [ ] All JSON files are valid (use JSON.parse check mentally)
- [ ] All three languages are updated
- [ ] config/site.ts is updated
- [ ] Inform user that changes are complete
- [ ] Suggest next steps (run dev server, verify changes)

---

## Create-New-Site Additional Checkpoints

These checkpoints extend the original quick-start flow for full new-site creation.

## Checkpoint 3: Product Hunt Copy Package

### Purpose

Confirm the core launch copy before it becomes the source for homepage, SEO, and marketing pages.

### What to Present

```markdown
## Product Hunt Copy Preview

- **Title:** {title}
- **Description:** {description}
- **Short Description:** {shortDescription}
- **Long Description:** {longDescription}
- **Tagline:** {tagline}
- **Slogan:** {slogan}
- **Categories:** {categories}
- **Tags:** {tags}

Does this match the positioning you want?
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes", "继续" | Use this copy package as the source for later pages |
| "more developer-focused" | Regenerate with developer-oriented positioning |
| "too marketing-heavy" | Make copy more direct and practical |
| "change title" | Update only the title and re-confirm |
| "regenerate" | Regenerate the full package from the same research strategy |

## Checkpoint 4: Active Homepage Template

### Purpose

Avoid editing `Landing.json` when the current project homepage uses another template.

### What to Present

```markdown
## Active Homepage Template

- Homepage route file: `{pageFile}`
- Homepage component: `{componentName}`
- Translation namespace: `{namespace}`
- Active message files:
  - en: `{enFile}`
  - zh: `{zhFile}`
  - ja: `{jaFile}`

I will preserve the existing JSON structure and update only fields used by the active template.
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Update active template files |
| "wrong template" | Re-inspect route/component references |
| "add FAQ" | First verify component support; if unsupported, ask before code changes |
| "only English" | Update only English and note skipped locales |

## Checkpoint 5: Legal Policy Strategy

### Purpose

Policy pages must not invent company, jurisdiction, address, refund promises, or provider facts.

### What to Present

```markdown
## Legal Policy Update Plan

Will update:
- Brand name
- Website URL
- Support email
- Product/service description
- Account/login model
- Billing model
- Credit/subscription wording
- Refund contact method

Will not invent:
- Legal company name
- Registered address
- Tax ID
- Jurisdiction
- Phone number
- Legal representative

Refund wording:
{refundPolicySummary}
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Update policy pages |
| "company name is..." | Add confirmed company name |
| "jurisdiction is..." | Add confirmed jurisdiction |
| "refund window is..." | Add confirmed refund window |
| "no subscription" | Remove subscription-specific wording |

## Checkpoint 6: Competitors For Alternatives And Compare

### Purpose

Avoid fabricated competitor claims in `/alternatives` and `/compare`.

### What to Present

```markdown
## Competitor Content Plan

Candidate competitors:
1. {competitor1}
2. {competitor2}
3. {competitor3}

Writing rules:
- Use only verified facts
- Do not fabricate pricing, limits, API features, or model support
- Use fair phrasing such as "best for", "may fit", and "designed for"

Confirm these competitors?
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Write alternatives/compare content |
| "remove X" | Remove that competitor |
| "add X" | Research and add that competitor |
| "no named competitors" | Write generic alternatives content |

## Checkpoint 7: Database SQL And Env

## Checkpoint 7: LLM Site Files

### Purpose

`public/llms.txt` and `public/llms-full.txt` should reflect only real public pages and configured locales. Confirm the detected public routes and locale setup before writing.

### What to Present

```markdown
## LLM Files Plan

Detected site:
- Name: {siteName}
- URL: {siteUrl}

Detected locales from `i18n/routing.ts`:
- Default: {defaultLocale}
- Supported: {locales}
- Names: {localeNames}

Public pages to include:
- {page1}
- {page2}
- {page3}

Will create/update only:
- `public/llms.txt`
- `public/llms-full.txt`

Will not include:
- dashboard/admin/auth/api/private/webhook/error pages
- `_next` asset paths
- pages not found in routes/header/footer/sitemap

Proceed?
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Generate both llms files |
| "exclude X" | Remove that page and re-confirm if needed |
| "include X" | Verify the route exists before including |
| "only llms.txt" | Generate only `public/llms.txt` |
| "only llms-full.txt" | Generate only `public/llms-full.txt` |

## Checkpoint 8: Database SQL And Env

### Purpose

Database credentials are sensitive. Do not write `.env` or `.env.local` unless the user explicitly confirms env file updates.

### What to Present

```markdown
## Database Setup Preview

- slug: `{slug}`
- user: `user_{slug}`
- database: `db_{slug}`
- host: `{host}`
- port: `{port}`

Will generate:
- PostgreSQL user/database SQL
- DATABASE_URL
- `.env` update only if confirmed
- `.env.local` update only if confirmed

Proceed?
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Generate SQL and update env files |
| "host is..." | Update host and re-confirm |
| "port is..." | Update port and re-confirm |
| "SQL only" | Generate SQL but do not edit env |
| "do not update .env.local" | Update only requested files |
| "do not edit env" | Generate SQL/DATABASE_URL only |

## Checkpoint 9: Pricing Seed Update

### Purpose

Pricing copy will be synced into the database, and payment provider IDs will be cleared.

### What to Present

```markdown
## Pricing Update Plan

Will update:
- cardDescription
- features[].description
- langJsonb.en / zh / ja
- highlightText and buttonText if needed

Will clear:
- paypalProductId
- paypalPlanId
- creemProductId

Will run:
- pnpm db:seed

Will not change unless requested:
- plan IDs
- prices
- credits
- billing intervals
- display order
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Edit pricing config and run seed |
| "do not seed" | Edit only, skip `pnpm db:seed` |
| "also change prices" | Ask for the new pricing plan |
| "do not clear provider IDs" | Keep IDs and warn about reusing old payment products |

## Checkpoint 10: Incremental Missed Content Pass

### Purpose

When the user asks to fill missed content after a new-site rewrite, confirm the narrow scope before editing so the agent does not redo homepage, Pricing, API, Legal, About, database, payment, model, or asset work.

### What to Present

```markdown
## Incremental Missed Content Pass

I will only check and update:
- Partners copy and partners page fallback email
- SeoContent i18n files
- `lib/db/seed/seo-content-data.ts` content fields
- Demo blog drafts
- Admin pricing form placeholder examples
- Public `Seedance15.json` residue only if the template is publicly reachable

I will not modify:
- Homepage
- Pricing plans, prices, credits, payment/provider/product/plan IDs
- API route logic
- Legal pages
- About pages
- `.env` / `.env.local`
- model IDs
- demo images/videos/CDN resources
- `.claude/skills`, `.cursor/skills`, or AI workflow files

Verification:
- JSON.parse for modified JSON files
- `pnpm exec tsc --noEmit`
- Search old brand/domain/email residues

Proceed?
```

### Handling User Responses

| Response | Action |
|----------|--------|
| "Y", "yes" | Run the narrow incremental pass |
| "include homepage" | Ask for explicit homepage scope before touching it |
| "also run seed" | Confirm database and seed command separately |
| "skip blogs" | Skip demo blog files |
| "skip Seedance15" | Skip optional public template residue |

## Additional Final Verification

- [ ] Active homepage template, not assumed `Landing.json`, was updated
- [ ] Homepage FAQ has 12 questions when the active template supports it
- [ ] Product Hunt copy package was generated or confirmed
- [ ] Each phase wrote its generated materials, decisions, skipped items, and verification results to `new_site.md`
- [ ] Legal pages do not contain fabricated company/legal details
- [ ] Content marketing pages do not contain unsupported feature claims
- [ ] Competitor facts were researched or provided by user
- [ ] `.env` and `.env.local` were not edited unless explicitly confirmed
- [ ] Resource image/video URLs were not changed unless explicitly requested
- [ ] Header/Footer were preserved unless changes were clearly needed or confirmed
- [ ] `public/llms.txt` and `public/llms-full.txt` were generated from real public routes and configured locales
- [ ] `new_site.md` was created or updated with all changes and verification results
- [ ] `pricing-config.ts` provider IDs are cleared when requested
- [ ] `pnpm db:seed` result is reported if run
- [ ] Old brand, domain, email, and product keywords are searched after edits
- [ ] Incremental missed-content mode did not touch excluded large blocks or restricted files
