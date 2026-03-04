# dev

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
https://cf.1000aitools.com
http://localhost:3000/api/auth/callback/google
https://cf.1000aitools.com/api/auth/callback/google
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=364893323217-m7qisfv3p482t3v3e6dbr3ckhpdir308.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```
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

