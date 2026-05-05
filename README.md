## dev

### 自动创建项目
./scripts/create-site.sh tikdek-web /Users/syx/WebstormProjects/tikdek/tikdek-web

### create repo
cd new-project-name
gh repo create new-project-name --private --source=. --remote=origin --push

### clone
git clone https://github.com/buildnewapp/nexty-cf-template.git new-project-name
cd new-project-name
git remote rename origin upstream
git remote add origin git@github.com:buildnewapp/new-project-name.git
git push -u origin main

### check
git remote -v
```
origin    git@github.com:buildnewapp/new-project-name.git
upstream  git@github.com:buildnewapp/nexty-cf-template.git
```

### upgrade
以后同步模板更新
```
cd new-project-name
git checkout main
git pull origin main
git fetch upstream
git merge upstream/main
git push origin main
``` 
如果合并冲突,手动修改冲突文件后执行：
```
git add .
git commit
git push origin main
```
如果合并后发现有问题，想撤销
还没 push 的情况：
git merge --abort
已经 push 的情况：
git reset --hard HEAD~1
git push origin main --force

## install
https://nexty.dev/zh/docs/start-project/cf-workers
```
pnpm install
cp .env.example .env.local
cp .env.example .env
```
修改配置中域名、名称、邮箱
修改网站配置 config/site.ts

## 创建数据库

### vps 创建数据库

```
-- 1. 创建新用户（请替换为强密码）
CREATE USER user_demo1 WITH ENCRYPTED PASSWORD 'tN6wN9cE4wQ0eX9k';

-- 2. 创建新数据库，并将所有者直接指定为刚才创建的新用户
CREATE DATABASE db_demo1 OWNER user_demo1;

-- 3. 撤销默认 PUBLIC 角色对该数据库的所有权限（这是隔离的核心）
-- 这一步确保了其他普通用户（哪怕是以后创建的用户）无法连接到这个新库
REVOKE ALL PRIVILEGES ON DATABASE db_demo1 FROM PUBLIC;

-- 4. 显式授予新用户对该库的所有权限
-- （注意：因为该用户已经是 Owner，默认就有完整权限，但作为标准化脚本显式声明会更清晰）
GRANT ALL PRIVILEGES ON DATABASE db_demo1 TO user_demo1;

```
postgresql://user_demo1:tN6wN9cE4wQ0eX9k@31.97.65.98:9876/db_demo1

### 初始化数据库
pnpm db:migrate

### 导入示例定价计划种子数据
[pricing-config.ts](lib/db/seed/pricing-config.ts)   置空数据中所有 paypalProductId、paypalPlanId、creemProductId
pnpm db:seed

## 配置
### 谷歌登录
https://console.cloud.google.com/auth/clients
https://nexty.dev/docs/integration/auth#configure-google-oauth

http://localhost:3000
https://demo.1000aitools.com
http://localhost:3000/api/auth/callback/google
https://demo.1000aitools.com/api/auth/callback/google
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 配置 r2

### 修改对外提供模型
config/ai-video-studio.ts


### paypal
统一使用 `PAY_ENV` 控制支付环境：
- `PAY_ENV=test`：PayPal Sandbox
- `PAY_ENV=live`：PayPal Live

#### 测试环境 
1 新建测试应用，登录主账户
https://developer.paypal.com/dashboard/applications/sandbox
create app → name + Merchant + Sandbox Account → get Client ID + Secret key 1
启动ngrok: ngrok http --domain=many-fine-bullfrog.ngrok-free.app 3000
回调地址：https://many-fine-bullfrog.ngrok-free.app/api/paypal/notify
点击查看应用详情
添加 webhook → 填写 回调地址 + all events → save

2 手动填写订阅产品信息
https://www.sandbox.paypal.com/billing/overview
使用刚才 Sandbox Account 账户登录
管理定期付款 → 定期付款计划 → 创建计划
创建定期付款产品 → 产品名称、产品描述、产品编号、产品类型 → 下一步
固定价格 → 计划名称、计划描述→为此定期付款计划定价→无限结算周期→价格→下一步→开启计划
返回查看计划详情→复制计划编号使用→P-xxxxx

3 自动创建订阅产品
提供PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET 让 ai 使用脚本创建产品+订阅计划，获取计划 id
pnpm db:sync-paypal-products
PAY_ENV=test pnpm db:sync-paypal-products -- --force
PAY_ENV=live pnpm db:sync-paypal-products -- --force


#### 真实环境
1 新建应用，登录主账户
https://developer.paypal.com/dashboard/applications/live
create app → name + Merchant + Sandbox Account → get Client ID + Secret key 1
回调地址：https://sdanceai.com/api/paypal/notify
点击查看应用详情
添加 webhook → 填写 回调地址 + all events → save
3 自动创建订阅产品
提供PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET 让 ai 使用脚本创建产品+订阅计划，获取计划 id
pnpm db:sync-paypal-products
查看创建成功：https://www.paypal.com/billing/plans
查看 plan id 回写
4 测试账户
卖家: sb-6kvqf45985282@business.example.com 、{fS]JJ3@   
买家：sb-bpqfs45936111@personal.example.com、 Ri&W3dVD

### creem
回调地址
https://many-fine-bullfrog.ngrok-free.app/api/creem/webhook
https://xxxx/api/creem/webhook
PAY_ENV=test pnpm db:sync-creem-products -- --force
PAY_ENV=live pnpm db:sync-creem-products -- --force
# moderation provider: none | creem
MODERATION=creem

### 定时任务
GET /api/ai-studio/archive-r2?secret=YOUR_SECRET&limit=10
定时把资源传到R2，5分钟

## 部署 vps
## merge from template
git remote add template https://github.com/buildnewapp/nexty-cf-template.git
git fetch template
git checkout template/main -- .
# 删除你当前项目里有、但模板里已经没有的文件
git diff --name-only --diff-filter=D main..template/main -z | xargs -0 git rm --ignore-unmatch
git commit -m "chore: sync all files from nexty-cf-template"
## merge 流程
git stash push -u -m "before merge template"

git fetch template
git merge --allow-unrelated-histories --no-commit template/main

git commit -m "merge template/main"
git stash pop

## 内容修改
### create-new-site skill
方式一，使用提示词，推荐，修改更全面

```
[SKILL.md](.claude/skills/create-new-site/SKILL.md)  是干什么的？
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
[SKILL.md](.claude/skills/create-new-site/SKILL.md) 使用这个 skill 网站网站初始化：

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

### seo-geo-blog-writer skill
使用 seo-geo-blog-writer skill 帮我写图文：Write targeting 'best seedance 2.0 api : sdanceai.com'


### 提示词修改
```
名称：GptImage2Api，网站地址：https://gptimage2api.net，邮箱：support@gptimage2api.net，核心功能：Gpt Image 2 Api

根据网站和关键词，帮我生成 title、description、 Short Description、Long Description、Tagline、Slogan、Categories、Tags，宣传包含关键词，符合 producthunt 宣传文案
```
```
修改首页

品牌：GptImage2Api，网站地址：https://gptimage2api.net，邮箱：support@gptimage2api.net

Title
GptImage2Api – Fast & Reliable GPT Image 2 API for Developers

Description
GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.
```
```
修改页面 /privacy-policy 、/terms-of-service、/refund-policy

品牌：GptImage2Api，网站地址：https://gptimage2api.net，邮箱：support@gptimage2api.net

Title
GptImage2Api – Fast & Reliable GPT Image 2 API for Developers

Description
GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.
```
```
[ImageTemplate.tsx](components/home/image/ImageTemplate.tsx) 修改首页内容 参考 内容：
https://fal.ai/gpt-image-2
https://openai.com/index/introducing-chatgpt-images-2-0/
https://kie.ai/gpt-image-2
https://gpt-image-2-ai.org/

不能暴露别人的品牌和网址
```
```
根据内容修改 common.json  Landing.json
```
```
curl 'https://youmind.com/youhome-api/prompts' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \  
  -H 'referer: https://youmind.com/gpt-image-2-prompts' \
  --data-raw '{"model":"gpt-image-2","page":9,"limit":18,"locale":"en-US","campaign":"gpt-image-2-prompts","filterMode":"imageCategories"}'

根据接口获取提示词，帮我整理下收集下来，保持到 content/prompts.json 中
```
```
https://youmind.com/gpt-image-2-prompts
这个页面有很多提示词，帮我整理下收集下来，保持到ym.json 中

[prompts.json](content/prompts.json) 下载 json 中所有的资源 ，比如 https://cms-assets.youmind.com/media/1776756791925_yfoe75_HGZ3LYuaYAAkuVr.jpg
下载到 media目录下 文件名 1776756791925_yfoe75_HGZ3LYuaYAAkuVr.jpg

通过.env 中的r2 配置，把media 目录上传到 r2 上
需要放到media 目录下
```
```
[Footer.tsx](components/home/video/Footer.tsx) 
Products 中去除 Showcase、Prompts
添加 Gpt Image 2 Generator (/dashboard/generate)

修改内容 参考 
Title
GptImage2Api – Fast & Reliable GPT Image 2 API for Developers

Description
GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.
```
```
[pricing-config.ts](lib/db/seed/pricing-config.ts) 修改价格文件中的描述，主要是不同语言 features
修改为符合当前项目的配置 参考 [Landing.json](i18n/messages/en/Landing.json)
不要删减内容，改成符合当前网站的权益
```
```
[sync-paypal-products.ts](lib/db/seed/sync-paypal-products.ts) 中上传产品和计划加上配置文件中的 ADMIN_NAME ，比如 Pro，paypal 后台应该是 GptApi Pro
```
```
把 content/prompts.json 导入 页面 /prompts 提示词页面，可以根据目前接口修改，需要支持分页查看，点击提示词弹框显示详情，打乱提示词顺序，根据语言导入

不要直接显示 url 地址，而是图片地址使用 url 不是缩略图；页面顶部不要有 seedance 2.0 描述，根据当前产品来修改，产品信息：
```
```
页面 http://localhost:3000/showcase ，tdk 还是就的，按照最新的修改；页面中描述还是旧的，更新当前产品信息修改：
Title
GptImage2Api – Fast & Reliable GPT Image 2 API for Developers

Description
GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.


showcase 当前没有数据，把 [prompts.json](content/prompts.json) 中 英文前 100 条、中午全部、日文全部 提示词 作为示例导入到生成记录表中，挂到用户syxchinablank@gmail.com 下，public=true，使用高清图
```
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
