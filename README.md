# dev

git clone https://github.com/buildnewapp/nexty-cf-template.git new-project-name

## install
https://nexty.dev/zh/docs/start-project/cf-workers
```
pnpm install
cp .env.example .env.local
cp .env.example .env
```
## 创建数据库

### vps 创建数据库

```
-- 1. 创建新用户（请替换为强密码）
CREATE USER user_gptimage2 WITH ENCRYPTED PASSWORD 'nD6jK1kM0oV2kB8j';

-- 2. 创建新数据库，并将所有者直接指定为刚才创建的新用户
CREATE DATABASE db_gptimage2 OWNER user_gptimage2;

-- 3. 撤销默认 PUBLIC 角色对该数据库的所有权限（这是隔离的核心）
-- 这一步确保了其他普通用户（哪怕是以后创建的用户）无法连接到这个新库
REVOKE ALL PRIVILEGES ON DATABASE db_gptimage2 FROM PUBLIC;

-- 4. 显式授予新用户对该库的所有权限
-- （注意：因为该用户已经是 Owner，默认就有完整权限，但作为标准化脚本显式声明会更清晰）
GRANT ALL PRIVILEGES ON DATABASE db_gptimage2 TO user_gptimage2;

```
postgresql://user_gptimage2:nD6jK1kM0oV2kB8j@31.97.65.98:9876/db_gptimage2

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
https://gptimage2api.net
http://localhost:3000/api/auth/callback/google
https://gptimage2api.net/api/auth/callback/google
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

#### 真实环境
1 新建应用，登录主账户
https://developer.paypal.com/dashboard/applications/live
create app → name + Merchant → get Client ID + Secret key 1
ASXFVl5USRt66XiwKVgjLcbzdj-UjwdnX9OFo8LsP5JcxPh7_nclIY2EjsszgXgnwqKQzUP7STuuyFWy
EA1KrD1ljNzfA23vWKN1dGJGkEpRr2b014IHf4lOJFSD4ubR6ujOQcAkdwHsW0pUVUaiyr3jlVBsWeJZ
回调地址：https://gptimage2api.net/api/paypal/notify
点击查看应用详情
添加 webhook → 填写 回调地址 + all events → save
3 自动创建订阅产品
提供PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET 让 ai 使用脚本创建产品+订阅计划，获取计划 id
pnpm db:sync-paypal-products
查看创建成功：https://www.paypal.com/billing/plans
查看 plan id 回写
4 测试


## 部署 cf

### 配置
```
npx wrangler login
cp wrangler.example.jsonc wrangler.jsonc
```
<YOUR_WORKER_APP_NAME>:cf-demo1
<YOUR_WORKER_APP_NAME>:cf-demo1
<YOUR_ACCOUNT_ID>:5303b4fd7e98dd71905ec635471689fc
Dashboard → Workers & Pages → Overview → Account ID
<YOUR_BUCKET_NAME>:cf-demo1-r2
npx wrangler r2 bucket create cf-demo1-r2
<YOUR_D1_DATABASE_NAME>:cf-demo1-d1
npx wrangler d1 create cf-demo1-d1
<YOUR_D1_DATABASE_ID>:95a48d8a-76ac-4fc2-ba12-0303121881bc

open chrome : https://dash.cloudflare.com/5303b4fd7e98dd71905ec635471689fc/workers/hyperdrive
Create Hyperdrive configuration
cf-demo1-pg
postgresql://user_demo1:tN6wN9cE4wQ0eX9k@31.97.65.98:9876/db_demo1
Caching: false
<YOUR_HYPERDRIVE_ID>:ec811d6f40d24dd3b98c7e14288237cc
<YOUR_POOLER_CONNECTION_STRING>:postgresql://user_demo1:tN6wN9cE4wQ0eX9k@31.97.65.98:9876/db_demo1

### 创建 worker
node scripts/sync-env-to-cloudflare.mjs .env
会自动创建 worker
pnpm cf:deploy

### 自动部署，提交 github 自动
cf -> worker -> setting -> Build
把所有生产环境的环境变量添加进来，这一步只能手动操作；NEXT_PUBLIC_ 开头的环境变量直接添加，其他环境变量要点击 Encrypt 按钮加密。添加环境变量时，不要把引号复制进去。
Build cache 设置成 Disabled
注意：Variables and Secrets + Build 运行时、编译时 变量需要手动一个一个添加进去

## 部署 vps
### merge from template
git remote add template https://github.com/buildnewapp/nexty-cf-template.git
git fetch template
git checkout template/main -- .
### 删除你当前项目里有、但模板里已经没有的文件
git diff --name-only --diff-filter=D main..template/main -z | xargs -0 git rm --ignore-unmatch
git commit -m "chore: sync all files from nexty-cf-template"
### merge 流程
git stash push -u -m "before merge template"

git fetch template
git merge --allow-unrelated-histories --no-commit template/main

git commit -m "merge template/main"
git stash pop

## 提示词修改
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
