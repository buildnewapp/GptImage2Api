# AI Studio Overrides

这份文档说明 `config/ai-studio/overrides/` 下这些文件的用途和当前支持的配置项：

- `models.json`
- `pricing.json`
- `schema.json`
- `form-ui.json`

## models.json 是干什么的

`models.json` 是 AI Studio 运行时模型目录的本地覆盖层。它不直接调用 provider，也不是上游原始目录，而是在构建 runtime catalog 时对上游模型做修正。

当前链路是：

1. 上游输入：`config/ai-studio/upstream/catalog.json`、`apimart.json`、`fal.json`
2. 本地覆盖：`config/ai-studio/overrides/models.json`
3. 价格覆盖：`config/ai-studio/overrides/pricing.json`
4. 表单覆盖：`config/ai-studio/overrides/form-ui.json`
5. Schema 覆盖：`config/ai-studio/overrides/schema.json`
6. 最终运行态：`config/ai-studio/runtime/catalog.json`

前台和 API 运行时主要读取 `runtime/catalog.json`。所以改完 `models.json` 后，需要重新生成 runtime catalog，最终效果以 `runtime/catalog.json` 为准。

核心代码在 `lib/ai-studio/catalog.ts`：

- `AiStudioModelOverride` 定义 `models.json` 支持的顶层字段
- `AiStudioPricingOverrideBucket` 定义 `pricing.json` 支持的价格字段
- `AiStudioSchemaModelOverride` 定义 `schema.json` 支持的 schema 覆盖字段
- `AiStudioFormUiModelOverride` 定义 `form-ui.json` 支持的表单 UI 字段
- `compileAiStudioRuntimeCatalog()` 把上游目录和 overrides 合并成 runtime catalog
- `applyModelOverrideToDetail()` 应用普通模型覆盖
- `createSplitModelDetail()` 处理模型拆分
- `rewriteSchemaModel()` 重写请求 schema 里的 `model`

## 文件结构

```json
{
  "models": {
    "<上游模型 id>": {
      "alias": "公开别名",
      "title": "展示标题",
      "provider": "展示用 provider",
      "schemaModel": "真实 payload.model",
      "splitModels": [],
      "resultArtifacts": []
    }
  }
}
```

`models` 里的 key 必须是上游目录里存在的模型 id，除非是在 `splitModels[].id` 中新增拆分后的运行时模型 id。

## 字段说明

### enabled

类型：`boolean`

设为 `false` 时禁用某个上游模型。编译 runtime catalog 时这个模型会被过滤掉。

```json
{
  "models": {
    "video:some-upstream-model": {
      "enabled": false
    }
  }
}
```

当前 `models.json` 没有使用 `enabled:false`。

### alias

类型：`string | null`

给模型设置公开别名。runtime catalog 内部仍保留原始 `id`，但公开 API 会用 `alias` 生成对外模型 id。

例如：

```json
{
  "models": {
    "video:ama-seedance-2-0": {
      "alias": "seedance-2-0"
    }
  }
}
```

对外会暴露为：

```text
video:seedance-2-0
```

执行时如果请求里的 `model` 等于公开 alias，`lib/ai-studio/execute.ts` 会把它映射回 runtime detail 里的真实 `modelKeys[0]`。

适合用在这些场景：

- 上游 id 太长或带 provider 前缀
- 希望前台/API 暴露更稳定的模型名
- 同一个 provider 迁移后希望外部 id 不变

注意：`alias` 不是 provider 真实模型名。真实请求里的 `payload.model` 应该用 `schemaModel` 控制。

### title

类型：`string`

覆盖模型展示标题，只影响目录展示和前端文案，不改变请求地址、provider 或真实模型值。

```json
{
  "models": {
    "video:bytedance-seedance-2": {
      "title": "Seedance 2.0 VIP"
    }
  }
}
```

### provider

类型：`string`

覆盖模型展示用 provider 名称，只影响目录展示、筛选、生成记录里的展示信息，不改变真实调用地址。

```json
{
  "models": {
    "video:bytedance-seedance-2": {
      "provider": "ByteDance"
    }
  }
}
```

### schemaModel

类型：`string`

重写这个模型请求 schema 里的 `model` 值，也就是实际提交给 provider 的 `payload.model`。

它会同时修改：

- `detail.modelKeys`
- `detail.examplePayload.model`
- `detail.requestSchema.properties.model.default`
- `detail.requestSchema.properties.model.enum`
- `detail.requestSchema.properties.model.examples`
- `detail.requestSchema.properties.model.description`

例如：

```json
{
  "models": {
    "video:kling-3-0": {
      "schemaModel": "kling-3.0"
    }
  }
}
```

适合用在这些场景：

- 上游文档解析出来的 model 值不对
- 上游 id 和 provider 真实 model 名不一致
- 价格配置或执行 payload 需要一个固定真实模型值

### splitModels

类型：`AiStudioSplitModelOverride[]`

把一个上游模型拆成多个独立 runtime 模型。只要配置了 `splitModels`，原始上游模型本身不会继续作为单独模型输出。

结构：

```json
{
  "models": {
    "video:some-upstream-model": {
      "splitModels": [
        {
          "id": "video:some-model-fast",
          "title": "Some Model Fast",
          "schemaModel": "some_model_fast"
        },
        {
          "id": "video:some-model-quality",
          "title": "Some Model Quality",
          "schemaModel": "some_model_quality"
        }
      ]
    }
  }
}
```

子字段：

- `id`: 拆分后新模型的 runtime id，必须全局唯一
- `title`: 拆分后模型展示标题
- `alias`: 可选，拆分后模型的公开别名
- `provider`: 可选，拆分后模型的展示 provider
- `schemaModel`: 必填，拆分后模型真实写入请求的 `payload.model`

拆分模型一般还需要在 `config/ai-studio/overrides/pricing.json` 里按拆分后的 `id` 单独配置价格。

当前代码没有在 `splitModels` 里读取 `pricingMatch`。如果需要覆盖价格，请写到 `pricing.json`，不要把 `pricingMatch` 当成已支持字段。

### resultArtifacts

类型：`AiStudioResultArtifactRule[]`

用于从 provider 返回结果中提取额外 artifact。常见场景是某个请求返回了可复用的素材 id，例如 audio id、character id。

结构：

```json
{
  "kind": "audio-id",
  "path": "data.audioId",
  "labelPath": "data.name",
  "targetField": "audio_ids"
}
```

字段说明：

- `kind`: artifact 类型，前端展示和识别用
- `path`: 从 provider 原始返回体里取值的路径，使用点号分隔
- `labelPath`: 可选，artifact 展示标签路径
- `targetField`: 可选，标记这个 artifact 适合用于哪个请求字段

提取逻辑在 `lib/ai-studio/execute.ts` 的 `extractResultArtifacts()`。它会从提交结果或任务查询结果中提取 artifact，并随 API 响应返回给前端。

当前前端主要展示这些 artifacts；不要默认认为 `targetField` 已经自动回填到下一次请求。

## 当前配置逐项说明

### video:ama-seedance-2-0

```json
{
  "alias": "seedance-2-0"
}
```

作用：

- 对外公开模型 id 使用 `video:seedance-2-0`
- 内部 runtime id 仍是 `video:ama-seedance-2-0`
- 真实请求 model 仍来自上游/runtime 的 `modelKeys`

### video:ama-seedance-2-0-fast

```json
{
  "alias": "seedance-2-0-fast"
}
```

作用：

- 对外公开模型 id 使用 `video:seedance-2-0-fast`
- 用于把 fal 上游 id 简化成项目内统一命名

### video:bytedance-seedance-2

```json
{
  "alias": "seedance-2-0-vip",
  "title": "Seedance 2.0 VIP",
  "provider": "ByteDance"
}
```

作用：

- 对外公开模型 id 使用 `video:seedance-2-0-vip`
- 前台展示标题为 `Seedance 2.0 VIP`
- provider 展示为 `ByteDance`

### video:bytedance-seedance-2-0-fast

```json
{
  "alias": "seedance-2-0-fast-vip",
  "title": "Seedance 2.0 Fast VIP",
  "provider": "ByteDance"
}
```

作用：

- 对外公开模型 id 使用 `video:seedance-2-0-fast-vip`
- 前台展示标题为 `Seedance 2.0 Fast VIP`
- provider 展示为 `ByteDance`

### video:gemini-omni-audio

```json
{
  "resultArtifacts": [
    {
      "kind": "audio-id",
      "path": "data.audioId",
      "labelPath": "data.name",
      "targetField": "audio_ids"
    }
  ]
}
```

作用：

- 从 provider 返回体 `data.audioId` 提取音频素材 id
- 从 `data.name` 提取展示标签
- 返回 artifact 时标记它适合 `audio_ids` 字段

### video:gemini-omni-character

```json
{
  "resultArtifacts": [
    {
      "kind": "character-id",
      "path": "data.characterId",
      "labelPath": "data.characterName",
      "targetField": "character_ids"
    }
  ]
}
```

作用：

- 从 provider 返回体 `data.characterId` 提取角色素材 id
- 从 `data.characterName` 提取展示标签
- 返回 artifact 时标记它适合 `character_ids` 字段

### video:generate-veo3-1-video

```json
{
  "splitModels": [
    {
      "id": "video:veo-3.1-lite",
      "title": "Veo 3.1 Lite",
      "schemaModel": "veo3_lite"
    },
    {
      "id": "video:veo-3.1-fast",
      "title": "Veo 3.1 Fast",
      "schemaModel": "veo3_fast"
    },
    {
      "id": "video:veo-3.1-quality",
      "title": "Veo 3.1 Quality",
      "schemaModel": "veo3"
    }
  ]
}
```

作用：

- 把一个上游 Veo 3.1 入口拆成三个独立模型
- 前台分别展示 Lite、Fast、Quality
- 三个模型分别提交不同的真实 `payload.model`
- 原始 `video:generate-veo3-1-video` 不再作为单独 runtime 模型输出

对应价格需要按下面这些最终 id 写到 `pricing.json`：

- `video:veo-3.1-lite`
- `video:veo-3.1-fast`
- `video:veo-3.1-quality`

### video:kling-3-0

```json
{
  "schemaModel": "kling-3.0"
}
```

作用：

- 修正真实请求里的 `payload.model`
- runtime schema 的 model default/enum/examples 都会变成 `kling-3.0`

### video:kling-3-0-motion-control

```json
{
  "schemaModel": "kling-3.0/motion-control"
}
```

作用：

- 修正真实请求里的 `payload.model`
- 用于 motion control 版本的 Kling 3.0

### video:kling-v2-5-turbo-image-to-video-pro

```json
{
  "schemaModel": "kling/v2-5-turbo-image-to-video-pro"
}
```

作用：

- 修正真实请求里的 `payload.model`
- 保证 image-to-video pro 版本使用 provider 需要的完整模型名

## 添加或修改模型时怎么做

### 只改展示名

改 `title` 或 `provider` 即可。

```json
{
  "models": {
    "video:some-model": {
      "title": "Better Display Name",
      "provider": "Provider Name"
    }
  }
}
```

### 只改公开 id

改 `alias`。

```json
{
  "models": {
    "video:some-provider-long-id": {
      "alias": "short-public-id"
    }
  }
}
```

### 只改真实请求 model

改 `schemaModel`。

```json
{
  "models": {
    "video:some-model": {
      "schemaModel": "real/provider-model"
    }
  }
}
```

### 一个上游入口拆多个模型

用 `splitModels`，并给每个拆分模型补 `pricing.json`。

```json
{
  "models": {
    "video:one-upstream-entry": {
      "splitModels": [
        {
          "id": "video:one-upstream-entry-fast",
          "title": "Model Fast",
          "schemaModel": "model_fast"
        },
        {
          "id": "video:one-upstream-entry-quality",
          "title": "Model Quality",
          "schemaModel": "model_quality"
        }
      ]
    }
  }
}
```

### 要提取返回结果里的素材 id

加 `resultArtifacts`。

```json
{
  "models": {
    "video:some-asset-generator": {
      "resultArtifacts": [
        {
          "kind": "asset-id",
          "path": "data.assetId",
          "labelPath": "data.name",
          "targetField": "asset_ids"
        }
      ]
    }
  }
}
```

## pricing.json 说明

`pricing.json` 是 AI Studio 的动态价格覆盖表。它按最终 runtime 模型 id 覆盖 `detail.pricing`，用于前端展示预估价格、执行前预扣积分，以及生成记录里的价格说明。

当前文件结构：

```json
{
  "models": {
    "<runtime 模型 id>": {
      "price_txt": "人类可读的价格说明",
      "billing_adapter": "kie_seedance_2",
      "price_key": "{$input.resolution}|{$input.duration}",
      "price_map": {
        "720p|5": 10
      },
      "price_final": "{$price}",
      "docUrl": "https://example.com/pricing",
      "notes": "可选备注"
    }
  }
}
```

`models` 的 key 必须是编译后的 runtime 模型 id。普通模型一般是上游 id；如果模型来自 `splitModels`，这里必须使用拆分后的 id。

### pricing.json 字段

#### price_txt

类型：`string`

人类可读的价格说明，主要用于维护、调试和展示上下文。它不参与计算。

示例：

```json
{
  "price_txt": "Veo 3.1 Fast, 720p: 20 per video | Veo 3.1 Fast, 1080p: 25 per video"
}
```

#### billing_adapter

类型：`string`

可选的特殊计费适配器。当前代码只支持：

```text
kie_seedance_2
```

这个适配器会基于 payload 判断是否有视频输入，并尝试计算输入视频时长，给 `price_key` 和 `price_final` 提供 `$billing.has_video_input`、`$billing.input_video_duration`。

当前 `pricing.json` 里只有这两个模型使用它：

- `video:bytedance-seedance-2`
- `video:bytedance-seedance-2-0-fast`

如果写了未知 `billing_adapter`，runtime catalog 校验会报错。

#### price_key

类型：`string`

价格档位选择表达式。运行时会把 `{$...}` 表达式用 payload 计算成一个字符串，然后去 `price_map` 里查价格。

常见写法：

```json
{
  "price_key": "default"
}
```

```json
{
  "price_key": "{$input.resolution || $resolution || $input.quality || $quality}"
}
```

```json
{
  "price_key": "{$input.resolution}|{$input.duration}"
}
```

表达式可读取：

- 顶层 payload 字段，例如 `$duration`
- `input` 内字段，例如 `$input.duration`
- 特殊价格变量 `$billing`
- 在 `price_final` 中还可以读取 `$price`

当前实现会对表达式做安全字符检查，不支持任意 JS 代码、函数导入或全局对象访问。

#### price_map

类型：`Record<string, number>`

价格档位表。`price_key` 计算出来的字符串必须能在这里找到同名 key，否则本次价格解析返回 `null`，模型可能被视为不可用或无法预扣。

示例：

```json
{
  "price_key": "{$input.resolution}",
  "price_map": {
    "720p": 20,
    "1080p": 25,
    "4k": 60
  }
}
```

#### price_final

类型：`string`

最终价格计算表达式。`$price` 是从 `price_map` 取到的基础价格。

常见形态：

```json
{
  "price_final": "{$price}"
}
```

表示按次或按张固定扣费。

```json
{
  "price_final": "{$price}*{$input.duration || $duration}"
}
```

表示 `price_map` 里是单秒价格，最终价格要乘视频时长。

```json
{
  "price_final": "{$price}*({$num_images || $input.num_images || 1})"
}
```

表示图片模型按生成张数计费。

#### docUrl

类型：`string`

价格来源链接或文档链接。通常用于维护溯源，不参与价格计算。

#### notes

类型：`string`

可选备注。用于记录特殊价格规则、人工修正原因或上游文档差异。

### pricing.json 当前配置概览

当前 `pricing.json` 有 139 个模型价格覆盖：

- `video`: 103 个
- `image`: 36 个

主要价格类型：

- 固定按次扣费：`price_final = "{$price}"`
- 按视频时长扣费：`price_final = "{$price}*{$input.duration || ...}"`
- 按图片数量扣费：`price_final = "{$price}*({$num_images || $input.num_images || ... || 1})"`
- Seedance 2 特殊计费：使用 `billing_adapter: "kie_seedance_2"`，区分是否有视频输入

Veo 3.1 拆分模型的价格就是按拆分后的 id 配的：

- `video:veo-3.1-lite`
- `video:veo-3.1-fast`
- `video:veo-3.1-quality`

### pricing.json 常见坑

- key 用 runtime 模型 id，不是 alias。
- `price_key` 算出的结果必须能命中 `price_map`。
- `price_map` 的值必须是正数。
- `price_final` 最终必须算出正数。
- 如果用了 `billing_adapter`，必须是代码里支持的 adapter。
- 价格表达式里可以用 `$input.duration`，也可以用 `$duration`，具体取决于 provider payload 结构。
- schema enum 和 `price_map` key 要对齐，比如 schema 允许 `4k`，价格表就不要只写 `4K`。

## schema.json 说明

`schema.json` 是请求 schema 的本地覆盖表。它用于修正上游文档解析出来的字段类型、默认值、枚举、范围和描述。

当前文件结构：

```json
{
  "models": {
    "<runtime 模型 id>": {
      "set": {
        "properties.input.properties.duration.minimum": 4
      },
      "replace": {
        "type": "object",
        "properties": {}
      }
    }
  }
}
```

`models` 的 key 必须是编译后的 runtime 模型 id。对于拆分模型，使用拆分后的 id。

### schema.json 字段

#### set

类型：`Record<string, unknown>`

按点号路径修改现有 `requestSchema` 的某个字段。路径从 `requestSchema` 根开始。

示例：

```json
{
  "models": {
    "video:veo-3.1-fast": {
      "set": {
        "properties.resolution": {
          "type": "string",
          "enum": ["720p", "1080p", "4k"],
          "default": "720p",
          "description": "Output resolution."
        }
      }
    }
  }
}
```

适合用在这些场景：

- 修正 enum
- 修正 default
- 给字段补 minimum/maximum/multipleOf
- 修正描述
- 替换某个字段的完整 schema

注意：`set` 只能设置已经存在的路径。校验时如果路径不存在，会报 `Schema override path does not exist`。

#### replace

类型：`Record<string, unknown> | null`

整体替换某个模型的 `requestSchema`。

示例：

```json
{
  "models": {
    "video:kling-3-0": {
      "replace": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "enum": ["kling-3.0"],
            "default": "kling-3.0"
          }
        }
      }
    }
  }
}
```

适合用在这些场景：

- 上游 schema 结构整体不适合前台表单
- 需要重新定义一套干净的请求字段
- 某个模型的字段与上游文档差异太大，局部 `set` 不够用

### schema.json 当前配置逐项说明

#### video:bytedance-seedance-2

修正：

- `duration.minimum = 4`
- `duration.maximum = 15`
- `web_search.default = false`

#### video:bytedance-seedance-2-0-fast

同样修正：

- `duration.minimum = 4`
- `duration.maximum = 15`
- `web_search.default = false`

#### video:grok-imagine-text-to-video

把 `input.duration` 替换为整数秒字段：

- 最小 6
- 最大 30
- 步长 1
- 默认 6

#### video:grok-imagine-image-to-video

同样把 `input.duration` 替换为 6 到 30 秒的整数秒字段。

#### video:veo-3.1-lite

把 `resolution` 修正为：

- `720p`
- `1080p`
- `4k`

默认 `720p`。

#### video:veo-3.1-fast

同样修正 `resolution` 为 `720p`、`1080p`、`4k`。

#### video:veo-3.1-quality

同样修正 `resolution` 为 `720p`、`1080p`、`4k`。

#### video:gemini-omni-audio

给 `audio_id` 补预设 voice id 枚举，默认值是 `achernar`。

#### video:kling-3-0

使用 `replace` 整体替换请求 schema，重新定义：

- `model`
- `input.prompt`
- `input.image_urls`
- `input.sound`
- `input.duration`
- `input.aspect_ratio`
- `input.mode`
- `input.multi_shots`

其中 `prompt` 是必填字段。

### schema.json 常见坑

- `set` 路径是从 `requestSchema` 根开始，不是从 `input` 开始。
- `set` 路径必须已经存在；不存在就应该考虑 `replace` 或先确认 runtime schema。
- 如果只是改 `model` 字段，优先用 `models.json` 的 `schemaModel`，不要在 `schema.json` 里手工重复改。
- schema 的 enum/default 要和 `pricing.json` 的 `price_key`、`price_map` 对齐。
- 对拆分模型写 schema override 时，用拆分后的 id。

## form-ui.json 说明

`form-ui.json` 是前端表单 UI 覆盖表。它不改变 provider 请求，也不改变 schema 本身，只影响字段在 AI Video Studio 表单里的排序、高级字段分组和字段隐藏。

当前文件结构：

```json
{
  "models": {
    "<runtime 模型 id>": {
      "fieldOrder": ["prompt", "duration", "resolution"],
      "advancedFields": ["seed", "generate_audio"],
      "hiddenFields": ["max_images"]
    }
  }
}
```

### form-ui.json 字段

#### fieldOrder

类型：`string[]`

控制顶层字段显示顺序。当前 schema normalization 只在根路径使用 `fieldOrder`。

示例：

```json
{
  "fieldOrder": ["prompt", "image_url", "duration", "resolution"]
}
```

当前 `form-ui.json` 没有使用 `fieldOrder`。

#### advancedFields

类型：`string[]`

指定哪些字段放入高级设置区。可以写字段 key，也可以写点号路径。

示例：

```json
{
  "advancedFields": ["seed", "generate_audio", "input.web_search"]
}
```

一旦某个模型配置了 `advancedFields` 或 `fieldOrder`，前端会认为它有自定义表单 UI，不再完全使用默认高级字段分组。

#### hiddenFields

类型：`string[]`

指定哪些字段不在 AI Video Studio 表单中渲染。可以写字段 key，也可以写点号路径。字段仍保留在 runtime schema 里；这个配置只影响表单层显示和默认值收集。

示例：

```json
{
  "hiddenFields": ["max_images", "input.debug"]
}
```

适合用于上游 schema 中存在但前台不希望暴露的重复字段或内部字段。例如 Seedream FAL 模型里 `max_images` 和 `num_images` 对用户来说功能重复，前台只保留 `num_images`。

### form-ui.json 当前配置逐项说明

#### image:fal-fal-ai-bytedance-seedream-v5-lite-text-to-image

隐藏字段：

- `max_images`

作用：Seedream FAL 同时暴露 `max_images` 和 `num_images`，前台只保留 `num_images`，避免重复控制生成数量。

#### image:fal-fal-ai-bytedance-seedream-v5-lite-edit

隐藏字段同 `image:fal-fal-ai-bytedance-seedream-v5-lite-text-to-image`。

#### image:fal-fal-ai-bytedance-seedream-v4-5-text-to-image

隐藏字段同 `image:fal-fal-ai-bytedance-seedream-v5-lite-text-to-image`。

#### image:fal-fal-ai-bytedance-seedream-v4-5-edit

隐藏字段同 `image:fal-fal-ai-bytedance-seedream-v5-lite-text-to-image`。

#### video:ama-seedance-2-0

高级字段：

- `audio_urls`
- `image_with_roles`
- `tools`
- `seed`
- `return_last_frame`
- `generate_audio`

作用：让主表单聚焦核心生成参数，把音频、角色图、工具、seed 和音频生成等低频项收进高级设置。

#### video:ama-seedance-2-0-fast

高级字段同 `video:ama-seedance-2-0`。

#### video:bytedance-seedance-2

高级字段：

- `first_frame_url`
- `last_frame_url`
- `reference_audio_urls`
- `web_search`
- `return_last_frame`
- `generate_audio`
- `nsfw_checker`

作用：把首尾帧、参考音频、联网搜索、返回尾帧、音频生成和审核开关放入高级设置。

#### video:bytedance-seedance-2-0-fast

高级字段同 `video:bytedance-seedance-2`。

### form-ui.json 常见坑

- 它只影响表单 UI，不影响请求 schema 和真实 payload。
- `advancedFields` 要写 schema 里实际存在的字段 key 或路径。
- `hiddenFields` 也要写 schema 里实际存在的字段 key 或路径；它不会从 runtime schema 中删除字段。
- 如果字段在嵌套 `input` 下，前端匹配时既会看完整路径，也会看字段 key；但为了可读性，复杂字段优先写点号路径。
- 配了自定义 `advancedFields` 后，默认高级字段规则会被替换，别漏掉仍想放进高级区的字段。

## 和其他 override 文件的分工

### models.json

负责模型级别目录修正：

- 开关模型
- 公开 alias
- 展示标题/provider
- 请求里的 model 值
- 拆分模型
- 结果 artifact 提取规则

### pricing.json

负责价格和预扣积分：

- `price_key`
- `price_map`
- `price_final`
- `billing_adapter`
- `docUrl`
- `price_txt`

如果模型是通过 `splitModels` 拆出来的，价格要按拆分后的 `id` 配。

### schema.json

负责更细的请求 schema 覆盖：

- 整体替换 schema
- 设置某个 schema path
- 修正字段类型、enum、default、description

如果只是改 `model` 字段，优先用 `models.json` 的 `schemaModel`。

### form-ui.json

负责前端表单显示顺序、高级字段和隐藏字段：

- `fieldOrder`
- `advancedFields`
- `hiddenFields`

## 常见坑

- `models` 的 key 要用上游模型 id，不是 alias。
- `alias` 改的是公开 id，不是 provider 真实模型名。
- `schemaModel` 改的是真实请求里的 `payload.model`。
- `splitModels` 会替换原始上游模型，不是追加子模型。
- `splitModels[].id` 必须全局唯一。
- 拆分模型的价格要写在 `pricing.json`，key 用拆分后的 id。
- 当前代码没有读取 `splitModels[].pricingMatch`。
- `resultArtifacts.path` 必须匹配 provider 原始返回体，不是前端清洗后的字段。
- 改完 `models.json` 后要检查 `runtime/catalog.json` 里的最终结果。

## 快速核对命令

只看某个 runtime 模型最终长什么样：

```bash
jq '.items[] | select(.id == "video:veo-3.1-fast") | {id,title,provider,alias,modelKeys,examplePayload,pricing,resultArtifacts}' config/ai-studio/runtime/catalog.json
```

查看当前 models override 覆盖了哪些上游模型：

```bash
jq '.models | keys' config/ai-studio/overrides/models.json
```

检查公开 alias 是否会被前台/API 暴露：

```bash
jq '.items[] | select(.alias != null) | {id,alias,title,provider,modelKeys}' config/ai-studio/runtime/catalog.json
```

检查拆分模型是否已经出现在 runtime catalog：

```bash
jq '.items[] | select(.id | startswith("video:veo-3.1")) | {id,title,modelKeys,pricing}' config/ai-studio/runtime/catalog.json
```

查看某个模型的价格覆盖：

```bash
jq '.models["video:veo-3.1-fast"]' config/ai-studio/overrides/pricing.json
```

检查价格覆盖按类别分布：

```bash
jq '.models | keys | map(split(":")[0]) | group_by(.) | map({category: .[0], count: length})' config/ai-studio/overrides/pricing.json
```

查看某个模型最终 schema 和 form UI：

```bash
jq '.items[] | select(.id == "video:kling-3-0") | {id,requestSchema,formUi}' config/ai-studio/runtime/catalog.json
```

查看 schema 覆盖了哪些模型：

```bash
jq '.models | keys' config/ai-studio/overrides/schema.json
```

查看 form UI 覆盖了哪些模型：

```bash
jq '.models | keys' config/ai-studio/overrides/form-ui.json
```
