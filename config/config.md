# Config 说明

这份文档只说明当前项目里和 AI Studio / AI Video Studio 直接相关的两个配置入口：

- `config/ai-studio/overrides/models.json`
- `config/ai-video-studio.ts`

如果你只是想加一个视频模型，通常要先看 `models.json`，再看 `ai-video-studio.ts`。

## 1. `config/ai-studio/overrides/models.json`

### 1.1 这个文件是干什么的

这个文件是 AI Studio 运行时目录的“模型覆盖配置”。

它不是上游原始数据，而是对上游目录做二次修正，主要用于：

- 改模型公开别名
- 改标题或 provider 展示
- 改请求里真正应该写入的 `model`
- 把一个上游模型拆成多个前台可见模型
- 禁用某个上游模型

它会被 [lib/ai-studio/catalog.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/ai-studio/catalog.ts) 读取，并参与运行时目录编译。

大致流程是：

1. 先读取上游目录 `config/ai-studio/upstream/catalog.json`
2. 再叠加 `config/ai-studio/overrides/models.json`
3. 最后生成运行时目录 `config/ai-studio/runtime/catalog.json`

所以这里配错了，前台看到的模型、schema 默认值、价格映射都会一起受影响。

### 1.2 文件结构

```json
{
  "models": {
    "<上游模型 id>": {
      "enabled": true,
      "alias": "xxx",
      "title": "展示名称",
      "provider": "展示用 Provider",
      "schemaModel": "真正写进请求 payload.model 的值",
      "splitModels": []
    }
  }
}
```

`models` 的 key 必须是“上游目录里的模型 id”，例如：

```json
{
  "models": {
    "video:sora2-text-to-video": {
      "splitModels": []
    }
  }
}
```

### 1.3 字段说明

#### `enabled`

- `false` 表示禁用这个上游模型
- 编译运行时目录时，这个模型会被直接过滤掉
- 一般只在上游数据不想暴露时使用

示例：

```json
{
  "models": {
    "video:some-upstream-model": {
      "enabled": false
    }
  }
}
```

#### `alias`

- 给模型一个更稳定、可读的公开别名
- 公开模型 id 会基于这个别名生成
- 适合把上游 provider 风格 id 改成项目内部统一命名

比如当前配置里：

```json
{
  "models": {
    "video:apimart-seedance-2-0": {
      "alias": "seedance-2-0"
    }
  }
}
```

它的公开 id 会变成 `video:seedance-2-0`，这样前台和其他配置引用时更统一。

#### `title`

- 改前台展示标题
- 只影响显示文案，不改变真实请求逻辑

#### `provider`

- 改 provider 展示名
- 只影响展示和目录信息，不改变接口调用地址

#### `schemaModel`

- 强制改写 schema / examplePayload 里的 `model`
- 适用于“这个模型本身不用拆分，但默认 `model` 值需要修正”的场景

它会同时改这些地方：

- `detail.modelKeys`
- `examplePayload.model`
- request schema 里 `model.default`
- request schema 里 `model.enum`
- request schema 里 `model.examples`

示例：

```json
{
  "models": {
    "video:kling-3-0": {
      "schemaModel": "kling-3.0"
    }
  }
}
```

这类配置适合“一个目录项只对应一个真实模型值”的情况。

### 1.4 `splitModels` 是什么

`splitModels` 的作用是：**把一个上游目录项拆成多个独立模型项**。

这个字段很关键，不是简单分组，而是真的参与运行时目录编译。

适用场景：

- 上游只给了一个接口文档，但实际支持多个 `model`
- 同一个接口下有多个变体，需要前台分别展示
- 不同变体要绑定不同价格行

比如当前项目里的：

- `video:sora2-text-to-video` 被拆成 standard / stable
- `video:sora2-image-to-video` 被拆成 standard / stable
- `video:generate-veo3-1-video` 被拆成 fast/quality + text/image 四个模型

### 1.5 `splitModels` 的实际行为

只要某个上游模型配置了 `splitModels`：

- 原始上游模型本身不会继续作为单独运行时模型输出
- 每个 `splitModels[i]` 都会变成一个新的运行时模型
- 每个拆分项会有独立的 `id`
- 每个拆分项会把 schema 的 `model` 重写成自己的 `schemaModel`
- 每个拆分项会根据自己的 `pricingMatch` 去匹配价格行

也就是说，`splitModels` 更像“替换原模型”，不是“在原模型下面再挂几个子项”。

### 1.6 `splitModels` 结构

```json
{
  "models": {
    "video:some-upstream-model": {
      "splitModels": [
        {
          "id": "video:some-public-model-a",
          "title": "Model A",
          "schemaModel": "real-model-a",
          "pricingMatch": {
            "runtimeModel": "real-model-a"
          }
        },
        {
          "id": "video:some-public-model-b",
          "title": "Model B",
          "schemaModel": "real-model-b",
          "pricingMatch": {
            "runtimeModel": "real-model-b"
          }
        }
      ]
    }
  }
}
```

子字段说明：

#### `splitModels[].id`

- 拆分后新模型的唯一 id
- 必须全局唯一，不能和已有上游模型 id 或其他 split model id 冲突
- 通常直接写成项目最终使用的公开模型 id

#### `splitModels[].title`

- 拆分后模型的展示名称

#### `splitModels[].alias`

- 可选
- 如果要再提供一个公开别名，可以额外配置
- 当前项目主要依赖 `id`，这个字段不是常规必填项

#### `splitModels[].provider`

- 可选
- 用于覆盖拆分项的 provider 展示名

#### `splitModels[].schemaModel`

- 这个拆分项真正写入请求 `model` 字段的值
- 每个拆分模型都应该有自己的 `schemaModel`

#### `splitModels[].pricingMatch`

- 用来从价格表里挑出属于这个拆分模型的价格行
- 如果匹配不到，而且 `pricing.json` 里也没有补充价格，运行时校验会报错

### 1.7 `pricingMatch` 怎么用

当前支持的匹配字段有：

- `runtimeModel`
- `modelDescriptionIncludes`
- `provider`

#### `runtimeModel`

最稳的方式，按运行时模型名精确匹配。

```json
{
  "pricingMatch": {
    "runtimeModel": "sora-2-text-to-video"
  }
}
```

适合价格行里能明确拿到运行时模型值的情况。

#### `modelDescriptionIncludes`

按价格行描述做包含匹配。

```json
{
  "pricingMatch": {
    "modelDescriptionIncludes": "text-to-video, Fast"
  }
}
```

适合像 Veo 这种价格表里主要靠描述区分 variant 的情况。

#### `provider`

按 provider 名匹配，大小写不敏感。

```json
{
  "pricingMatch": {
    "provider": "ByteDance"
  }
}
```

可以单独用，也可以和上面的条件组合用。

### 1.8 什么时候用 `schemaModel`，什么时候用 `splitModels`

只需要改单个模型默认 `model` 值：

- 用 `schemaModel`

一个上游模型要拆成多个前台可见模型：

- 用 `splitModels`

不要同时把“单模型修正”和“多模型拆分”混在一个思路里。只要进入拆分场景，就应该把每个变体写到 `splitModels` 里。

### 1.9 一个实际例子

当前 `Sora2 Text to Video` 的拆分方式：

```json
{
  "models": {
    "video:sora2-text-to-video": {
      "splitModels": [
        {
          "id": "video:sora2-text-to-video-standard",
          "title": "Sora2 - Text to Video",
          "schemaModel": "sora-2-text-to-video",
          "pricingMatch": {
            "runtimeModel": "sora-2-text-to-video"
          }
        },
        {
          "id": "video:sora2-text-to-video-stable",
          "title": "Sora2 - Text to Video Stable",
          "schemaModel": "sora-2-text-to-video-stable",
          "pricingMatch": {
            "runtimeModel": "sora-2-text-to-video-stable"
          }
        }
      ]
    }
  }
}
```

这段配置做了 4 件事：

1. 把一个上游模型拆成两个前台模型
2. 给两个模型各自设置了不同的请求 `model`
3. 给两个模型各自绑定了不同价格行
4. 让前台能把 standard / stable 当成两个独立模型选择

### 1.10 常见坑

- `splitModels` 一旦配置，原始上游模型不会再单独输出
- `splitModels[].id` 不能和任何已有模型 id 冲突
- `schemaModel` 必须是真实可调用的 `payload.model`
- `pricingMatch` 如果一个价格行都匹配不到，会导致校验失败
- `alias` 适合做公开命名统一，不适合拿来替代 `schemaModel`

## 2. `config/ai-video-studio.ts`

### 2.1 这个文件是干什么的

这个文件是 AI Video Studio 前端的视频模型配置中心。

它不是上游目录，也不是价格表，而是“前台如何组织和选择模型”的单一事实来源。主要负责：

- 定义模型家族分组
- 定义每个家族下有哪些版本
- 把前台选择映射到实际 `modelId`
- 从历史任务里的 `modelId` 反查回前台选中的家族和版本

### 2.2 核心结构

文件里最重要的是：

- `AI_VIDEO_STUDIO_FAMILIES`
- `getAiVideoStudioSelectionFromModelId`
- `getAiVideoStudioVersions`
- `listAiVideoStudioModelOptions`
- `resolveAiVideoStudioModelId`

其中真正的配置主体是 `AI_VIDEO_STUDIO_FAMILIES`。

### 2.3 `AI_VIDEO_STUDIO_FAMILIES` 结构

```ts
export const AI_VIDEO_STUDIO_FAMILIES = [
  {
    key: "sora2",
    label: "Sora 2",
    description: "OpenAI model with realistic physics",
    tags: [{ text: "With Audio", type: "audio" }],
    selectable: true,
    versions: [
      {
        key: "sora-2",
        label: "Sora 2 Text to Video",
        familyKey: "sora2",
        modelId: "video:sora2-text-to-video-standard",
      }
    ],
  }
];
```

### 2.4 family 字段说明

#### `key`

- 家族唯一标识
- 用于本地存储、状态恢复、表单选中值
- 改了会影响已存储的选择状态

#### `label`

- 前台展示名称

#### `description`

- 家族描述文案
- 主要用于前台辅助说明

#### `tags`

- 可选
- 前台标签，例如 `HOT`、`With Audio`

结构如下：

```ts
tags: [{ text: "HOT", type: "hot" }]
```

#### `selectable`

- 是否允许这个 family 在前台选择器里直接显示
- `false` 表示保留配置，但不作为常规可选项展示

当前代码里，`listAiVideoStudioModelOptions()` 会直接跳过 `selectable === false` 的 family。

所以这个字段适合：

- 兼容旧模型映射
- 临时隐藏一整个家族
- 还需要历史回填，但不想给新用户继续选

### 2.5 version 字段说明

#### `versions[].key`

- 版本唯一标识
- 和 `familyKey` 一起组成前台的稳定选择值

#### `versions[].label`

- 前台版本展示名称

#### `versions[].familyKey`

- 所属 family
- 应该和外层 family 的 `key` 保持一致

#### `versions[].modelId`

- 这个版本最终对应的 AI Studio 模型 id
- 提交任务时，前台会把 `familyKey + versionKey` 映射成这个 `modelId`

这个 `modelId` 一般应该和：

- `models.json` 编译后的运行时模型 id
- 或者公开模型 id

保持一致。

#### `versions[].aliases`

- 可选
- 用于兼容旧 id 或第三方别名
- 在“通过已有任务反查选中项”时会参与匹配

比如当前 `Seedance 2.0`：

```ts
{
  key: "seedance-2.0",
  label: "Seedance 2.0",
  familyKey: "seedance-2.0",
  modelId: "video:seedance-2-0",
  aliases: ["video:apimart-seedance-2-0"],
}
```

这样历史数据里如果存的是 `video:apimart-seedance-2-0`，前台仍然能正确恢复到 `seedance-2.0` 这个版本。

### 2.6 这些配置在代码里怎么用

#### `listAiVideoStudioModelOptions()`

- 把 family/version 展平成前台下拉选项
- 只输出 `selectable !== false` 的 family
- 每个 option 的值是 `${family.key}::${version.key}`

这个值只是前台内部选择值，不是最终提交给接口的 `modelId`。

#### `resolveAiVideoStudioModelId()`

- 把前台选中的 `familyKey + versionKey` 转成真正的 `modelId`
- 提交生成任务时会用到

#### `getAiVideoStudioSelectionFromModelId()`

- 反向把 `modelId` 解析成 `familyKey + versionKey`
- 会同时匹配 `modelId` 和 `aliases`
- 主要用于历史任务回填、编辑已有任务、兼容旧数据

#### `getAiVideoStudioVersions()`

- 获取某个 family 下的所有版本

### 2.7 新增一个视频模型时怎么改

通常按这个顺序处理：

1. 先在 `config/ai-studio/overrides/models.json` 确认这个模型最终会产出可用的运行时模型 id
2. 如果上游是一个接口对应多个变体，用 `splitModels`
3. 再到 `config/ai-video-studio.ts` 里把它挂到某个 family，或者新增一个 family
4. `versions[].modelId` 指向上一步产出的模型 id
5. 如果要兼容旧 id，再补 `aliases`

### 2.8 什么时候只改 `models.json`，什么时候两个文件都改

只改 `models.json`：

- 只是在修 schemaModel
- 只是在修 alias / title / provider
- 只是隐藏某个运行时模型

两个文件都改：

- 前台需要新增可选模型
- 前台需要新增 family / version
- 前台需要支持模型切换和历史回填

### 2.9 一个简单判断原则

如果你的改动目标是“让 AI Studio 正确认识这个模型”，优先看 `models.json`。

如果你的改动目标是“让用户能在 Video Studio 里选到这个模型”，还要再改 `ai-video-studio.ts`。
