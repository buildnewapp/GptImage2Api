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
NEXT_PUBLIC_GOOGLE_CLIENT_ID=364893323217-m7qisfv3p482t3v3e6dbr3ckhpdir308.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```
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
1 新建测试应用，登录主账户
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
