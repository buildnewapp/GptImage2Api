# Seedance 2.0 AI Prompt

这份文档不是内容成品，而是可以直接发给 AI 的提示词。

目标：

- 一次生成 `blog`、`glossary`、`use_case`、`template`、`alternative`、`compare` 这 6 类内容
- 每类内容都必须包含封面图方案
- 正文根据长度插入 2-5 张插图
- 图片部分输出为“图片生成提示词 + 待替换 URL 占位”
- 文本内容为英文，便于直接上传后台

## 可直接复制给 AI 的提示词

```text
You are an expert English content strategist for programmatic SEO and AI product marketing.

Generate CMS-ready content for the keyword below across these six post types:
- blog
- glossary
- use_case
- template
- alternative
- compare

Core input:
- keyword: Seedance 2.0
- productName: SDanceAI
- coreDescription: Seedance 2.0 adopts a unified multimodal audio-video joint generation architecture that supports text, image, audio, and video inputs, leading to the most comprehensive multimodal content reference and editing capabilities in the industry.
- targetAudience: AI creators, video teams, marketers, agencies
- brandTone: clear, practical, conversion-focused
- locale: en
- ctaLabel: Try Seedance 2.0
- ctaHref: /ai-demo

General requirements:
1. Output language must be English.
2. Do not invent unsupported facts, pricing, release dates, benchmarks, or rankings.
3. Use careful wording such as "can help", "is designed to", "supports", or "is positioned as" when certainty is limited.
4. Keep title within 60-70 characters.
5. Keep description within 140-160 characters.
6. Slug must be lowercase and hyphenated.
7. Tags must be 3-6 concise English phrases.
8. content must be Markdown.
9. Each post must include:
   - featuredImagePrompt
   - featuredImageUrl
   - 2 to 5 inline image blocks depending on content length
10. featuredImageUrl and each inline imageUrl must be placeholder URLs, not real URLs.
11. Every image prompt must be written as a practical AI image-generation prompt in English.
12. Inline images must be inserted naturally inside content using Markdown image syntax.

Image rules:
- featuredImagePrompt: one prompt for the cover image
- featuredImageUrl: use a placeholder like `https://your-cdn.com/seedance-2-0/{postType}-cover.jpg`
- inlineImages: return a list where each item includes:
  - section
  - imagePrompt
  - imageUrl
- content must include the same inline image URLs in Markdown, for example:
  `![Short alt text](https://your-cdn.com/seedance-2-0/{postType}-image-1.jpg)`

Field formatting rules:
- seoBenefitsText / seoStepsText: one item per line using `Title | Description`
- seoFaqsText: one item per line using `Question | Answer`
- seoVariablesText: one item per line using `key | label | description`
- compare seoBenefitsText: use `Label | Left Value | Right Value`

Post-specific requirements:

For `blog`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- content

For `glossary`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- content

For `use_case`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- seoHeroSubtitle
- seoTargetAudience
- seoProblemSummary
- seoBenefitsText
- seoStepsText
- seoFaqsText
- seoCtaLabel
- seoCtaHref
- content

For `template`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- seoPrompt
- seoVariablesText
- seoExampleInput
- seoExampleOutput
- seoTipsText
- seoFaqsText
- seoCtaLabel
- seoCtaHref
- content

For `alternative`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- seoHeroSubtitle
- seoTargetAudience
- seoProblemSummary
- seoBenefitsText
- seoStepsText
- seoFaqsText
- seoCtaLabel
- seoCtaHref
- content

For `compare`, return:
- title
- slug
- description
- tags
- featuredImagePrompt
- featuredImageUrl
- inlineImages
- seoHeroSubtitle
- seoTargetAudience
- seoProblemSummary
- seoBenefitsText
- seoStepsText
- seoFaqsText
- seoCtaLabel
- seoCtaHref
- content

Content guidance by type:

`blog`
- search-friendly long-form article
- 1200-1800 words
- include 3 to 5 inline images
- structure:
  - introduction
  - what is it
  - key capabilities
  - use cases
  - strengths and limitations
  - final takeaway

`glossary`
- concise definition page
- 700-1100 words
- include 2 to 3 inline images
- first paragraph must define Seedance 2.0 directly

`use_case`
- practical workflow page
- include 3 to 4 inline images
- base it on realistic marketing or creator workflows

`template`
- AI prompt template page
- include 2 to 3 inline images
- seoPrompt must be directly copyable

`alternative`
- objective alternative page
- include 2 to 4 inline images
- do not attack competitors

`compare`
- practical comparison page
- include 2 to 4 inline images
- use `seoProblemSummary: Seedance 2.0 vs Runway`
- keep the verdict nuanced and practical

Output format:
- Return one Markdown document
- Use this section order:
  - ## blog
  - ## glossary
  - ## use_case
  - ## template
  - ## alternative
  - ## compare
- Under each section, output one fenced `yaml` block only
- Do not add explanations outside the YAML blocks
```

## 使用建议

- 如果一次生成 6 类内容不稳定，可以把同一份提示词拆成 6 次分别生成。
- 如果图片风格想统一，可以在每个 `featuredImagePrompt` 和 `imagePrompt` 里追加固定风格要求，例如 `clean cinematic product-visual style, modern AI branding, high contrast, premium lighting`。
- 如果后面改成别的关键词，只需要替换 `keyword`、`coreDescription`、`targetAudience`、`productName`。
