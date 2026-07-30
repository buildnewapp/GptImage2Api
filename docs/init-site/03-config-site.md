修改配置中域名、名称、邮箱
修改网站配置 config/site.ts

## 创建数据库

### vps 创建数据库

```
-- 1. 创建新用户（请替换为强密码）
CREATE USER user_gptapi WITH ENCRYPTED PASSWORD 'yS1cG5gW3aY8sK0j';

-- 2. 创建新数据库，并将所有者直接指定为刚才创建的新用户
CREATE DATABASE db_gptapi OWNER user_gptapi;

-- 3. 撤销默认 PUBLIC 角色对该数据库的所有权限（这是隔离的核心）
-- 这一步确保了其他普通用户（哪怕是以后创建的用户）无法连接到这个新库
REVOKE ALL PRIVILEGES ON DATABASE db_gptapi FROM PUBLIC;
 
-- 4. 显式授予新用户对该库的所有权限
-- （注意：因为该用户已经是 Owner，默认就有完整权限，但作为标准化脚本显式声明会更清晰）
GRANT ALL PRIVILEGES ON DATABASE db_gptapi TO user_gptapi;

```
postgresql://user_gptapi:yS1cG5gW3aY8sK0j@149.56.24.231:9876/db_gptapi
postgresql://user_gptapi:yS1cG5gW3aY8sK0j@localhost:5432/db_gptapi
postgresql://user_gptapi:yS1cG5gW3aY8sK0j@database-pg17ssl-pvhus1:5432/db_gptapi

### 初始化数据库 （正式库+测试库）
pnpm db:migrate
pnpm db:seed
pnpm db:initAdmin

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
https://nexty.dev/zh/docs/integration/cloudflare-r2
```
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://demo.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "Content-Disposition",
      "ETag",
      "Last-Modified"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 修改对外提供模型
config/ai-video-studio.ts


### stripe
1 测试环境
https://dashboard.stripe.com/acct_1TyTfw5RIwEG87IR/test/dashboard
Developers -> Overview：
STRIPE_SECRET_KEY=sk_test_51TyTfw5RIwEG87IRyfd15tOl2au206c8ZgNDMvtZDcYnziHEUGkicCrjsc0Td40hGMza91JncdfgqIg94wAOKeol00YJAzkSS4
STRIPE_PUBLISHABLE_KEY=pk_test_51TyTfw5RIwEG87IRpah0YimUlN4WBOpWjX7ZNM8SPgjSgpa3yLDC1GJyQsFzTzXuHlqUKdAmJPRu29K5ofP95mZS00M65KO8jg
STRIPE_WEBHOOK_SECRET=whsec_61DN2JUWWWHryzqhNEzrNWkhhWcr5I2O

charge.refunded
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
radar.early_fraud_warning.created

ngrok http --domain=many-fine-bullfrog.ngrok-free.app 3000
Webhook URL: https://many-fine-bullfrog.ngrok-free.app/api/stripe/webhook

2 真实环境
Developers -> Overview：
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=


Webhook URL: {NEXT_PUBLIC_SITE_URL}/api/stripe/webhook

3 产品同步
# 测试产品，加载 .env.local
pnpm db:sync-stripe-products -- env=test

# 正式产品，加载 .env
pnpm db:sync-stripe-products -- env=live

pnpm db:seed

4 开启防欺诈雷达
a 开启所有能开启的 rule
b 再加上 request 3DS rule：
:risk_score: >= 40
c 添加以下 block rules：
一周内创建的新用户使用超过5张卡
:card_count_for_customer_weekly: > 5 and :hours_since_customer_was_created: <= 168

一周内同一客户使用超过4张信用卡
:card_count_for_customer_weekly: > 4 and :card_funding: = 'credit'

一周尝试高风险卡数量大于3
:card_count_for_customer_weekly: > 3 and :risk_score: > 50

一天同一IP地址进行大量高风险尝试
:total_charges_per_ip_address_daily: > 10 and :risk_score: > 40
d Risk controls开启最大



### paypal
产品同步必须传入 `env`：`test` 加载 `.env.local`，`live` 加载 `.env`。

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
pnpm db:sync-paypal-products -- env=test --force
pnpm db:sync-paypal-products -- env=live --force
pnpm db:seed

#### 真实环境
1 新建应用，登录主账户
https://developer.paypal.com/dashboard/applications/live
create app → name + Merchant + Sandbox Account → get Client ID + Secret key 1
回调地址：https://sdanceai.com/api/paypal/notify
点击查看应用详情
添加 webhook → 填写 回调地址 + all events → save
3 自动创建订阅产品
提供PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET 让 ai 使用脚本创建产品+订阅计划，获取计划 id
pnpm db:sync-paypal-products -- env=live
查看创建成功：https://www.paypal.com/billing/plans
查看 plan id 回写
4 测试账户
卖家: sb-6kvqf45985282@business.example.com 、{fS]JJ3@   
买家：sb-bpqfs45936111@personal.example.com、 Ri&W3dVD

### creem
回调地址
https://many-fine-bullfrog.ngrok-free.app/api/creem/webhook
https://xxxx/api/creem/webhook
*修改 .env 配置*
测试环境配置放在 `.env.local`，正式环境配置放在 `.env`。
pnpm db:sync-creem-products -- env=test --force
pnpm db:sync-creem-products -- env=live --force
pnpm db:seed
# moderation provider: none | creem
MODERATION=creem
MODERATION_API_KEY=

### subotiz
API Docs: https://docs.subotiz.com/zh/quick-start/quick-start
Sandbox API: https://api.sandbox.subotiz.com
Production API: https://api.subotiz.com
Webhook URL: {NEXT_PUBLIC_SITE_URL}/api/subotiz/webhook
1 测试环境
https://admin.sandbox.subotiz.com/
菜单 开发者：
SUBOTIZ_API_BASE_URL=https://api.sandbox.subotiz.com
SUBOTIZ_API_KEY=sk_cztHfUpNUk89e1NVVnF7P3VmKWZXXk43L1kkeSIrb0lAQjg+LzgpNCFLUC9Yaipu
SUBOTIZ_ACCESS_NO=95111ac4f401151
SUBOTIZ_MERCHANT_ID=671337251707303881

ngrok http --domain=many-fine-bullfrog.ngrok-free.app 3000
Webhook URL: https://many-fine-bullfrog.ngrok-free.app/api/subotiz/webhook
2 真实环境
https://admin.subotiz.com/
菜单 开发者：
SUBOTIZ_API_BASE_URL=https://api.subotiz.com
SUBOTIZ_API_KEY=sk_PTNzUHcsJjlOYytCXS4sS1gnQ1BWIzM4ayk9eyxbdjdeMXojPHRwNE9ZK05dSTlQ
SUBOTIZ_ACCESS_NO=9428b770b801353
SUBOTIZ_MERCHANT_ID=667249039162490822

Webhook URL: {NEXT_PUBLIC_SITE_URL}/api/subotiz/webhook

3 产品同步
# 测试产品，加载 .env.local
pnpm db:sync-subotiz-products -- env=test

# 正式产品，加载 .env
pnpm db:sync-subotiz-products -- env=live

pnpm db:seed

### 定时任务
GET /api/ai-studio/archive-r2?secret=YOUR_SECRET&limit=10
定时把资源传到R2，5分钟
