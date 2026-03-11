import type { PostType } from "@/lib/db/schema";
import {
  normalizeAlternativeMetadata,
  normalizeCompareMetadata,
  normalizeTemplateMetadata,
  normalizeUseCaseMetadata,
} from "@/lib/seo/content-schema";

type SeoContentSeedEntry = {
  language: "en" | "zh";
  postType: Extract<
    PostType,
    "blog" | "use_case" | "template" | "alternative" | "compare"
  >;
  title: string;
  slug: string;
  content: string;
  description: string;
  featuredImageUrl: string;
  isPinned: boolean;
  status: "published";
  visibility: "public";
  metadataJsonb: Record<string, unknown>;
};

export const seoContentSeedEntries: SeoContentSeedEntry[] = [
  {
    language: "en",
    postType: "blog",
    title: "AI Video Workflow Test Post",
    slug: "ai-video-workflow-test-post",
    content: `# AI Video Workflow Test Post

This is an English seed blog post for validating the admin blog workflow.

## What this post is for
- Verify db:seed:seo-content can create blog rows
- Verify /dashboard/blogs can list seeded blog posts
- Provide realistic content for editing and preview checks

## Quick notes
The content is intentionally short and stable so repeated seed runs remain easy to inspect.
`,
    description:
      "English test blog content used to verify seeded blog posts appear in the admin dashboard.",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    isPinned: false,
    status: "published",
    visibility: "public",
    metadataJsonb: {},
  },
  {
    language: "zh",
    postType: "blog",
    title: "AI 视频工作流测试博客",
    slug: "ai-video-workflow-test-post-zh",
    content: `# AI 视频工作流测试博客

这是一篇用于验证后台博客流程的中文种子文章。

## 这篇文章的用途
- 验证 db:seed:seo-content 可以写入 blog 数据
- 验证 /dashboard/blogs 可以展示初始化后的博客
- 为编辑、预览和列表页提供稳定测试内容

## 说明
内容刻意保持简短且固定，方便重复执行 seed 后核对结果。
`,
    description:
      "用于验证初始化博客数据是否能进入后台博客列表的中文测试文章。",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    isPinned: false,
    status: "published",
    visibility: "public",
    metadataJsonb: {},
  },
  {
    language: "en",
    postType: "use_case",
    title: "AI Headshot for LinkedIn",
    slug: "ai-headshot-for-linkedin",
    content: `# AI Headshot for LinkedIn

Create a polished LinkedIn headshot in minutes. This workflow is designed for founders, job seekers, and consultants who need a professional profile image without booking a studio.

## Best for
- LinkedIn profile updates
- Resume and portfolio photos
- Team profile pages

## What you get
- Clean framing
- Neutral background
- Business-ready styling
- Natural retouching`,
    description:
      "Generate a clean LinkedIn-ready AI headshot with studio lighting, natural skin tone, and a professional business look.",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeUseCaseMetadata({
      heroSubtitle:
        "Create a professional LinkedIn AI headshot with studio quality lighting and a business-ready look.",
      targetAudience:
        "Founders, job seekers, consultants, and creators polishing their profile image.",
      problemSummary:
        "Turn a simple source photo into a trustworthy business portrait without booking a studio.",
      benefits: [
        {
          title: "Professional first impression",
          description: "Give your profile a sharper, more credible look.",
        },
        {
          title: "Faster than booking a photographer",
          description: "Generate polished options in minutes.",
        },
        {
          title: "Consistent across channels",
          description:
            "Use the same headshot for LinkedIn, resume, and portfolio.",
        },
      ],
      steps: [
        {
          title: "Upload a clear portrait",
          description: "Use a front-facing image with decent lighting.",
        },
        {
          title: "Choose a professional preset",
          description: "Pick business attire and clean studio styling.",
        },
        {
          title: "Generate multiple variations",
          description: "Compare several results before selecting one.",
        },
        {
          title: "Download your preferred version",
          description:
            "Export the headshot that best fits your profile.",
        },
      ],
      faqs: [
        {
          question: "What photo should I upload?",
          answer:
            "Use a clear, front-facing image with good lighting and minimal blur.",
        },
        {
          question: "Can I use it on LinkedIn?",
          answer:
            "Yes. The workflow is designed for professional profile photos and team pages.",
        },
        {
          question: "Will it look natural?",
          answer:
            "Yes. This setup favors realistic skin tone, soft lighting, and subtle retouching.",
        },
      ],
      ctaLabel: "Create Your Headshot",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "en",
    postType: "template",
    title: "Professional LinkedIn Headshot Prompt",
    slug: "professional-linkedin-headshot-prompt",
    content: `# Professional LinkedIn Headshot Prompt

Use this prompt to generate a realistic and trustworthy LinkedIn profile image with neutral styling and soft studio lighting.

## Recommended usage
- Job seekers
- Founders
- Consultants
- Freelancers`,
    description:
      "A reusable prompt template for generating realistic LinkedIn headshots with a clean studio style.",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeTemplateMetadata({
      prompt:
        "Create a realistic professional LinkedIn headshot, centered portrait, soft studio lighting, neutral background, sharp focus, natural skin tone, smart business attire, clean composition, high detail, trustworthy expression.",
      variables: [
        {
          key: "subject_gender",
          label: "Subject gender",
          description:
            "Optional. Use only if the prompt should bias presentation.",
        },
        {
          key: "age_range",
          label: "Age range",
          description: "Approximate age bracket for styling.",
        },
        {
          key: "clothing_style",
          label: "Clothing style",
          description: "Examples: blazer, business casual, formal shirt.",
        },
        {
          key: "background_color",
          label: "Background color",
          description: "Keep it neutral for LinkedIn-style results.",
        },
        {
          key: "lighting_softness",
          label: "Lighting softness",
          description: "Soft studio lighting is recommended.",
        },
        {
          key: "camera_framing",
          label: "Camera framing",
          description: "Chest-up or shoulder-up usually works best.",
        },
      ],
      exampleInput:
        "Female founder, early 30s, beige blazer, light gray background, soft studio lighting, chest-up framing.",
      exampleOutput:
        "A clean and realistic LinkedIn-style headshot with a neutral gray background, soft balanced lighting, natural skin texture, and polished business styling.",
      tips: [
        "Use front-facing portraits for best results.",
        "Keep the background simple and neutral.",
        "Avoid dramatic cinematic wording if you want a business profile look.",
        "Prefer realistic skin tone and subtle retouching over heavy stylization.",
      ],
      faqs: [
        {
          question: "Can I customize the outfit?",
          answer:
            "Yes. Update the clothing_style variable to fit the target look.",
        },
        {
          question: "Is this prompt good for team pages?",
          answer:
            "Yes. It works well when you need a consistent set of business portraits.",
        },
        {
          question: "Should I mention camera angle?",
          answer:
            "Yes. Chest-up or shoulder-up framing usually produces the most useful headshots.",
        },
      ],
      ctaLabel: "Try This Prompt",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "zh",
    postType: "use_case",
    title: "LinkedIn AI 职业头像",
    slug: "linkedin-ai-professional-headshot",
    content: `# LinkedIn AI 职业头像

用一张清晰正脸照片，快速生成适合 LinkedIn、简历和个人主页的职业头像。这个用例适合求职者、自由职业者和创业者。

## 适用场景
- LinkedIn 头像更新
- 简历和作品集照片
- 团队成员展示页

## 你会得到
- 更专业的第一印象
- 干净统一的背景和光线
- 更适合商业场景的穿搭与构图`,
    description:
      "生成适合 LinkedIn 的 AI 职业头像，突出自然肤色、柔和布光和干净的商务形象。",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeUseCaseMetadata({
      heroSubtitle:
        "用 AI 生成更适合 LinkedIn 的职业头像，兼顾专业感、自然感和可信度。",
      targetAudience:
        "求职者、创业者、顾问、自由职业者，以及需要统一商务形象的团队。",
      problemSummary:
        "不拍写真也能快速拿到商务头像，用于 LinkedIn、简历和个人主页。",
      benefits: [
        {
          title: "提升第一印象",
          description: "更利于建立专业、可信赖的个人形象。",
        },
        {
          title: "节省拍摄时间",
          description: "几分钟内生成多张可选职业头像。",
        },
        {
          title: "多渠道统一形象",
          description: "适合同时用于 LinkedIn、简历、官网和社媒。",
        },
      ],
      steps: [
        {
          title: "上传清晰正脸照片",
          description: "建议使用光线均匀、无遮挡的原始照片。",
        },
        {
          title: "选择职业头像风格",
          description: "优先选择商务穿搭、干净背景和柔和光线。",
        },
        {
          title: "生成多张候选结果",
          description: "对比不同神态、构图和背景版本。",
        },
        {
          title: "下载并用于职业场景",
          description: "选择最适合 LinkedIn 或简历的版本导出。",
        },
      ],
      faqs: [
        {
          question: "上传什么样的原图效果最好？",
          answer: "建议使用清晰正脸、光线自然、无遮挡的照片。",
        },
        {
          question: "可以直接用在 LinkedIn 吗？",
          answer: "可以，这套结果就是按职业社交资料页场景设计的。",
        },
        {
          question: "会不会看起来很假？",
          answer: "不会，这套配置优先追求真实肤色、自然布光和轻修饰。",
        },
      ],
      ctaLabel: "立即生成职业头像",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "zh",
    postType: "template",
    title: "LinkedIn 职业头像提示词模板",
    slug: "linkedin-professional-headshot-prompt",
    content: `# LinkedIn 职业头像提示词模板

这是一套适合生成 LinkedIn 职业头像的提示词模板，适合需要自然、干净、可信商务形象的场景。

## 推荐使用人群
- 求职者
- 创业者
- 顾问
- 自由职业者`,
    description:
      "一套可直接复用的 LinkedIn 职业头像提示词模板，适合生成真实、简洁、商务风格的人像结果。",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeTemplateMetadata({
      prompt:
        "生成一张真实专业的 LinkedIn 职业头像，人物居中，柔和棚拍布光，中性纯净背景，清晰对焦，自然肤色，商务穿搭，构图简洁，细节清晰，神态自信可信。",
      variables: [
        {
          key: "gender",
          label: "性别呈现",
          description: "如需控制人物呈现风格时可选填。",
        },
        {
          key: "age_range",
          label: "年龄区间",
          description: "用于控制整体成熟度与职业感。",
        },
        {
          key: "outfit",
          label: "穿搭风格",
          description: "例如西装、衬衫、商务休闲。",
        },
        {
          key: "background_color",
          label: "背景颜色",
          description: "建议选择灰白、浅灰等中性色。",
        },
        {
          key: "lighting",
          label: "布光强度",
          description: "建议使用柔和、均匀的棚拍光线。",
        },
        {
          key: "framing",
          label: "构图范围",
          description: "通常胸像或肩像最适合职业头像。",
        },
      ],
      exampleInput:
        "30 岁左右女性创业者，米色西装，浅灰背景，柔和棚拍光线，胸像构图。",
      exampleOutput:
        "一张适合 LinkedIn 的真实职业头像，背景干净，布光柔和，肤色自然，整体气质专业可信。",
      tips: [
        "优先使用正脸照片作为参考。",
        "背景描述尽量简洁，避免复杂场景。",
        "如果目标是职业头像，不要加入电影感或戏剧化描述。",
        "建议强调自然肤色、轻修图和商务穿搭。",
      ],
      faqs: [
        {
          question: "可以自定义服装吗？",
          answer: "可以，直接修改 outfit 变量即可。",
        },
        {
          question: "适合团队成员统一头像吗？",
          answer: "适合，这套模板很适合批量生成统一风格的职业头像。",
        },
        {
          question: "需要写镜头构图吗？",
          answer: "建议写，胸像或肩像通常最适合 LinkedIn 场景。",
        },
      ],
      ctaLabel: "试试这个模板",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "en",
    postType: "alternative",
    title: "Canva Alternative for AI Headshots",
    slug: "canva-alternative-for-ai-headshots",
    content: `# Canva Alternative for AI Headshots

If you only need fast, controllable AI headshot generation, a specialized AI workflow can be a better fit than a general-purpose design suite.

## When to switch
- You want prompt-level control
- You care about generation speed
- You need repeatable profile-photo outputs`,
    description:
      "A focused Canva alternative for teams and creators who want stronger AI headshot generation control.",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeAlternativeMetadata({
      heroSubtitle:
        "Switch from Canva when you need an AI-first workflow built specifically for professional headshots.",
      incumbentName: "Canva",
      bestFor: "marketers, founders, hiring teams, and solo creators",
      switchReasons: [
        {
          title: "More generation control",
          description: "Tune prompt wording and image output more directly.",
        },
        {
          title: "Less design overhead",
          description: "Start from a headshot workflow instead of a blank design canvas.",
        },
      ],
      advantages: [
        {
          title: "Optimized for profile photos",
          description: "Better defaults for business portraits and professional avatars.",
        },
        {
          title: "Faster iteration",
          description: "Generate and compare more variants in less time.",
        },
      ],
      limitations: [
        {
          title: "Narrower use case",
          description: "Not meant to replace a full multi-format design suite.",
        },
      ],
      faqs: [
        {
          question: "Who should switch from Canva?",
          answer: "Teams that mainly want stronger AI-generated headshots rather than general graphic design tooling.",
        },
        {
          question: "Is this a full Canva replacement?",
          answer: "No. It is a focused alternative for AI-first portrait generation workflows.",
        },
      ],
      ctaLabel: "Try the alternative",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "zh",
    postType: "alternative",
    title: "Canva 替代方案：AI 职业头像",
    slug: "canva-alternative-ai-headshots",
    content: `# Canva 替代方案：AI 职业头像

如果你的核心目标是快速生成可控的职业头像，那么聚焦 AI 生图工作流的产品，通常比通用设计工具更合适。

## 适合切换的情况
- 你更在意提示词控制能力
- 你希望批量生成头像
- 你要统一 LinkedIn 或团队资料形象`,
    description:
      "面向职业头像场景的 Canva 替代方案，更适合强调 AI 生成质量与效率的团队和个人。",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeAlternativeMetadata({
      heroSubtitle:
        "当你更重视 AI 职业头像生成效率和可控性时，聚焦型工具通常比通用设计平台更合适。",
      incumbentName: "Canva",
      bestFor: "求职者、创业者、市场团队和需要统一头像的公司",
      switchReasons: [
        {
          title: "更强的生成控制",
          description: "可以更直接地调整提示词、构图和风格输出。",
        },
        {
          title: "减少设计步骤",
          description: "不需要从空白画布开始，直接进入头像工作流。",
        },
      ],
      advantages: [
        {
          title: "更适合职业头像",
          description: "默认配置更贴近 LinkedIn、简历和团队资料页场景。",
        },
        {
          title: "迭代更快",
          description: "同样时间内可以生成更多可对比版本。",
        },
      ],
      limitations: [
        {
          title: "不覆盖所有设计场景",
          description: "它不是完整替代 Canva 的通用设计平台。",
        },
      ],
      faqs: [
        {
          question: "什么情况下适合从 Canva 切过来？",
          answer: "当你的核心需求是 AI 职业头像，而不是整套设计协作能力时。",
        },
        {
          question: "它能完全替代 Canva 吗？",
          answer: "不能，它更适合头像和 AI 生图这类聚焦型场景。",
        },
      ],
      ctaLabel: "试试这个替代方案",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "en",
    postType: "compare",
    title: "Midjourney vs Flux for Marketing Images",
    slug: "midjourney-vs-flux-for-marketing-images",
    content: `# Midjourney vs Flux for Marketing Images

Both tools are strong, but they optimize for different priorities. This comparison focuses on teams producing campaign visuals, product art, and ad concepts.`,
    description:
      "A practical Midjourney vs Flux comparison for marketers choosing between aesthetics, control, and workflow flexibility.",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeCompareMetadata({
      heroSubtitle:
        "Choose the image model that best matches your marketing workflow, not just the prettiest default output.",
      leftProduct: "Midjourney",
      rightProduct: "Flux",
      verdict:
        "Midjourney is usually stronger for first-pass aesthetics, while Flux gives teams more control and implementation flexibility.",
      comparisonRows: [
        { label: "First-pass visual quality", leftValue: "Excellent", rightValue: "Strong" },
        { label: "Prompt control", leftValue: "Medium", rightValue: "High" },
        { label: "Workflow flexibility", leftValue: "Medium", rightValue: "High" },
      ],
      recommendedScenarios: [
        {
          title: "Use Midjourney for concept exploration",
          description: "It tends to produce stronger inspiration-ready outputs with less setup.",
        },
        {
          title: "Use Flux for controllable production workflows",
          description: "It is easier to fit into repeatable pipelines and custom tooling.",
        },
      ],
      faqs: [
        {
          question: "Which is better for marketers?",
          answer: "If speed to a beautiful first result matters most, Midjourney often wins. If control and workflow integration matter more, Flux is often better.",
        },
      ],
      ctaLabel: "Start comparing",
      ctaHref: "/#pricing",
    }),
  },
  {
    language: "zh",
    postType: "compare",
    title: "Midjourney vs Flux：营销图片怎么选",
    slug: "midjourney-vs-flux-marketing-images",
    content: `# Midjourney vs Flux：营销图片怎么选

这两个模型都很强，但适合的团队并不一样。这里重点比较营销团队在广告图、产品概念图和活动视觉上的实际使用差异。`,
    description:
      "从美感、可控性和工作流适配角度，对比 Midjourney 与 Flux 在营销图片场景中的差异。",
    featuredImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    isPinned: true,
    status: "published",
    visibility: "public",
    metadataJsonb: normalizeCompareMetadata({
      heroSubtitle:
        "不要只看默认画面好不好看，更要看哪个模型更适合你的营销工作流。",
      leftProduct: "Midjourney",
      rightProduct: "Flux",
      verdict:
        "Midjourney 更适合快速拿到高美感初稿，Flux 更适合强调控制能力和可接入性的团队。",
      comparisonRows: [
        { label: "默认画面美感", leftValue: "优秀", rightValue: "强" },
        { label: "提示词控制能力", leftValue: "中等", rightValue: "高" },
        { label: "工作流灵活性", leftValue: "中等", rightValue: "高" },
      ],
      recommendedScenarios: [
        {
          title: "做创意探索优先选 Midjourney",
          description: "它更适合快速出灵感图和高完成度视觉初稿。",
        },
        {
          title: "做可控生产流程优先选 Flux",
          description: "它更容易接入可重复、可扩展的生成工作流。",
        },
      ],
      faqs: [
        {
          question: "营销团队更适合哪个？",
          answer: "如果更看重快速出漂亮图，Midjourney 往往更合适；如果更看重可控性和流程适配，Flux 往往更合适。",
        },
      ],
      ctaLabel: "开始对比",
      ctaHref: "/#pricing",
    }),
  },
];

export const seoContentSeedSlugs = {
  en: {
    blog: "ai-video-workflow-test-post",
    alternative: "canva-alternative-for-ai-headshots",
    compare: "midjourney-vs-flux-for-marketing-images",
    useCase: "ai-headshot-for-linkedin",
    template: "professional-linkedin-headshot-prompt",
  },
  zh: {
    blog: "ai-video-workflow-test-post-zh",
    alternative: "canva-alternative-ai-headshots",
    compare: "midjourney-vs-flux-marketing-images",
    useCase: "linkedin-ai-professional-headshot",
    template: "linkedin-professional-headshot-prompt",
  },
} as const;

export type { SeoContentSeedEntry };
