# Admin Post API

用于后台管理员通过 API Key 发布或创建 post。

## 接口信息

- 方法：`POST`
- 路径：`/api/admin/posts/submit`
- 认证：`Authorization: Bearer <ADMIN_API_KEY>`
- 调用权限：API Key 对应用户必须是 `admin` 角色

## 支持的 `postType`

- `blog`
- `glossary`
- `use_case`
- `template`
- `alternative`
- `compare`

## 请求头

```http
Authorization: Bearer sk_your_admin_api_key
Content-Type: application/json
```

## 通用请求体

```json
{
  "postType": "blog",
  "language": "en",
  "title": "Seedance 2 Review",
  "slug": "seedance-2-review",
  "content": "# Seedance 2 Review\n\nFull markdown content here.",
  "description": "Short summary for list pages and SEO.",
  "metadataJsonb": {
    "source": "admin-api"
  },
  "tags": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "review"
    }
  ],
  "featuredImageUrl": "https://cdn.example.com/posts/seedance-2-review-cover.jpg",
  "status": "published",
  "visibility": "public",
  "isPinned": false
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `postType` | string | 否 | 默认 `blog`，可选值见上文 |
| `language` | string | 是 | 语言代码，例如 `en`、`zh` |
| `title` | string | 是 | 标题，至少 3 个字符 |
| `slug` | string | 是 | URL slug，至少 3 个字符，同语言同类型内唯一 |
| `content` | string | 否 | Markdown 正文 |
| `description` | string | 否 | 摘要 |
| `metadataJsonb` | object | 否 | 扩展元数据，SEO 类 post 建议或要求提供 |
| `tags` | array | 否 | 标签数组，每项需提供 `id` 和 `name` |
| `featuredImageUrl` | string | 否 | 封面图 URL，可传空字符串清空 |
| `status` | string | 是 | `draft`、`published`、`archived` |
| `visibility` | string | 是 | `public`、`logged_in`、`subscribers` |
| `isPinned` | boolean | 否 | 是否置顶 |

## SEO 类型的 `metadataJsonb`

### `use_case`

```json
{
  "postType": "use_case",
  "language": "en",
  "title": "AI Product Demo Use Cases",
  "slug": "ai-product-demo-use-cases",
  "content": "# AI Product Demo Use Cases",
  "description": "Use cases for faster product demo production.",
  "status": "published",
  "visibility": "public",
  "metadataJsonb": {
    "heroSubtitle": "Turn rough ideas into demo-ready videos",
    "targetAudience": "Growth teams and creators",
    "problemSummary": "Manual demo production is slow.",
    "benefits": [
      {
        "title": "Ship faster",
        "description": "Create first drafts in minutes"
      }
    ],
    "steps": [
      {
        "title": "Upload assets",
        "description": "Provide screenshots, clips, or copy"
      }
    ],
    "faqs": [
      {
        "question": "Can I localize the output?",
        "answer": "Yes, create separate posts for each language."
      }
    ],
    "ctaLabel": "Try SDanceAI",
    "ctaHref": "/ai-demo"
  }
}
```

### `template`

`template` 类型要求 `metadataJsonb.prompt` 为非空字符串。

```json
{
  "postType": "template",
  "language": "en",
  "title": "Prompt Template for Product Ad Videos",
  "slug": "product-ad-video-template",
  "content": "# Prompt Template",
  "description": "Prompt template for short-form ads.",
  "status": "published",
  "visibility": "public",
  "metadataJsonb": {
    "prompt": "Create a high-energy product ad video for {{product_name}}.",
    "variables": [
      {
        "key": "product_name",
        "label": "Product name",
        "description": "Displayed brand or product name"
      }
    ],
    "exampleInput": "product_name=Seedance 2",
    "exampleOutput": "A 15-second ad script with scene directions.",
    "tips": [
      "Keep the hook within 3 seconds"
    ],
    "faqs": [
      {
        "question": "Can this be used for B2B products?",
        "answer": "Yes, adjust tone and CTA."
      }
    ],
    "ctaLabel": "Generate Video",
    "ctaHref": "/ai-demo/video"
  }
}
```

### `alternative`

```json
{
  "postType": "alternative",
  "language": "en",
  "title": "Seedance Alternative",
  "slug": "seedance-alternative",
  "content": "# Seedance Alternative",
  "description": "Alternative comparison landing page.",
  "status": "published",
  "visibility": "public",
  "metadataJsonb": {
    "heroSubtitle": "A faster workflow for AI video teams",
    "incumbentName": "Seedance",
    "bestFor": "Teams needing repeatable templates",
    "switchReasons": [
      {
        "title": "Lower friction",
        "description": "Fewer manual editing steps"
      }
    ],
    "advantages": [
      {
        "title": "Reusable prompts",
        "description": "Keep output style consistent"
      }
    ],
    "limitations": [
      {
        "title": "Smaller ecosystem",
        "description": "Fewer third-party tutorials"
      }
    ],
    "faqs": [],
    "ctaLabel": "Compare Tools",
    "ctaHref": "/compare"
  }
}
```

### `compare`

```json
{
  "postType": "compare",
  "language": "en",
  "title": "Seedance vs Runway",
  "slug": "seedance-vs-runway",
  "content": "# Seedance vs Runway",
  "description": "Comparison page for decision-stage traffic.",
  "status": "published",
  "visibility": "public",
  "metadataJsonb": {
    "heroSubtitle": "Choose the right tool for production scale",
    "leftProduct": "Seedance",
    "rightProduct": "Runway",
    "verdict": "Seedance vs Runway",
    "comparisonRows": [
      {
        "label": "Speed",
        "leftValue": "Fast",
        "rightValue": "Medium"
      }
    ],
    "recommendedScenarios": [
      {
        "title": "Pick Seedance",
        "description": "When you optimize for throughput"
      }
    ],
    "faqs": [],
    "ctaLabel": "Start Free",
    "ctaHref": "/pricing"
  }
}
```

## 成功响应

```json
{
  "success": true,
  "data": {
    "postId": "9d352f93-6344-4e46-8d32-636fd1676aa0"
  }
}
```

状态码：`201 Created`

## 错误响应

### 未认证或 API Key 无效

```json
{
  "success": false,
  "error": "User not authenticated"
}
```

状态码：`401`

### 非管理员

```json
{
  "success": false,
  "error": "Admin privileges required."
}
```

状态码：`403`

### 请求体非法

```json
{
  "success": false,
  "error": "Invalid input data."
}
```

或：

```json
{
  "success": false,
  "error": "Invalid metadataJsonb for postType 'template'."
}
```

状态码：`400`

### slug 冲突

```json
{
  "success": false,
  "error": "Slug 'seedance-2-review' already exists."
}
```

状态码：`409`

## cURL 示例

```bash
curl --request POST \
  --url http://localhost:3000/api/admin/posts/submit \
  --header 'Authorization: Bearer sk_your_admin_api_key' \
  --header 'Content-Type: application/json' \
  --data '{
    "postType": "blog",
    "language": "en",
    "title": "Seedance 2 Review",
    "slug": "seedance-2-review",
    "content": "# Seedance 2 Review\n\nFull markdown content here.",
    "description": "Short summary for list pages and SEO.",
    "status": "published",
    "visibility": "public"
  }'
```

## 说明

- 该接口同时兼容登录态 `admin` 和 API Key `admin`，但对自动化调用建议统一使用 API Key。
- 当 `status` 为 `published` 时，接口会自动触发对应列表页和详情页的缓存刷新。
- 对 `use_case`、`template`、`alternative`、`compare`，建议始终显式传 `metadataJsonb`。
