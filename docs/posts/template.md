# Posts Template

这份文档是通用模板说明，适用于当前项目的 6 类 `postType`：

- `blog`
- `glossary`
- `use_case`
- `template`
- `alternative`
- `compare`

## 建议文件组织

- `docs/posts/template.md`
  通用规则和字段模板
- `docs/posts/<keyword>.md`
  某个关键词的内容规划或索引说明
- `docs/posts/template-<keyword>.md`
  某个关键词可直接发给 AI 的完整提示词
- `docs/posts/detail/<keyword>.md`
  某个关键词可直接上传后台的具体内容

## 通用内容要求

- 文本默认使用英文，方便直接上传后台。
- 标题控制在 60-70 字符。
- 描述控制在 140-160 字符。
- `slug` 使用小写加连字符。
- `tags` 使用 3-6 个英文短词。
- `content` 使用 Markdown。
- 每篇都必须有封面图。
- 正文按篇幅插入 2-5 张插图。
- 图片统一输出为：
  - `featuredImagePrompt`
  - `featuredImageUrl`
  - `inlineImages`
- `featuredImageUrl` 和正文图片 URL 使用占位链接，后续替换。

## 图片字段模板

```yaml
featuredImagePrompt: "English prompt for generating the cover image"
featuredImageUrl: "https://your-cdn.com/<keyword>/<post-type>-cover.jpg"
inlineImages:
  - section: "Section title"
    imagePrompt: "English prompt for generating an inline image"
    imageUrl: "https://your-cdn.com/<keyword>/<post-type>-image-1.jpg"
  - section: "Another section title"
    imagePrompt: "English prompt for generating another inline image"
    imageUrl: "https://your-cdn.com/<keyword>/<post-type>-image-2.jpg"
```

## 正文插图写法

正文里直接插入对应 Markdown 图片：

```md
![Short alt text](https://your-cdn.com/<keyword>/<post-type>-image-1.jpg)
```

## SEO 字段格式

```text
seoBenefitsText / seoStepsText:
Title | Description

seoFaqsText:
Question | Answer

seoVariablesText:
key | label | description

compare 类型的 seoBenefitsText:
Label | Left Value | Right Value
```

## 6 类最小字段模板

### blog

```yaml
postType: "blog"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
content: ""
```

### glossary

```yaml
postType: "glossary"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
content: ""
```

### use_case

```yaml
postType: "use_case"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
seoHeroSubtitle: ""
seoTargetAudience: ""
seoProblemSummary: ""
seoBenefitsText: ""
seoStepsText: ""
seoFaqsText: ""
seoCtaLabel: ""
seoCtaHref: ""
content: ""
```

### template

```yaml
postType: "template"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
seoPrompt: ""
seoVariablesText: ""
seoExampleInput: ""
seoExampleOutput: ""
seoTipsText: ""
seoFaqsText: ""
seoCtaLabel: ""
seoCtaHref: ""
content: ""
```

### alternative

```yaml
postType: "alternative"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
seoHeroSubtitle: ""
seoTargetAudience: ""
seoProblemSummary: ""
seoBenefitsText: ""
seoStepsText: ""
seoFaqsText: ""
seoCtaLabel: ""
seoCtaHref: ""
content: ""
```

### compare

```yaml
postType: "compare"
language: "en"
title: ""
slug: ""
description: ""
tags: []
featuredImagePrompt: ""
featuredImageUrl: ""
inlineImages: []
seoHeroSubtitle: ""
seoTargetAudience: ""
seoProblemSummary: ""
seoBenefitsText: ""
seoStepsText: ""
seoFaqsText: ""
seoCtaLabel: ""
seoCtaHref: ""
content: ""
```
