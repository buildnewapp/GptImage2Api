# GeoFlow API Token 接口文档

本文档根据后台 `API Token 文档` 页面整理，用于说明 GeoFlow API Token 的认证方式、权限范围、接口参数和返回数据结构。

> Token 会绑定创建时选择的项目。下面接口只会读取或修改该项目内的数据。

## 调用约定

### 接口地址

```text
https://autogeoflow.com/
```

### 认证 Header

```http
Authorization: Bearer gf_xxx
```

### 支持的语言代码

`target_languages[].code` 和文章 `language_code` 支持以下预设值。中文默认使用 `zh`。

| 语言 | code |
| --- | --- |
| 中文 | `zh` |
| English | `en` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| Português | `pt` |
| Italiano | `it` |
| Nederlands | `nl` |
| Русский | `ru` |
| العربية | `ar` |
| हिन्दी | `hi` |
| Bahasa Indonesia | `id` |
| Tiếng Việt | `vi` |
| ไทย | `th` |
| Türkçe | `tr` |
| Polski | `pl` |
| Bahasa Melayu | `ms` |
| 繁體中文 | `zh-TW` |

### 通用响应结构

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `success` | boolean | 否 | 请求是否成功。 |
| `data` | object \| null | 否 | 接口业务数据。下方每个接口展示的是 data 的结构和示例。 |
| `error` | object \| null | 否 | 错误信息，成功时为 null。 |
| `meta` | object | 否 | 请求元信息，包含 request_id 和 timestamp。 |

POST 和 PATCH 接口支持可选的 `x-idempotency-key` 请求头，用于避免同一请求重复提交。

## 权限范围和接口目录

### `catalog:read` 基础目录

读取创建任务需要的模型、提示词、标题库、作者和分类等基础数据。

- `GET /api/v1/catalog`：后台任务配置目录。

### `blog:read` 轻型博客读取

读取自定义博客前端需要的站点设置、分类作者和已发布文章数据。

- `GET /api/v1/blog/settings`：轻型博客站点设置。
- `GET /api/v1/blog/catalog`：轻型博客分类和作者。
- `GET /api/v1/blog/articles`：轻型博客文章列表，只返回已发布且未删除文章。
- `GET /api/v1/blog/articles/{slug}`：轻型博客文章详情。

### `tasks:read` 任务读取

读取当前 Token 所属项目内的任务、任务详情和 Job 列表。

- `GET /api/v1/tasks`：任务列表。
- `GET /api/v1/tasks/{task}`：任务详情。
- `GET /api/v1/tasks/{task}/jobs`：指定任务的 Job 列表。

### `tasks:write` 任务写入和调度

创建、更新、启动、暂停任务，或手动将任务加入执行队列。

- `POST /api/v1/tasks`：创建任务。
- `PATCH /api/v1/tasks/{task}`：更新任务，传入哪些字段就更新哪些字段。
- `POST /api/v1/tasks/{task}/start`：启动任务。
- `POST /api/v1/tasks/{task}/stop`：暂停任务并取消 pending Job。
- `POST /api/v1/tasks/{task}/enqueue`：手动入队任务。

### `jobs:read` Job 读取

读取单个任务执行 Job 的状态、payload 和执行摘要。

- `GET /api/v1/jobs/{job}`：Job 详情。

### `articles:read` 文章读取

读取后台文章列表和后台文章详情，包含草稿、审核和发布状态。

- `GET /api/v1/articles`：后台文章列表。
- `GET /api/v1/articles/{article}`：后台文章详情。

### `articles:write` 文章写入

创建、更新或移入回收站。不会绕过项目隔离。

- `POST /api/v1/articles`：创建文章。
- `PATCH /api/v1/articles/{article}`：更新文章。
- `POST /api/v1/articles/{article}/trash`：软删除文章。

### `articles:publish` 文章审核和发布

审核文章，或发布已经通过审核的文章。

- `POST /api/v1/articles/{article}/review`：审核文章。
- `POST /api/v1/articles/{article}/publish`：发布已审核文章。

## 基础目录

权限：`catalog:read`

读取创建任务需要的模型、提示词、标题库、作者和分类等基础数据。

### GET `/api/v1/catalog`

后台任务配置目录。

#### 请求参数

无额外请求参数。

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/catalog"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `models` | array | 否 | 可用聊天模型列表。 |
| `prompts` | array | 否 | 内容提示词列表。 |
| `title_libraries` | array | 否 | 标题库列表，包含 title_count。 |
| `knowledge_bases` | array | 否 | 知识库列表。 |
| `authors` | array | 否 | 作者列表。 |
| `categories` | array | 否 | 分类列表。 |
| `languages` | array | 否 | 预设生成语言数组，单项字段为 code、name。 |

#### 返回示例 `data`

```json
{
  "models": [
    {
      "id": 2,
      "name": "GPT Content Model",
      "model_id": "gpt-4.1",
      "model_type": "chat",
      "status": "active"
    }
  ],
  "prompts": [
    {
      "id": 8,
      "name": "SEO Article",
      "type": "content"
    }
  ],
  "title_libraries": [
    {
      "id": 3,
      "name": "Blog Ideas",
      "title_count": 120
    }
  ],
  "knowledge_bases": [
    {
      "id": 4,
      "name": "Product Docs"
    }
  ],
  "authors": [
    {
      "id": 6,
      "name": "Editor"
    }
  ],
  "categories": [
    {
      "id": 9,
      "name": "Guides",
      "slug": "guides"
    }
  ],
  "languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ]
}
```

## 轻型博客读取

权限：`blog:read`

读取自定义博客前端需要的站点设置、分类作者和已发布文章数据。

### GET `/api/v1/blog/settings`

轻型博客站点设置。

#### 请求参数

无额外请求参数。

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/blog/settings"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `site_name` | string | 否 | 站点名称。 |
| `site_subtitle` | string | 否 | 站点副标题。 |
| `site_description` | string | 否 | 站点描述。 |
| `site_keywords` | string | 否 | 站点关键词。 |
| `copyright_info` | string | 否 | 版权信息。 |
| `site_logo` | string | 否 | 站点 Logo 地址。 |
| `site_favicon` | string | 否 | 站点 favicon 地址。 |
| `analytics_code` | string | 否 | 统计代码，可用于自定义博客前端注入分析脚本。 |
| `active_theme` | string | 否 | 当前主题标识。 |
| `featured_limit` | number | 否 | 首页精选数量。 |
| `per_page` | number | 否 | 文章列表每页数量。 |
| `home_carousel_slides` | array | 否 | 启用的首页轮播图。 |
| `article_detail_ad` | object \| null | 否 | 启用的文章详情广告位。 |

#### 返回示例 `data`

```json
{
  "site_name": "Example Blog",
  "site_subtitle": "AI content insights",
  "site_description": "A lightweight GEO blog",
  "site_keywords": "GEO,SEO,AI",
  "copyright_info": "© 2026 Example Blog",
  "site_logo": "https://example.com/logo.png",
  "site_favicon": "https://example.com/favicon.ico",
  "analytics_code": "<script>/* analytics */</script>",
  "active_theme": "toutiao-news-20260426",
  "featured_limit": 5,
  "per_page": 12,
  "home_carousel_slides": [
    {
      "image_url": "https://example.com/banner.jpg",
      "title": "Featured",
      "link_url": "/articles/how-to-build-geo-blog"
    }
  ],
  "article_detail_ad": {
    "id": "default",
    "badge": "Guide",
    "title": "Build your blog",
    "copy": "Use API Token to render a custom frontend.",
    "button_text": "Read more",
    "button_url": "/articles/how-to-build-geo-blog"
  }
}
```

### GET `/api/v1/blog/catalog`

轻型博客分类和作者。

#### 请求参数

无额外请求参数。

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/blog/catalog"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `categories` | array | 否 | 分类数组，字段为 id、name、slug、description。 |
| `authors` | array | 否 | 作者数组，字段为 id、name、bio、avatar、website。 |

#### 返回示例 `data`

```json
{
  "categories": [
    {
      "id": 9,
      "name": "Guides",
      "slug": "guides",
      "description": "Guides and tutorials"
    }
  ],
  "authors": [
    {
      "id": 6,
      "name": "Editor",
      "bio": "Content editor",
      "avatar": "https://example.com/avatar.png",
      "website": "https://example.com"
    }
  ]
}
```

### GET `/api/v1/blog/articles`

轻型博客文章列表，只返回已发布且未删除文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | Query number | 否 | 页码，从 1 开始。 |
| `per_page` | Query number | 否 | 每页数量。多数列表最大 100。 |
| `search` | Query string | 否 | 按标题、摘要或正文搜索。 |
| `category_slug` | Query string | 否 | 按分类 slug 过滤。 |
| `category_id` | Query number | 否 | 按分类 ID 过滤。 |
| `language_code` | Query string | 否 | 按文章语言代码过滤。 |
| `source_title_id` | Query number | 否 | 按原始标题 ID 过滤，可用于查找同一标题的多语言文章。 |
| `featured` | Query boolean | 否 | true 时只返回精选文章。 |
| `hot` | Query boolean | 否 | true 时只返回热门文章。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/blog/articles?page=1&per_page=12&category_slug=guides&language_code=en&featured=true"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | array | 否 | 已发布文章数组，单项字段见轻型博客文章详情。 |
| `pagination` | object | 否 | 分页信息，包含 page、per_page、total、total_pages。 |

#### 返回示例 `data`

```json
{
  "items": [
    {
      "id": 101,
      "title": "How to Build a GEO Blog",
      "slug": "how-to-build-geo-blog",
      "language_code": "en",
      "language_name": "English",
      "source_title_id": 55,
      "excerpt": "Article summary",
      "content": "<p>Article body</p>",
      "cover_image_url": "https://example.com/cover.jpg",
      "keywords": "GEO,SEO,AI",
      "meta_description": "Article SEO description",
      "view_count": 128,
      "is_hot": true,
      "is_featured": false,
      "published_at": "2026-05-16 12:00:00",
      "created_at": "2026-05-16 10:00:00",
      "updated_at": "2026-05-16 11:50:00",
      "category": {
        "id": 9,
        "name": "Guides",
        "slug": "guides",
        "description": "Guides and tutorials"
      },
      "author": {
        "id": 6,
        "name": "Editor",
        "bio": "Content editor",
        "avatar": "https://example.com/avatar.png",
        "website": "https://example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 12,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET `/api/v1/blog/articles/{slug}`

轻型博客文章详情。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `slug` | Path string | 是 | 文章 slug。 |
| `language_code` | Query string | 否 | 按文章语言代码过滤。slug 多语言重复时建议传入。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/blog/articles/how-to-build-geo-blog?language_code=en"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `source_title_id` | number \| null | 否 | 原始标题 ID，多语言同源文章会共享该值。 |
| `excerpt` | string | 否 | 摘要。 |
| `content` | string | 否 | 正文。 |
| `cover_image_url` | string | 否 | 封面图地址。 |
| `keywords` | string | 否 | 关键词。 |
| `meta_description` | string | 否 | SEO 描述。 |
| `view_count` | number | 否 | 浏览数。 |
| `is_hot / is_featured` | boolean | 否 | 热门和精选标记。 |
| `category` | object \| null | 否 | 分类信息。 |
| `author` | object \| null | 否 | 作者信息。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "How to Build a GEO Blog",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "source_title_id": 55,
  "excerpt": "Article summary",
  "content": "<p>Article body</p>",
  "cover_image_url": "https://example.com/cover.jpg",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "view_count": 128,
  "is_hot": true,
  "is_featured": false,
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "category": {
    "id": 9,
    "name": "Guides",
    "slug": "guides",
    "description": "Guides and tutorials"
  },
  "author": {
    "id": 6,
    "name": "Editor",
    "bio": "Content editor",
    "avatar": "https://example.com/avatar.png",
    "website": "https://example.com"
  }
}
```

## 任务读取

权限：`tasks:read`

读取当前 Token 所属项目内的任务、任务详情和 Job 列表。

### GET `/api/v1/tasks`

任务列表。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | Query number | 否 | 页码，从 1 开始。 |
| `per_page` | Query number | 否 | 每页数量。多数列表最大 100。 |
| `status` | Query string | 否 | 按任务状态过滤。 |
| `search` | Query string | 否 | 按任务名称搜索。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/tasks?page=1&per_page=20&status=active&search=blog"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | array | 否 | 任务数组，单项字段见任务详情。 |
| `pagination` | object | 否 | 分页信息，包含 page、per_page、total、total_pages。 |

#### 返回示例 `data`

```json
{
  "items": [
    {
      "id": 12,
      "name": "Daily GEO Blog",
      "status": "active",
      "title_library_id": 3,
      "prompt_id": 8,
      "ai_model_id": 2,
      "knowledge_base_id": 4,
      "author_id": 6,
      "image_library_id": 5,
      "image_count": 1,
      "need_review": 1,
      "auto_keywords": 1,
      "auto_description": 1,
      "is_loop": 0,
      "category_mode": "smart",
      "fixed_category_id": null,
      "model_selection_mode": "fixed",
      "target_languages": [
        {
          "code": "zh",
          "name": "中文"
        },
        {
          "code": "en",
          "name": "English"
        }
      ],
      "media_config": {},
      "batch_status": "waiting",
      "latest_job_status": "idle",
      "total_articles": 18,
      "published_articles": 12,
      "draft_articles": 6,
      "pending_jobs": 0,
      "running_jobs": 0,
      "task_progress": {
        "created_articles": 18,
        "published_articles": 12,
        "draft_articles": 6,
        "article_limit": 30,
        "draft_limit": 10
      },
      "queue_overview": {
        "pending": 0,
        "running": 0,
        "failed": 0,
        "completed": 18,
        "latest_status": "idle"
      },
      "created_at": "2026-05-16 10:00:00",
      "updated_at": "2026-05-16 10:30:00",
      "next_run_at": "2026-05-16 11:00:00",
      "next_publish_at": "2026-05-16 12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET `/api/v1/tasks/{task}`

任务详情。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `task` | Path number | 是 | 任务 ID。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/tasks/12"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 任务 ID。 |
| `name` | string | 否 | 任务名称。 |
| `status` | string | 否 | 任务状态，active 或 paused。 |
| `title_library_id / prompt_id / ai_model_id` | number \| null | 否 | 标题库、提示词、AI 模型 ID。 |
| `knowledge_base_id / author_id / image_library_id` | number \| null | 否 | 知识库、作者、图片库 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | number | 否 | 任务开关字段，1 表示启用，0 表示关闭。 |
| `category_mode / fixed_category_id` | string / number \| null | 否 | 分类模式和固定分类 ID。 |
| `media_config` | object | 否 | 文章媒体生成配置。 |
| `target_languages` | array | 否 | 任务生成语言数组，单项字段为 code、name。 |
| `batch_status / latest_job_status` | string | 否 | 批次状态和最近 Job 状态。 |
| `total_articles / published_articles / draft_articles` | number | 否 | 任务产出文章统计。 |
| `pending_jobs / running_jobs` | number | 否 | 队列中和运行中的 Job 数量。 |
| `task_progress / queue_overview` | object | 否 | 任务进度和队列摘要。 |
| `created_at / updated_at / next_run_at / next_publish_at` | string \| null | 否 | 任务相关时间。 |

#### 返回示例 `data`

```json
{
  "id": 12,
  "name": "Daily GEO Blog",
  "status": "active",
  "title_library_id": 3,
  "prompt_id": 8,
  "ai_model_id": 2,
  "knowledge_base_id": 4,
  "author_id": 6,
  "image_library_id": 5,
  "image_count": 1,
  "need_review": 1,
  "auto_keywords": 1,
  "auto_description": 1,
  "is_loop": 0,
  "category_mode": "smart",
  "fixed_category_id": null,
  "model_selection_mode": "fixed",
  "target_languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ],
  "media_config": {},
  "batch_status": "waiting",
  "latest_job_status": "idle",
  "total_articles": 18,
  "published_articles": 12,
  "draft_articles": 6,
  "pending_jobs": 0,
  "running_jobs": 0,
  "task_progress": {
    "created_articles": 18,
    "published_articles": 12,
    "draft_articles": 6,
    "article_limit": 30,
    "draft_limit": 10
  },
  "queue_overview": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "completed": 18,
    "latest_status": "idle"
  },
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 10:30:00",
  "next_run_at": "2026-05-16 11:00:00",
  "next_publish_at": "2026-05-16 12:00:00"
}
```

### GET `/api/v1/tasks/{task}/jobs`

指定任务的 Job 列表。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `task` | Path number | 是 | 任务 ID。 |
| `status` | Query string | 否 | 按 Job 状态过滤。 |
| `limit` | Query number | 否 | 返回数量，最大 100。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/tasks/12/jobs?status=completed&limit=20"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | array | 否 | Job 数组，包含 id、task_id、status、article_id、error_message、duration_ms、meta 和时间字段。 |

#### 返回示例 `data`

```json
{
  "items": [
    {
      "id": 3001,
      "task_id": 12,
      "status": "completed",
      "article_id": 101,
      "error_message": "",
      "duration_ms": 58234,
      "meta": {
        "job_type": "generate_article"
      },
      "started_at": "2026-05-16 10:01:00",
      "finished_at": "2026-05-16 10:02:00",
      "created_at": "2026-05-16 10:00:59"
    }
  ]
}
```

## 任务写入和调度

权限：`tasks:write`

创建、更新、启动、暂停任务，或手动将任务加入执行队列。

### POST `/api/v1/tasks`

创建任务。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `name` | Body string | 是 | 任务名称。 |
| `title_library_id` | Body number | 是 | 标题库 ID。 |
| `prompt_id` | Body number | 是 | 内容提示词 ID。 |
| `ai_model_id` | Body number | 是 | AI 模型 ID。 |
| `image_library_id / author_id / knowledge_base_id` | Body number | 否 | 可选关联资源 ID。 |
| `fixed_category_id / publish_site_id` | Body number | 否 | 固定分类和发布站点 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | Body boolean \| number | 否 | 任务开关字段。 |
| `image_count / publish_interval / draft_limit / article_limit` | Body number | 否 | 图片数量、发布间隔、草稿上限、文章上限。 |
| `category_mode / model_selection_mode / status` | Body string | 否 | 分类模式、模型选择模式、初始任务状态。 |
| `target_languages` | Body array | 否 | 生成语言数组，单项字段为 code、name；不传默认中文。 |
| `media_config` | Body object | 否 | 媒体生成配置。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/tasks",
  "headers": {
    "Content-Type": "application/json",
    "x-idempotency-key": "create-task-001"
  },
  "body": {
    "name": "Daily GEO Blog",
    "title_library_id": 3,
    "prompt_id": 8,
    "ai_model_id": 2,
    "author_id": 6,
    "category_mode": "smart",
    "draft_limit": 10,
    "article_limit": 30,
    "publish_interval": 3600,
    "target_languages": [
      {
        "code": "zh",
        "name": "中文"
      },
      {
        "code": "en",
        "name": "English"
      }
    ],
    "status": "active"
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 任务 ID。 |
| `name` | string | 否 | 任务名称。 |
| `status` | string | 否 | 任务状态，active 或 paused。 |
| `title_library_id / prompt_id / ai_model_id` | number \| null | 否 | 标题库、提示词、AI 模型 ID。 |
| `knowledge_base_id / author_id / image_library_id` | number \| null | 否 | 知识库、作者、图片库 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | number | 否 | 任务开关字段，1 表示启用，0 表示关闭。 |
| `category_mode / fixed_category_id` | string / number \| null | 否 | 分类模式和固定分类 ID。 |
| `media_config` | object | 否 | 文章媒体生成配置。 |
| `target_languages` | array | 否 | 任务生成语言数组，单项字段为 code、name。 |
| `batch_status / latest_job_status` | string | 否 | 批次状态和最近 Job 状态。 |
| `total_articles / published_articles / draft_articles` | number | 否 | 任务产出文章统计。 |
| `pending_jobs / running_jobs` | number | 否 | 队列中和运行中的 Job 数量。 |
| `task_progress / queue_overview` | object | 否 | 任务进度和队列摘要。 |
| `created_at / updated_at / next_run_at / next_publish_at` | string \| null | 否 | 任务相关时间。 |

#### 返回示例 `data`

```json
{
  "id": 12,
  "name": "Daily GEO Blog",
  "status": "active",
  "title_library_id": 3,
  "prompt_id": 8,
  "ai_model_id": 2,
  "knowledge_base_id": 4,
  "author_id": 6,
  "image_library_id": 5,
  "image_count": 1,
  "need_review": 1,
  "auto_keywords": 1,
  "auto_description": 1,
  "is_loop": 0,
  "category_mode": "smart",
  "fixed_category_id": null,
  "model_selection_mode": "fixed",
  "target_languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ],
  "media_config": {},
  "batch_status": "waiting",
  "latest_job_status": "idle",
  "total_articles": 18,
  "published_articles": 12,
  "draft_articles": 6,
  "pending_jobs": 0,
  "running_jobs": 0,
  "task_progress": {
    "created_articles": 18,
    "published_articles": 12,
    "draft_articles": 6,
    "article_limit": 30,
    "draft_limit": 10
  },
  "queue_overview": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "completed": 18,
    "latest_status": "idle"
  },
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 10:30:00",
  "next_run_at": "2026-05-16 11:00:00",
  "next_publish_at": "2026-05-16 12:00:00"
}
```

### PATCH `/api/v1/tasks/{task}`

更新任务，传入哪些字段就更新哪些字段。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `task` | Path number | 是 | 任务 ID。 |
| `name / status / draft_limit / article_limit 等` | Body mixed | 否 | 可传字段同创建任务，未传字段保持不变。 |

#### 请求示例

```json
{
  "method": "PATCH",
  "url": "/api/v1/tasks/12",
  "headers": {
    "Content-Type": "application/json",
    "x-idempotency-key": "update-task-012"
  },
  "body": {
    "name": "Daily GEO Blog Updated",
    "status": "paused",
    "target_languages": [
      {
        "code": "ja",
        "name": "日本語"
      }
    ],
    "draft_limit": 8
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 任务 ID。 |
| `name` | string | 否 | 任务名称。 |
| `status` | string | 否 | 任务状态，active 或 paused。 |
| `title_library_id / prompt_id / ai_model_id` | number \| null | 否 | 标题库、提示词、AI 模型 ID。 |
| `knowledge_base_id / author_id / image_library_id` | number \| null | 否 | 知识库、作者、图片库 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | number | 否 | 任务开关字段，1 表示启用，0 表示关闭。 |
| `category_mode / fixed_category_id` | string / number \| null | 否 | 分类模式和固定分类 ID。 |
| `media_config` | object | 否 | 文章媒体生成配置。 |
| `target_languages` | array | 否 | 任务生成语言数组，单项字段为 code、name。 |
| `batch_status / latest_job_status` | string | 否 | 批次状态和最近 Job 状态。 |
| `total_articles / published_articles / draft_articles` | number | 否 | 任务产出文章统计。 |
| `pending_jobs / running_jobs` | number | 否 | 队列中和运行中的 Job 数量。 |
| `task_progress / queue_overview` | object | 否 | 任务进度和队列摘要。 |
| `created_at / updated_at / next_run_at / next_publish_at` | string \| null | 否 | 任务相关时间。 |

#### 返回示例 `data`

```json
{
  "id": 12,
  "name": "Daily GEO Blog Updated",
  "status": "paused",
  "title_library_id": 3,
  "prompt_id": 8,
  "ai_model_id": 2,
  "knowledge_base_id": 4,
  "author_id": 6,
  "image_library_id": 5,
  "image_count": 1,
  "need_review": 1,
  "auto_keywords": 1,
  "auto_description": 1,
  "is_loop": 0,
  "category_mode": "smart",
  "fixed_category_id": null,
  "model_selection_mode": "fixed",
  "target_languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ],
  "media_config": {},
  "batch_status": "waiting",
  "latest_job_status": "idle",
  "total_articles": 18,
  "published_articles": 12,
  "draft_articles": 6,
  "pending_jobs": 0,
  "running_jobs": 0,
  "task_progress": {
    "created_articles": 18,
    "published_articles": 12,
    "draft_articles": 6,
    "article_limit": 30,
    "draft_limit": 10
  },
  "queue_overview": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "completed": 18,
    "latest_status": "idle"
  },
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 10:30:00",
  "next_run_at": "2026-05-16 11:00:00",
  "next_publish_at": "2026-05-16 12:00:00"
}
```

### POST `/api/v1/tasks/{task}/start`

启动任务。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `task` | Path number | 是 | 任务 ID。 |
| `enqueue_now` | Body boolean | 否 | 是否立即创建一个 Job。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/tasks/12/start",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "enqueue_now": true
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 任务 ID。 |
| `name` | string | 否 | 任务名称。 |
| `status` | string | 否 | 任务状态，active 或 paused。 |
| `title_library_id / prompt_id / ai_model_id` | number \| null | 否 | 标题库、提示词、AI 模型 ID。 |
| `knowledge_base_id / author_id / image_library_id` | number \| null | 否 | 知识库、作者、图片库 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | number | 否 | 任务开关字段，1 表示启用，0 表示关闭。 |
| `category_mode / fixed_category_id` | string / number \| null | 否 | 分类模式和固定分类 ID。 |
| `media_config` | object | 否 | 文章媒体生成配置。 |
| `target_languages` | array | 否 | 任务生成语言数组，单项字段为 code、name。 |
| `batch_status / latest_job_status` | string | 否 | 批次状态和最近 Job 状态。 |
| `total_articles / published_articles / draft_articles` | number | 否 | 任务产出文章统计。 |
| `pending_jobs / running_jobs` | number | 否 | 队列中和运行中的 Job 数量。 |
| `task_progress / queue_overview` | object | 否 | 任务进度和队列摘要。 |
| `created_at / updated_at / next_run_at / next_publish_at` | string \| null | 否 | 任务相关时间。 |
| `started_job_id` | number | 否 | 立即入队时返回的 Job ID。 |

#### 返回示例 `data`

```json
{
  "id": 12,
  "name": "Daily GEO Blog",
  "status": "active",
  "title_library_id": 3,
  "prompt_id": 8,
  "ai_model_id": 2,
  "knowledge_base_id": 4,
  "author_id": 6,
  "image_library_id": 5,
  "image_count": 1,
  "need_review": 1,
  "auto_keywords": 1,
  "auto_description": 1,
  "is_loop": 0,
  "category_mode": "smart",
  "fixed_category_id": null,
  "model_selection_mode": "fixed",
  "target_languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ],
  "media_config": {},
  "batch_status": "waiting",
  "latest_job_status": "idle",
  "total_articles": 18,
  "published_articles": 12,
  "draft_articles": 6,
  "pending_jobs": 0,
  "running_jobs": 0,
  "task_progress": {
    "created_articles": 18,
    "published_articles": 12,
    "draft_articles": 6,
    "article_limit": 30,
    "draft_limit": 10
  },
  "queue_overview": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "completed": 18,
    "latest_status": "idle"
  },
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 10:30:00",
  "next_run_at": "2026-05-16 11:00:00",
  "next_publish_at": "2026-05-16 12:00:00",
  "started_job_id": 3002
}
```

### POST `/api/v1/tasks/{task}/stop`

暂停任务并取消 pending Job。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `task` | Path number | 是 | 任务 ID。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/tasks/12/stop",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {}
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 任务 ID。 |
| `name` | string | 否 | 任务名称。 |
| `status` | string | 否 | 任务状态，active 或 paused。 |
| `title_library_id / prompt_id / ai_model_id` | number \| null | 否 | 标题库、提示词、AI 模型 ID。 |
| `knowledge_base_id / author_id / image_library_id` | number \| null | 否 | 知识库、作者、图片库 ID。 |
| `need_review / auto_keywords / auto_description / is_loop` | number | 否 | 任务开关字段，1 表示启用，0 表示关闭。 |
| `category_mode / fixed_category_id` | string / number \| null | 否 | 分类模式和固定分类 ID。 |
| `media_config` | object | 否 | 文章媒体生成配置。 |
| `target_languages` | array | 否 | 任务生成语言数组，单项字段为 code、name。 |
| `batch_status / latest_job_status` | string | 否 | 批次状态和最近 Job 状态。 |
| `total_articles / published_articles / draft_articles` | number | 否 | 任务产出文章统计。 |
| `pending_jobs / running_jobs` | number | 否 | 队列中和运行中的 Job 数量。 |
| `task_progress / queue_overview` | object | 否 | 任务进度和队列摘要。 |
| `created_at / updated_at / next_run_at / next_publish_at` | string \| null | 否 | 任务相关时间。 |
| `cancelled_jobs` | number | 否 | 被取消的 pending Job 数量。 |
| `running_jobs` | number | 否 | 仍在运行的 Job 数量。 |

#### 返回示例 `data`

```json
{
  "id": 12,
  "name": "Daily GEO Blog",
  "status": "paused",
  "title_library_id": 3,
  "prompt_id": 8,
  "ai_model_id": 2,
  "knowledge_base_id": 4,
  "author_id": 6,
  "image_library_id": 5,
  "image_count": 1,
  "need_review": 1,
  "auto_keywords": 1,
  "auto_description": 1,
  "is_loop": 0,
  "category_mode": "smart",
  "fixed_category_id": null,
  "model_selection_mode": "fixed",
  "target_languages": [
    {
      "code": "zh",
      "name": "中文"
    },
    {
      "code": "en",
      "name": "English"
    }
  ],
  "media_config": {},
  "batch_status": "waiting",
  "latest_job_status": "idle",
  "total_articles": 18,
  "published_articles": 12,
  "draft_articles": 6,
  "pending_jobs": 0,
  "running_jobs": 0,
  "task_progress": {
    "created_articles": 18,
    "published_articles": 12,
    "draft_articles": 6,
    "article_limit": 30,
    "draft_limit": 10
  },
  "queue_overview": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "completed": 18,
    "latest_status": "idle"
  },
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 10:30:00",
  "next_run_at": "2026-05-16 11:00:00",
  "next_publish_at": "2026-05-16 12:00:00",
  "cancelled_jobs": 1
}
```

### POST `/api/v1/tasks/{task}/enqueue`

手动入队任务。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `task` | Path number | 是 | 任务 ID。 |
| `job_type` | Body string | 否 | Job 类型，默认 generate_article。 |
| `其他字段` | Body mixed | 否 | 会写入 Job payload，供执行器使用。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/tasks/12/enqueue",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "job_type": "generate_article",
    "source": "manual"
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `task_id` | number | 否 | 任务 ID。 |
| `job_id` | number | 否 | 新创建的 Job ID。 |
| `status` | string | 否 | Job 初始状态。 |

#### 返回示例 `data`

```json
{
  "task_id": 12,
  "job_id": 3002,
  "status": "pending"
}
```

## Job 读取

权限：`jobs:read`

读取单个任务执行 Job 的状态、payload 和执行摘要。

### GET `/api/v1/jobs/{job}`

Job 详情。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `job` | Path number | 是 | Job ID。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/jobs/3001"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | Job ID。 |
| `task_id` | number | 否 | 任务 ID。 |
| `job_type` | string | 否 | Job 类型。 |
| `status` | string | 否 | Job 状态。 |
| `attempt_count / max_attempts` | number | 否 | 已尝试次数和最大尝试次数。 |
| `worker_id` | string \| null | 否 | 执行节点 ID。 |
| `payload` | object | 否 | 入队时写入的 payload。 |
| `task_run_summary` | object | 否 | 执行摘要，包含 article_id、duration_ms、status、error_message、meta。 |

#### 返回示例 `data`

```json
{
  "id": 3001,
  "task_id": 12,
  "job_type": "generate_article",
  "status": "completed",
  "attempt_count": 1,
  "max_attempts": 3,
  "worker_id": "node-1",
  "claimed_at": "2026-05-16 10:01:00",
  "finished_at": "2026-05-16 10:02:00",
  "error_message": "",
  "payload": {
    "source": "manual"
  },
  "task_run_summary": {
    "article_id": 101,
    "duration_ms": 58234,
    "status": "completed",
    "error_message": "",
    "meta": {
      "job_type": "generate_article"
    }
  }
}
```

## 文章读取

权限：`articles:read`

读取后台文章列表和后台文章详情，包含草稿、审核和发布状态。

### GET `/api/v1/articles`

后台文章列表。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | Query number | 否 | 页码，从 1 开始。 |
| `per_page` | Query number | 否 | 每页数量。多数列表最大 100。 |
| `task_id` | Query number | 否 | 按任务 ID 过滤。 |
| `author_id` | Query number | 否 | 按作者 ID 过滤。 |
| `status` | Query string | 否 | 按文章状态过滤。 |
| `review_status` | Query string | 否 | 按审核状态过滤。 |
| `language_code` | Query string | 否 | 按文章语言代码过滤。 |
| `search` | Query string | 否 | 按标题或正文搜索。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/articles?page=1&per_page=20&status=published&language_code=en"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | array | 否 | 文章列表，包含 id、title、slug、status、review_status、task_id、author_id、category_id 和时间字段。 |
| `pagination` | object | 否 | 分页信息，包含 page、per_page、total、total_pages。 |

#### 返回示例 `data`

```json
{
  "items": [
    {
      "id": 101,
      "title": "How to Build a GEO Blog",
      "slug": "how-to-build-geo-blog",
      "language_code": "en",
      "language_name": "English",
      "status": "published",
      "review_status": "approved",
      "task_id": 12,
      "author_id": 6,
      "category_id": 9,
      "published_at": "2026-05-16 12:00:00",
      "created_at": "2026-05-16 10:00:00",
      "updated_at": "2026-05-16 11:50:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET `/api/v1/articles/{article}`

后台文章详情。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `article` | Path number | 是 | 文章 ID。 |

#### 请求示例

```json
{
  "method": "GET",
  "url": "/api/v1/articles/101"
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `content` | string | 否 | 文章正文 HTML 或文本。 |
| `excerpt` | string \| null | 否 | 文章摘要。 |
| `keywords` | string \| null | 否 | SEO 关键词。 |
| `meta_description` | string \| null | 否 | SEO 描述。 |
| `cover_image_url` | string | 否 | 封面图地址，没有时为空字符串。 |
| `media_status` | string | 否 | 媒体生成状态。 |
| `status` | string | 否 | 文章状态。 |
| `review_status` | string | 否 | 审核状态。 |
| `task_id` | number \| null | 否 | 关联任务 ID。 |
| `task_name` | string \| null | 否 | 关联任务名称。 |
| `author_id` | number | 否 | 作者 ID。 |
| `author_name` | string \| null | 否 | 作者名称。 |
| `category_id` | number | 否 | 分类 ID。 |
| `category_name` | string \| null | 否 | 分类名称。 |
| `images` | array | 否 | 文章图片数组。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "How to Build a GEO Blog",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "content": "<p>Article body</p>",
  "excerpt": "Article summary",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "cover_image_url": "https://example.com/cover.jpg",
  "media_status": "none",
  "status": "published",
  "review_status": "approved",
  "task_id": 12,
  "task_name": "Daily GEO Blog",
  "author_id": 6,
  "author_name": "Editor",
  "category_id": 9,
  "category_name": "Guides",
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "images": [
    {
      "id": 1,
      "image_id": 88,
      "position": 0,
      "file_path": "/uploads/article.jpg",
      "original_name": "article.jpg"
    }
  ]
}
```

## 文章写入

权限：`articles:write`

创建、更新或移入回收站。不会绕过项目隔离。

### POST `/api/v1/articles`

创建文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `title` | Body string | 是 | 文章标题。 |
| `content` | Body string | 是 | 文章正文。 |
| `category_id` | Body number | 是 | 分类 ID。 |
| `author_id` | Body number | 是 | 作者 ID。 |
| `slug` | Body string | 否 | 文章 slug，不传时自动生成。 |
| `language_code` | Body string | 否 | 文章语言代码，不传默认 zh。 |
| `language_name` | Body string | 否 | 文章语言名称，不传默认中文。 |
| `excerpt` | Body string | 否 | 文章摘要。 |
| `keywords` | Body string | 否 | SEO 关键词。 |
| `meta_description` | Body string | 否 | SEO 描述。 |
| `task_id` | Body number | 否 | 关联任务 ID。 |
| `status` | Body string | 否 | 文章状态。 |
| `review_status` | Body string | 否 | 审核状态。 |
| `is_ai_generated` | Body boolean \| number | 否 | 是否 AI 生成。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/articles",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "title": "How to Build a GEO Blog",
    "content": "<p>Article body</p>",
    "category_id": 9,
    "author_id": 6,
    "slug": "how-to-build-geo-blog",
    "language_code": "en",
    "language_name": "English",
    "status": "draft",
    "review_status": "pending"
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `content` | string | 否 | 文章正文 HTML 或文本。 |
| `excerpt` | string \| null | 否 | 文章摘要。 |
| `keywords` | string \| null | 否 | SEO 关键词。 |
| `meta_description` | string \| null | 否 | SEO 描述。 |
| `cover_image_url` | string | 否 | 封面图地址，没有时为空字符串。 |
| `media_status` | string | 否 | 媒体生成状态。 |
| `status` | string | 否 | 文章状态。 |
| `review_status` | string | 否 | 审核状态。 |
| `task_id` | number \| null | 否 | 关联任务 ID。 |
| `task_name` | string \| null | 否 | 关联任务名称。 |
| `author_id` | number | 否 | 作者 ID。 |
| `author_name` | string \| null | 否 | 作者名称。 |
| `category_id` | number | 否 | 分类 ID。 |
| `category_name` | string \| null | 否 | 分类名称。 |
| `images` | array | 否 | 文章图片数组。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "How to Build a GEO Blog",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "content": "<p>Article body</p>",
  "excerpt": "Article summary",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "cover_image_url": "https://example.com/cover.jpg",
  "media_status": "none",
  "status": "published",
  "review_status": "approved",
  "task_id": 12,
  "task_name": "Daily GEO Blog",
  "author_id": 6,
  "author_name": "Editor",
  "category_id": 9,
  "category_name": "Guides",
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "images": [
    {
      "id": 1,
      "image_id": 88,
      "position": 0,
      "file_path": "/uploads/article.jpg",
      "original_name": "article.jpg"
    }
  ]
}
```

### PATCH `/api/v1/articles/{article}`

更新文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `article` | Path number | 是 | 文章 ID。 |
| `title / content / excerpt / keywords / meta_description` | Body string | 否 | 文章基础内容字段。 |
| `language_code / language_name` | Body string | 否 | 文章语言代码和语言名称。 |
| `category_id / author_id / task_id` | Body number | 否 | 关联资源 ID。 |
| `slug` | Body string | 否 | 文章 slug。 |

#### 请求示例

```json
{
  "method": "PATCH",
  "url": "/api/v1/articles/101",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "title": "Updated GEO Blog Guide",
    "language_code": "en",
    "language_name": "English",
    "excerpt": "Updated summary"
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `content` | string | 否 | 文章正文 HTML 或文本。 |
| `excerpt` | string \| null | 否 | 文章摘要。 |
| `keywords` | string \| null | 否 | SEO 关键词。 |
| `meta_description` | string \| null | 否 | SEO 描述。 |
| `cover_image_url` | string | 否 | 封面图地址，没有时为空字符串。 |
| `media_status` | string | 否 | 媒体生成状态。 |
| `status` | string | 否 | 文章状态。 |
| `review_status` | string | 否 | 审核状态。 |
| `task_id` | number \| null | 否 | 关联任务 ID。 |
| `task_name` | string \| null | 否 | 关联任务名称。 |
| `author_id` | number | 否 | 作者 ID。 |
| `author_name` | string \| null | 否 | 作者名称。 |
| `category_id` | number | 否 | 分类 ID。 |
| `category_name` | string \| null | 否 | 分类名称。 |
| `images` | array | 否 | 文章图片数组。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "Updated GEO Blog Guide",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "content": "<p>Article body</p>",
  "excerpt": "Updated summary",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "cover_image_url": "https://example.com/cover.jpg",
  "media_status": "none",
  "status": "published",
  "review_status": "approved",
  "task_id": 12,
  "task_name": "Daily GEO Blog",
  "author_id": 6,
  "author_name": "Editor",
  "category_id": 9,
  "category_name": "Guides",
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "images": [
    {
      "id": 1,
      "image_id": 88,
      "position": 0,
      "file_path": "/uploads/article.jpg",
      "original_name": "article.jpg"
    }
  ]
}
```

### POST `/api/v1/articles/{article}/trash`

软删除文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `article` | Path number | 是 | 文章 ID。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/articles/101/trash",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {}
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 被删除的文章 ID。 |
| `trashed` | boolean | 否 | 是否已移入回收站。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "trashed": true
}
```

## 文章审核和发布

权限：`articles:publish`

审核文章，或发布已经通过审核的文章。

### POST `/api/v1/articles/{article}/review`

审核文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `article` | Path number | 是 | 文章 ID。 |
| `review_status` | Body string | 是 | 审核状态：pending、approved、rejected、auto_approved。 |
| `review_note` | Body string | 否 | 审核备注。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/articles/101/review",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "review_status": "approved",
    "review_note": "Ready to publish"
  }
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `content` | string | 否 | 文章正文 HTML 或文本。 |
| `excerpt` | string \| null | 否 | 文章摘要。 |
| `keywords` | string \| null | 否 | SEO 关键词。 |
| `meta_description` | string \| null | 否 | SEO 描述。 |
| `cover_image_url` | string | 否 | 封面图地址，没有时为空字符串。 |
| `media_status` | string | 否 | 媒体生成状态。 |
| `status` | string | 否 | 文章状态。 |
| `review_status` | string | 否 | 审核状态。 |
| `task_id` | number \| null | 否 | 关联任务 ID。 |
| `task_name` | string \| null | 否 | 关联任务名称。 |
| `author_id` | number | 否 | 作者 ID。 |
| `author_name` | string \| null | 否 | 作者名称。 |
| `category_id` | number | 否 | 分类 ID。 |
| `category_name` | string \| null | 否 | 分类名称。 |
| `images` | array | 否 | 文章图片数组。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "How to Build a GEO Blog",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "content": "<p>Article body</p>",
  "excerpt": "Article summary",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "cover_image_url": "https://example.com/cover.jpg",
  "media_status": "none",
  "status": "published",
  "review_status": "approved",
  "task_id": 12,
  "task_name": "Daily GEO Blog",
  "author_id": 6,
  "author_name": "Editor",
  "category_id": 9,
  "category_name": "Guides",
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "images": [
    {
      "id": 1,
      "image_id": 88,
      "position": 0,
      "file_path": "/uploads/article.jpg",
      "original_name": "article.jpg"
    }
  ]
}
```

### POST `/api/v1/articles/{article}/publish`

发布已审核文章。

#### 请求参数

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `Content-Type` | Header string | 是 | JSON 请求体接口使用 application/json。 |
| `x-idempotency-key` | Header string | 否 | 可选幂等键。POST 和 PATCH 接口传入后，相同请求可安全重放。 |
| `article` | Path number | 是 | 文章 ID。 |

#### 请求示例

```json
{
  "method": "POST",
  "url": "/api/v1/articles/101/publish",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {}
}
```

#### 返回参数 `data`

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 否 | 文章 ID。 |
| `title` | string | 否 | 文章标题。 |
| `slug` | string | 否 | 文章 slug。 |
| `language_code` | string | 否 | 文章语言代码。 |
| `language_name` | string | 否 | 文章语言名称。 |
| `content` | string | 否 | 文章正文 HTML 或文本。 |
| `excerpt` | string \| null | 否 | 文章摘要。 |
| `keywords` | string \| null | 否 | SEO 关键词。 |
| `meta_description` | string \| null | 否 | SEO 描述。 |
| `cover_image_url` | string | 否 | 封面图地址，没有时为空字符串。 |
| `media_status` | string | 否 | 媒体生成状态。 |
| `status` | string | 否 | 文章状态。 |
| `review_status` | string | 否 | 审核状态。 |
| `task_id` | number \| null | 否 | 关联任务 ID。 |
| `task_name` | string \| null | 否 | 关联任务名称。 |
| `author_id` | number | 否 | 作者 ID。 |
| `author_name` | string \| null | 否 | 作者名称。 |
| `category_id` | number | 否 | 分类 ID。 |
| `category_name` | string \| null | 否 | 分类名称。 |
| `images` | array | 否 | 文章图片数组。 |
| `published_at / created_at / updated_at` | string \| null | 否 | 发布时间、创建时间、更新时间。 |

#### 返回示例 `data`

```json
{
  "id": 101,
  "title": "How to Build a GEO Blog",
  "slug": "how-to-build-geo-blog",
  "language_code": "en",
  "language_name": "English",
  "content": "<p>Article body</p>",
  "excerpt": "Article summary",
  "keywords": "GEO,SEO,AI",
  "meta_description": "Article SEO description",
  "cover_image_url": "https://example.com/cover.jpg",
  "media_status": "none",
  "status": "published",
  "review_status": "approved",
  "task_id": 12,
  "task_name": "Daily GEO Blog",
  "author_id": 6,
  "author_name": "Editor",
  "category_id": 9,
  "category_name": "Guides",
  "published_at": "2026-05-16 12:00:00",
  "created_at": "2026-05-16 10:00:00",
  "updated_at": "2026-05-16 11:50:00",
  "images": [
    {
      "id": 1,
      "image_id": 88,
      "position": 0,
      "file_path": "/uploads/article.jpg",
      "original_name": "article.jpg"
    }
  ]
}
```
