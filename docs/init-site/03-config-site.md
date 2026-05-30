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
postgresql://user_demo1:tN6wN9cE4wQ0eX9k@localhost:5432/db_demo1

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
MODERATION_API_KEY=

### 定时任务
GET /api/ai-studio/archive-r2?secret=YOUR_SECRET&limit=10
定时把资源传到R2，5分钟
