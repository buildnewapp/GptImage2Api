# 内容修改
## create-new-site skill
方式一，使用提示词，推荐，修改更全面

```
create-new-site  是干什么的？
-------------------------------------------
产品名  tikdek，域名 tikdek.com， 邮箱 support@tikdek.com， 描述：ai 视频、图片生成平台，提供免费使用机会，提供实名上主流模型，价格低，提供稳定的 api 服务
核心关键词：ai video generator，ai image genrator, ai video api, ai image api
主要功能：ai 视频生成、ai 图片生成、ai 视频生成 api、ai 图片生成 api
pricing 根据当前产品跳转，保留 demo，语言 en/zh/ja ，竞品： https://pollo.ai/

帮我写个使用技能的完整详细的提示词
```
新项目使用以下题词是
```
请使用 create-new-site 技能，基于当前 NEXTY.DEV 模板，把站点完整定制为 Tikdek 产品站。

请严格遵守以下工作规则：
...
7. 最终给出修改总结和 `new_site.md` 路径。
```

方式二，直接使用skill
```
使用这个create-new-site skill 网站网站初始化：

项目信息：
- 产品名：Tikdek
- 域名：https://tikdek.com
- 联系邮箱：support@tikdek.com
- 产品描述：Tikdek 是一个 AI 视频和 AI 图片生成平台，提供免费使用机会，支持主流 AI 视频/图片模型，价格更低，并提供稳定的 API 服务。
- 目标用户：AI 创作者、内容创作者、开发者、SaaS 创业者、需要集成 AI 视频/图片生成能力的团队。
- 核心关键词：
  - ai video generator
  - ai image generator
  - ai video api
  - ai image api

主要功能：
1. AI 视频生成
2. AI 图片生成
3. AI 视频生成 API
4. AI 图片生成 API
5. 免费试用机会
6. 支持主流 AI 模型
7. 低价稳定的 API 服务

竞品参考：
- https://pollo.ai/
```
## llms.txt 修改
```
请为这个 Next.js 网站生成 `public/llms.txt` 和 `public/llms-full.txt` 两个文件。

要求：

1. 先阅读并参考这些文件里的站点信息、路由配置和公开链接：
   - `config/site.ts`
   - `i18n/routing.ts`
   - `app/sitemap.ts`
   - `components/header/Header.tsx`
   - `components/header/HeaderLinks.tsx`
   - `components/footer/Footer.tsx`
   - 如有必要，也可以参考对应的 i18n message 文件，例如：
     - `i18n/messages/en/*.json`
     - `i18n/messages/zh/*.json`
     - `i18n/messages/ja/*.json`

2. 多语言必须从配置文件读取，不要硬编码猜测：
   - 支持的语言从 `i18n/routing.ts` 的 `LOCALES` 读取
   - 默认语言从 `DEFAULT_LOCALE` 读取
   - 语言名称从 `LOCALE_NAMES` 读取
   - 默认语言使用根路径，例如 `https://sdanceai.com`
   - 非默认语言使用 locale 前缀，例如 `https://sdanceai.com/zh`、`https://sdanceai.com/ja`
   - 不要添加配置中不存在的语言

3. 不要凭空编造不存在的页面链接。
   只使用项目中真实存在、header/footer/sitemap 中能找到的公开页面链接。
   不要包含：
   - dashboard
   - admin
   - auth
   - api
   - stripe
   - private
   - webhook
   - error pages
   - `_next` 静态资源路径

4. `llms.txt` 要保持简洁，作为给 LLM 的站点导航摘要：
   - 使用 Markdown 格式
   - 以 `# 站点名` 开头
   - 包含一句简短站点介绍
   - 优先列出默认语言的核心公开页面
   - 需要包含多语言入口，但不要把所有多语言页面完整展开
   - 多语言入口根据 `LOCALES` / `DEFAULT_LOCALE` / `LOCALE_NAMES` 自动整理
   - 链接使用完整绝对 URL，域名从 `siteConfig.url` 获取

5. `llms-full.txt` 要更完整，作为给 LLM 的站点上下文文件：
   - 使用 Markdown 格式
   - 包含站点名称、简介、目标用户、核心功能、主要页面、内容资源、联系方式/社交链接
   - 可以更详细地解释每个公开页面的用途
   - 需要展开多语言页面列表
   - 多语言页面必须根据 `i18n/routing.ts` 和 sitemap/header/footer 中的公开路径生成
   - 每种语言的标题和描述优先从对应的 i18n message 文件读取
   - 如果某个语言缺少翻译内容，可以回退到默认语言，但要保持链接路径正确
   - 不要写营销夸张语
   - 不要添加无法从代码中确认的信息
   - 不要包含隐私敏感信息、后台链接、内部 API、环境变量值

6. 推荐结构：

`public/llms.txt`：

- 站点标题
- 一句话简介
- `## Primary Pages`
- `## Localized Versions`
- 可选：`## Resources`

`public/llms-full.txt`：

- 站点标题
- Overview
- Core Features
- Primary Pages
- Localized Pages
- Content Resources
- Contact / Social Links
- Notes for AI Assistants

7. 保持实现简单：
   - 只新增或修改 `public/llms.txt`
   - 只新增或修改 `public/llms-full.txt`
   - 不要新增路由
   - 不要新增生成脚本
   - 不要新增测试文件
   - 不要修改 middleware
   - 不要抽离函数
   - 不要改动其它业务代码

8. 生成后请检查：
   - `/llms.txt` 和 `/llms-full.txt` 是否位于 `public/`
   - 文件内容是否是 Markdown
   - 是否只包含公开页面
   - 多语言链接是否符合 `i18n/routing.ts`
   - 默认语言是否使用根路径
   - 非默认语言是否使用 locale 前缀

生成后请说明这两个文件部署后的访问地址，例如：
- `/llms.txt`
- `/llms-full.txt`

请让内容对搜索引擎和 AI 爬虫友好，但不要关键词堆砌。
```