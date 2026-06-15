# AI Studio 新价格计算方案

本文档定义 AI Studio 后续统一价格计算逻辑。目标是让每个模型的价格配置一眼能核查，同时前端预估和后端扣费使用同一套规则。

核心原则：

- 统一使用积分作为最终计费单位，`1 USD = 200 credits`。
- 价格配置尽量简单，主要由 `price_key`、`price_map`、`price_final` 三部分组成。
- 普通模型只使用请求 schema 中已有字段计算价格。
- 少数特殊模型可以先通过 `billing_adapter` 生成计费上下文，再进入统一价格逻辑。
- 后端是最终扣费来源，前端只能做展示预估。
- 任意变量缺失、价格 key 查不到、计算结果不是正数时，后端必须拒绝执行或标记为价格不可用，不能按低价兜底。

## 价格配置字段

推荐每个模型一个价格配置文件，聚合后写入 `config/ai-studio/overrides/pricing.json`。

基础结构：

```json
{
  "docUrl": "https://docs.example.com/model",
  "price_txt": "720p with audio costs 40 credits/s; 720p without audio costs 30 credits/s.",
  "price_key": "{$input.resolution}|{$input.generate_audio ? 'with_audio':'without_audio'}",
  "price_map": {
    "720p|with_audio": 40,
    "720p|without_audio": 30
  },
  "price_final": "{$price}*{$input.duration}"
}
```

字段说明：

- `docUrl`: 直接使用模型 JSON 中的 `docUrl`，不单独维护另一套文档地址。
- `price_txt`: 原始价格文本描述。用于人工核价和后续重新生成 `price_map`，应尽量保留上游原文，不要只写总结。
- `price_key`: 动态生成价格 key 的表达式。运行时用 payload 和 billing context 计算出字符串，然后从 `price_map` 取单价。
- `price_map`: 人工可核查的价格表。key 必须和价格维度完全对应，value 是积分单价。
- `price_final`: 最终价格表达式。`$price` 是从 `price_map` 取到的单价，其他变量来自 payload 或 billing context。
- `billing_adapter`: 可选。特殊模型先生成计费上下文，例如输入视频时长、是否有视频输入等。
- `notes`: 可选。记录人工解释、限制、不能预估的情况。

不保留旧的多行匹配价格字段。多个维度应放到 `price_key` 和 `price_map` 中，让价格表直接可读。

`docUrl` 和 `price_txt` 的区别：

- `docUrl` 是模型 JSON 里的 `docUrl`，用于定位模型文档和核查价格。
- `price_txt` 是“当时提取到的价格原文”。
- `price_map` 是“把原文翻译成可计算的积分单价表”。
- `price_final` 是“把单价乘上数量、时长或其他变量后的最终计费公式”。

如果模型来自 fal，`price_txt` 优先取 `https://fal.ai/models/{model}/llms.txt` 中 `## Pricing` 下的正文；`docUrl` 仍直接使用模型 JSON 中的 `docUrl`。

## 表达式规则

表达式语法保持最小集合，避免完整 JavaScript/eval。

允许：

- 读取 payload 字段：`{$duration}`、`{$input.duration}`、`{$input.resolution}`。
- 读取 billing context 字段：`{$billing.input_video_duration}`。
- 三元表达式：`{$input.generate_audio ? 'with_audio':'without_audio'}`。
- optional chaining：`{$input.reference_video_urls?.length > 0 ? 'with_video':'no_video'}`。
- 默认值：`{$num_images || 1}`、`{$quality || 'high'}`。
- 数学运算：`+`、`-`、`*`、`/`、括号。
- 比较运算：`>`、`>=`、`<`、`<=`、`===`、`!==`。
- 布尔运算：`&&`、`||`、`!`。

不允许：

- 任意函数调用。
- 访问全局对象。
- 字符串拼接之外的复杂脚本。
- 异步逻辑。
- 修改 payload。

实现时建议做一个受控表达式解释器，或对允许语法做白名单解析。不要直接 `eval` 用户或配置字符串。

## 计算流程

前端和后端都应按同一顺序计算：

1. 获取模型 runtime detail。
2. 准备 payload。后端需要先做 alias 到 provider model 的映射、系统字段注入等。
3. 如果配置了 `billing_adapter`，先执行 adapter，得到 `billing` 对象。
4. 用 payload + billing 计算 `price_key`。
5. 用 `price_key` 从 `price_map` 取 `price`。
6. 用 payload + billing + price 计算 `price_final`。
7. 对结果做校验和取整。
8. 后端按最终积分预扣或扣费。

结果规则：

- `price_final <= 0`：价格不可用。
- `price_final` 不是有限数字：价格不可用。
- `price_key` 不存在于 `price_map`：价格不可用。
- 必需变量缺失：价格不可用。
- 最终扣费积分向上取整，例如 `12.1 -> 13`。

## 单位规则

后续统一以积分计费，`price_map` 推荐直接写积分。

如果上游只有美元价格，导入时转换为积分：

```txt
credits = usd * 200
```

例如 fal GPT Image 2：

```txt
$0.145 * 200 = 29 credits
```

生成后的配置应尽量落为积分，避免运行时再混用 USD。

可以在 per-model 文件中保留原始美元信息用于核价，但 runtime 扣费只读积分。

## 普通模型示例

按分辨率和时长计费：

```json
{
  "docUrl": "https://docs.kie.ai/market/wan/2-7-text-to-video.md",
  "price_txt": "wan/2-7-text-to-video: 16 credits per second for 720p and 24 credits per second for 1080p.",
  "price_key": "{$resolution}",
  "price_map": {
    "720p": 16,
    "1080p": 24
  },
  "price_final": "{$price}*{$duration}"
}
```

按分辨率、音频、时长计费：

```json
{
  "docUrl": "https://docs.example.com/video-model",
  "price_txt": "720p with audio costs 20 credits/s; 720p without audio costs 14 credits/s; 1080p with audio costs 27 credits/s; 1080p without audio costs 18 credits/s.",
  "price_key": "{$resolution}|{$generate_audio ? 'with_audio':'without_audio'}",
  "price_map": {
    "720p|with_audio": 20,
    "720p|without_audio": 14,
    "1080p|with_audio": 27,
    "1080p|without_audio": 18
  },
  "price_final": "{$price}*{$duration}"
}
```

按张数计费：

```json
{
  "docUrl": "https://docs.example.com/image-model",
  "price_txt": "Standard costs 4 credits per generation; quality costs 5 credits per generation.",
  "price_key": "{$quality || 'standard'}",
  "price_map": {
    "standard": 4,
    "quality": 5
  },
  "price_final": "{$price}*{$num_images || 1}"
}
```

固定价格：

```json
{
  "docUrl": "https://docs.example.com/fixed-price-model",
  "price_txt": "Each generation costs 8 credits.",
  "price_key": "default",
  "price_map": {
    "default": 8
  },
  "price_final": "{$price}"
}
```

## GPT Image 2 示例

fal GPT Image 2 的价格可以按 `image_size + quality + num_images` 计算。

原始价格是美元，导入配置时换算为积分。`1 USD = 200 credits`。

```json
{
  "docUrl": "https://fal.ai/models/openai/gpt-image-2/api#schema-input",
  "price_txt": "Size / quality pricing: 1024 x 768 costs $0.005 low, $0.037 medium, $0.145 high; 1024 x 1024 costs $0.006 low, $0.053 medium, $0.211 high; 1024 x 1536 costs $0.005 low, $0.042 medium, $0.165 high; 1920 x 1080 costs $0.005 low, $0.040 medium, $0.158 high; 2560 x 1440 costs $0.007 low, $0.056 medium, $0.222 high; 3840 x 2160 costs $0.012 low, $0.101 medium, $0.401 high.",
  "price_key": "{$image_size || $input.image_size}|{$quality || $input.quality || 'high'}",
  "price_map": {
    "1024x768|low": 1,
    "1024x768|medium": 7.4,
    "1024x768|high": 29,
    "1024x1024|low": 1.2,
    "1024x1024|medium": 10.6,
    "1024x1024|high": 42.2,
    "1024x1536|low": 1,
    "1024x1536|medium": 8.4,
    "1024x1536|high": 33,
    "1920x1080|low": 1,
    "1920x1080|medium": 8,
    "1920x1080|high": 31.6,
    "2560x1440|low": 1.4,
    "2560x1440|medium": 11.2,
    "2560x1440|high": 44.4,
    "3840x2160|low": 2.4,
    "3840x2160|medium": 20.2,
    "3840x2160|high": 80.2
  },
  "price_final": "{$price}*({$num_images || $input.num_images || 1})"
}
```

运行时会对表达式实际读取到的尺寸值做归一化：

- `"1024x1024"` -> `"1024x1024"`
- `"1024 x 1024"` -> `"1024x1024"`
- `{ "width": 1024, "height": 1024 }` -> `"1024x1024"`

如果尺寸无法归一化或不在 `price_map` 中，价格不可用。不在运行时猜测 `size`、`input.size` 等替代字段；需要支持哪个 schema 字段，就在 `price_key` 中明确写出。

## Seedance 2.0 示例

KIE Seedance 2.0 是特殊模型。它的价格表可以用通用 `price_key + price_map + price_final`，但需要 `billing_adapter` 先计算计费上下文。

KIE 原始规则：

```txt
No video = Price * Output
With video = Price * (Input + Output)
```

标准版：

```json
{
  "docUrl": "https://docs.kie.ai/market/bytedance/seedance-2.md",
  "price_txt": "bytedance/seedance-2: 480P: 11.5 credits/s with video | 19 credits/s no video; 720P: 25 credits/s with video | 41 credits/s no video; 1080P: 62 credits/s with video | 102 credits/s no video. With video = Price * (Input + Output); no video = Price * Output.",
  "billing_adapter": "kie_seedance_2",
  "price_key": "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
  "price_map": {
    "480p|with_video": 11.5,
    "480p|no_video": 19,
    "720p|with_video": 25,
    "720p|no_video": 41,
    "1080p|with_video": 62,
    "1080p|no_video": 102
  },
  "price_final": "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})"
}
```

Fast 版：

```json
{
  "docUrl": "https://docs.kie.ai/market/bytedance/seedance-2-fast.md",
  "price_txt": "bytedance/seedance-2-fast: 480P: 9 credits/s with video | 15.5 credits/s no video; 720P: 20 credits/s with video | 33 credits/s no video. With video = Price * (Input + Output); no video = Price * Output.",
  "billing_adapter": "kie_seedance_2",
  "price_key": "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
  "price_map": {
    "480p|with_video": 9,
    "480p|no_video": 15.5,
    "720p|with_video": 20,
    "720p|no_video": 33
  },
  "price_final": "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})"
}
```

`kie_seedance_2` adapter 负责：

- 判断是否有视频输入。
- 读取或生成输入视频时长。
- 输出 `billing.has_video_input`。
- 输出 `billing.input_video_duration`。

判断视频输入字段：

```txt
video_urls
input.video_urls
reference_video_urls
input.reference_video_urls
reference_video_urls 
input.reference_video_urls 
video_url
input.video_url
video_input
input.video_input
```

输入视频时长字段：

```txt
video_duration
input.video_duration
__local_reference_metadata.videoDurationsByUrl
```

`duration` 在 Seedance 2.0 里通常是输出时长，不能作为输入视频时长读取。

重要规则：

- 如果没有视频输入，按 `no_video` 价格，只乘输出时长。
- 如果有视频输入，并且能拿到输入视频时长，按 `with_video` 价格，乘 `输入时长 + 输出时长`。
- 如果有视频输入，但拿不到输入视频时长，价格不可用，后端不能按 `with_video * 输出时长` 低价放行。
- 输入视频时长如果是小数，建议向上取整后参与计费，例如 `7.2s -> 8s`。

示例：

```txt
720p, output 5s, no video:
41 * 5 = 205 credits

720p, output 5s, input video 8s:
25 * (8 + 5) = 325 credits

720p, output 5s, has video but input duration unknown:
price unavailable
```

## billing_adapter 设计

`billing_adapter` 只做计费上下文补充，不直接决定价格。

adapter 可以处理：

- 判断某类输入是否存在。
- 从上传阶段 metadata 读取时长。
- 生成 schema 本身没有、但计费必须依赖的上下文变量。

adapter 不应该处理：

- 直接返回最终价格。
- 修改 provider payload。
- 读取外部网络。
- 做异步 provider 查询。
- 覆盖 `price_map`。

推荐 adapter 输出放在 `billing` 命名空间下，避免和 schema 字段混淆。

例如：

```json
{
  "billing": {
    "has_video_input": true,
    "input_video_duration": 8
  }
}
```

## 时长字段归一化

普通模型不需要为时长单独配置 adapter，也不维护一套猜测字段白名单。运行时只在计算 `price_key` 和 `price_final` 时，对表达式实际访问到的字段值做轻量归一化。

也就是说，配置写 `{$input.duration}` 就处理 `input.duration`；配置写 `{$input.n_frames}` 就处理 `input.n_frames`；配置写 `{$input.seconds}` 就处理 `input.seconds`。字段名由价格配置显式指定。

支持的输入：

- 数字：`8`
- 数字字符串：`"8"`
- 秒数字符串：`"8s"`

不支持的输入：

- `"auto"`：保持不可计算，最终价格不可用。
- 非数字字符串、无法确定的动态时长：返回价格不可用。

普通 per-second 模型推荐写法：

```json
{
  "price_key": "{$input.resolution || $resolution}",
  "price_map": {
    "720p": 16
  },
  "price_final": "{$price}*{$input.duration || $duration}"
}
```

如果时长是价格档位的一部分，仍然直接使用 schema 字段：

```json
{
  "price_key": "{$input.duration}|{$input.aspect_ratio || $aspect_ratio}",
  "price_map": {
    "10|16:9": 3,
    "15|16:9": 3
  },
  "price_final": "{$price}*{$input.duration}"
}
```

## 前端职责

前端可以使用同一套价格逻辑做展示预估，但不能作为最终扣费依据。

前端需要：

- 当前 payload 变化时重新计算价格。
- 价格不可用时提示用户补全必要参数。
- 对需要输入视频时长的模型，尽量在上传本地视频时读取 duration 并写入本地 metadata。
- 如果远程 URL 无法获取 duration，不应展示确定价格。

前端不应该：

- 自己维护另一套价格表。
- 把前端估算结果直接传给后端作为扣费结果。
- 在变量缺失时用默认低价兜底。

## 后端职责

后端必须重新计算价格，并以此作为唯一扣费依据。

后端需要：

- 使用准备后的 payload 计算价格。
- 执行 `billing_adapter`。
- 计算 `price_key`、查 `price_map`、计算 `price_final`。
- 对最终积分向上取整。
- 价格不可用时拒绝执行。
- 提交 provider 前删除仅用于本地计费的 metadata，例如 `__local_reference_metadata`。

后端不应该：

- 信任前端传入的价格。
- 在匹配不到价格时继续生成。
- 对特殊模型做低价兜底。

## 迁移规则

整理价格配置时：

1. 先把每个模型的价格维度整理成 `price_map`。
2. 能用 schema 字段表达的，直接写 `price_key`。
3. schema 字段的格式归一化优先由运行时表达式取值阶段处理，不新增 adapter；只有需要 schema 之外的计费上下文时才增加 `billing_adapter`。
4. 将旧 `creditUnit: per second` 逻辑迁移到 `price_final`。
5. 不再新增或保留 catalog/runtime 级别的价格行字段；只保留人工可核查价格表。
6. 旧多行匹配逻辑不再保留；前端和后端只从动态价格配置计算价格。

优先迁移顺序：

1. KIE Seedance 2.0 和 Seedance 2.0 Fast，因为它们现在有硬编码动态价格。
2. fal GPT Image 2，因为它能用尺寸和 quality 精确预估。
3. 普通 per-second 视频模型。
4. 固定 per-image / per-video 模型。
5. 需要 provider usage 才能准确知道价格的 token 模型，先保留 notes 或做保守预扣。

## 验收标准

实现后至少需要覆盖这些场景：

- 普通 per-second 模型：`rate * duration`。
- 普通 per-image 模型：`rate * num_images`。
- 固定价格模型：`price`。
- 多维价格模型：resolution + audio + duration。
- GPT Image 2：image size + quality + num_images。
- Seedance 2.0 无视频输入：`no_video rate * output duration`。
- Seedance 2.0 有视频输入且有输入时长：`with_video rate * (input + output)`。
- Seedance 2.0 有视频输入但无输入时长：价格不可用。
- key 查不到：价格不可用。
- 变量缺失：价格不可用。
- 前端预估和后端预扣同 payload 下结果一致。

## 开发注意事项

- 价格配置应优先放在 per-model override 文件里，再聚合到 `pricing.json`。
- 每个可运行价格配置都应保留 `docUrl` 和 `price_txt`，方便后续人工核查和重新生成价格表。
- `price_map` key 要稳定、可读、可人工比对，不要用难懂编码。
- 不要在 `source` 字段中写 runtime selector 意义的值，避免和输入来源混淆。
- 对上游价格文本只做输入来源，不直接当 runtime 价格。
- 对无法预估的模型，不要硬造价格。可以保留 `notes`，后续再做 usage 后结算或保守预扣。
- 价格计算逻辑必须是纯函数，便于前后端复用和测试。
