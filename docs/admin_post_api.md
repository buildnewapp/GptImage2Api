# Admin Post API

用于第三方系统通过 Admin API Key 创建文章或 SEO 内容页。

> 当前接口只负责创建新 post，不是 upsert，也不支持更新已有 post。若已存在相同 `language + slug + postType`，接口会为本次创建的 slug 自动追加 `MMDDHHmm` 后缀，例如 `seedance-2-review-05041749`。

## 接口信息

- 方法：`POST`
- 路径：`/api/admin/posts/submit`
- 认证：`Authorization: Bearer <ADMIN_API_KEY>`
- 调用权限：API Key 对应用户必须是 `admin` 角色
- 请求格式：`Content-Type: application/json`
- 响应格式：JSON

## 支持的 `postType`

- `blog`
- `glossary`
- `use_case`
- `template`
- `alternative`
- `compare`

## 第三方接入流程

1. 在后台为 `admin` 用户创建 API Key，并确保 Key 状态为 active。
2. 第三方请求时使用 `Authorization: Bearer sk_xxx`。
3. 如果文章包含封面图或正文图片，先调用图片上传接口拿到平台图片 URL。
4. 创建文章时，把封面图 URL 写入 `featuredImageUrl`，正文图片 URL 写入 Markdown，例如 `![Alt text](https://cdn.example.com/blogs/20260504/image.png)`。
5. 先用 `status: "draft"` 创建草稿；确认内容、图片和 slug 没问题后，再使用后台编辑发布。若第三方已经完成内容审核，也可以直接传 `status: "published"`。
6. `slug` 建议由第三方提前生成。接口不会从 title 自动生成 slug，但会在重复时追加时间后缀。

## 请求头

```http
Authorization: Bearer sk_your_admin_api_key
Content-Type: application/json
```

## 图片上传接口

第三方发布文章前，可以先把封面图和正文图片上传到平台。图片会存储到 R2 的 `blogs/YYYYMMDD/` 目录，例如 `blogs/20260504/cover-image-abcd1234.png`。

### 接口信息

- 方法：`POST`
- 路径：`/api/admin/images/upload`
- 认证：`Authorization: Bearer <ADMIN_API_KEY>`
- 调用权限：API Key 对应用户必须是 `admin` 角色
- 请求格式：`multipart/form-data`
- 文件字段名：`file`
- 文件类型：仅支持 `image/*`

### cURL 示例

```bash
curl --request POST \
  --url http://localhost:3000/api/admin/images/upload \
  --header 'Authorization: Bearer sk_your_admin_api_key' \
  --form 'file=@/path/to/cover.png'
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "key": "blogs/20260504/cover-image-abcd1234.png",
    "publicObjectUrl": "https://cdn.example.com/blogs/20260504/cover-image-abcd1234.png"
  }
}
```

状态码：`201 Created`

### 常见错误

```json
{
  "success": false,
  "error": "Missing upload file."
}
```

状态码：`400`

```json
{
  "success": false,
  "error": "Only image uploads are supported."
}
```

状态码：`400`

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
| `language` | string | 是 | 语言代码。当前站点支持 `en`、`zh`、`ja` |
| `title` | string | 是 | 标题，至少 3 个字符 |
| `slug` | string | 是 | URL slug，至少 3 个字符；同一个 `language + postType` 下唯一。重复时会追加 `MMDDHHmm` 后缀 |
| `content` | string | 否 | Markdown 正文。虽然接口允许为空，第三方发布文章时建议必传 |
| `description` | string | 否 | 摘要，也会作为 SEO 描述的兜底来源 |
| `metadataJsonb` | object | 否 | 扩展元数据。`template` 必须提供有效结构；其他 SEO 类型建议提供 |
| `tags` | array | 否 | 标签数组，每项需提供 `id` 和 `name`。接口只使用 `id` 关联已有标签，不会自动创建标签 |
| `featuredImageUrl` | string | 否 | 封面图 URL，可传空字符串清空 |
| `status` | string | 是 | `draft`、`published`、`archived` |
| `visibility` | string | 是 | `public`、`logged_in`、`subscribers` |
| `isPinned` | boolean | 否 | 是否置顶 |

## 字段行为说明

- `authorId` 会自动使用 API Key 所属的管理员用户。
- `publishedAt`、`createdAt`、`updatedAt` 由数据库自动生成，接口不支持传入。
- 请求体中未列出的字段会被校验器忽略，不会入库。
- 如果同一个 `language + slug + postType` 已存在，本次入库 slug 会变为 `原slug-MMDDHHmm`，最终值以响应里的 `data.slug` 为准。
- `featuredImageUrl` 如果传空字符串，会保存为 `null`。
- `tags[].name` 目前只用于保持请求结构可读；实际写入时只使用 `tags[].id`。
- 如果传了不存在的 `tags[].id`，创建可能失败。第三方不确定标签 id 时，建议先不传 `tags`。
- 公开文章通常使用 `status: "published"` + `visibility: "public"`。

## 公开路径

`slug` 入库后会用于公开页面 URL。默认语言 `en` 不带语言前缀，其他语言带语言前缀。

| `postType` | 默认语言路径示例 | 非默认语言路径示例 |
| --- | --- | --- |
| `blog` | `/blog/seedance-2-review` | `/zh/blog/seedance-2-review` |
| `glossary` | `/glossary/seedance-2` | `/zh/glossary/seedance-2` |
| `use_case` | `/use-cases/ai-product-demo-use-cases` | `/zh/use-cases/ai-product-demo-use-cases` |
| `template` | `/templates/product-ad-video-template` | `/zh/templates/product-ad-video-template` |
| `alternative` | `/alternatives/seedance-alternative` | `/zh/alternatives/seedance-alternative` |
| `compare` | `/compare/seedance-vs-runway` | `/zh/compare/seedance-vs-runway` |

## SEO 类型的 `metadataJsonb`

SEO 类型包括 `use_case`、`template`、`alternative`、`compare`。这些字段会在服务端做结构校验和规范化：

- 可空字符串如果为空，会被保存为 `null`。
- 可选数组如果未传，会被保存为 `[]`。
- `benefits`、`steps`、`switchReasons`、`advantages`、`limitations`、`recommendedScenarios` 的每一项至少需要非空 `title`。
- `faqs` 每项需要 `question` 和 `answer` 字段；空 FAQ 在公开页结构化数据中会被过滤。
- `template.metadataJsonb.prompt` 是必填的非空字符串。

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

`template` 类型要求 `metadataJsonb.prompt` 为非空字符串；缺少或为空会返回 `400`。

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

### `blog` / `glossary`

`blog` 和 `glossary` 不要求固定的 `metadataJsonb` 结构。第三方可以不传，也可以传简单对象用于内部追踪，例如：

```json
{
  "source": "third-party-cms",
  "externalId": "article_12345"
}
```

## 成功响应

```json
{
  "success": true,
  "data": {
    "postId": "9d352f93-6344-4e46-8d32-636fd1676aa0",
    "slug": "seedance-2-review"
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

### JSON 格式非法

```json
{
  "success": false,
  "error": "Invalid JSON body."
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

说明：接口会先尝试把重复 slug 改为 `原slug-MMDDHHmm`。只有在追加后缀后的 slug 仍然冲突时，才会返回 `409`。这种情况通常发生在同一分钟内多次提交同一篇内容。

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
- 当 `status` 为 `published` 时，接口会自动触发列表页和详情页缓存刷新。
- 对 `use_case`、`template`、`alternative`、`compare`，建议始终显式传 `metadataJsonb`。
- 接口不会把同一篇内容自动发布到多语言；每个语言版本需要单独调用一次，并使用对应的 `language`。
