# Client Login 接口文档

本文档描述第三方客户端登录接入方式，适用于：

- Chrome 插件
- Figma 插件
- 桌面 App
- 通过弹窗或 iframe 发起网页登录的其他客户端

## 概述

第三方客户端通过打开站点登录页，让用户在网页端完成登录。登录成功后，服务端会把当前 `client_id` 绑定到该用户，并生成一个一次性读取的 `access_token`。

客户端侧流程：

1. 打开登录页
2. 定时轮询 `GET /api/auth/client?client_id=...`
3. 首次读取成功后拿到 token
4. 后续若需要新 token，重新发起登录流程

## 设计特点

- `client_id` 对应一个一次性票据
- `/api/auth/client` 首次读取成功后即消费
- 同一个 `client_id` 再次发起登录会覆盖旧票据
- `redirect_uri` 可选，仅用于标识调用方来源，不做服务端跳转
- 登录成功页面会向 `window.opener` / `window.parent` 发送 `client:auth_success`

## 1. 打开登录页

登录页地址：

```text
/client-auth/signin?client_id=abc&redirect_uri=figma-plugin
```

说明：

- 在默认语言下可直接使用 `/client-auth/signin`
- 如果你的站点启用了语言前缀，也可使用 `/zh/client-auth/signin`、`/ja/client-auth/signin`

查询参数：

- `client_id`：必填，长度 1 到 128
- `redirect_uri`：可选，长度不超过 1024

`redirect_uri` 示例：

- `chrome-extension://abcdefghijklmnop`
- `https://example.com`
- `figma-plugin`

注意：

- `redirect_uri` 只用于来源标识和 `postMessage` target origin 推断
- 不会在登录后跳转到该地址

## 2. 登录成功后的页面行为

用户在网页登录成功后：

- 页面会展示：`登录成功，请关闭页面`
- 页面会自动调用内部接口创建一次性 client ticket
- 页面会发送消息：

```json
{
  "type": "client:auth_success",
  "client_id": "abc",
  "redirect_uri": "figma-plugin"
}
```

发送目标：

- `window.opener`
- `window.parent`

这一步用于让插件或 iframe 容器更快感知授权完成，但是否拿到最终 token 仍以轮询接口结果为准。

## 3. 轮询读取授权结果

接口：

```http
GET /api/auth/client?client_id=abc
```

用途：

- 第三方客户端轮询当前 `client_id` 是否已完成网页登录

### 成功响应

HTTP 状态码：`200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "client_id": "abc",
    "access_token": "your-jwt-token",
    "token_type": "Bearer"
  }
}
```

说明：

- 这是一次性读取
- 第一次成功返回后，该票据会被立即消费
- 后续再请求同一个 `client_id`，不会再次返回同一 token

### 等待中

HTTP 状态码：`200`

```json
{
  "code": 1001,
  "message": "pending",
  "data": null
}
```

表示：

- 用户还没有完成网页登录
- 或当前 `client_id` 还没有写入授权票据

### 已过期或已消费

HTTP 状态码：`200`

```json
{
  "code": 1002,
  "message": "expired_or_consumed",
  "data": null
}
```

表示：

- 该 `client_id` 对应票据已过期
- 或该票据已经被成功读取过一次

此时应重新发起登录流程。

### 参数错误

HTTP 状态码：`400`

```json
{
  "code": 4000,
  "message": "client_id is required",
  "data": null
}
```

## 4. 页面内部使用的接口

下面这个接口通常不需要第三方客户端直接调用，而是由登录成功后的网页自动调用。

接口：

```http
POST /api/auth/client/session
Content-Type: application/json
```

请求体：

```json
{
  "client_id": "abc",
  "redirect_uri": "figma-plugin"
}
```

用途：

- 在当前浏览器已经登录站点账号的前提下
- 根据当前用户生成一次性 `access_token`
- 将票据写入 `cache_db`

### 成功响应

HTTP 状态码：`200`

```json
{
  "code": 0,
  "message": "ok"
}
```

### 未登录

HTTP 状态码：`401`

```json
{
  "code": 4001,
  "message": "unauthorized",
  "data": null
}
```

### 非法 JSON

HTTP 状态码：`400`

```json
{
  "code": 4000,
  "message": "invalid_json_body",
  "data": null
}
```

### 用户不存在

HTTP 状态码：`404`

```json
{
  "code": 4004,
  "message": "user_not_found",
  "data": null
}
```

## 5. 推荐接入方式

示例流程：

1. 生成一个本地唯一的 `client_id`
2. 打开：

```text
http://localhost:3000/client-auth/signin?client_id=abc&redirect_uri=chrome-extension://abcdefghijklmnop
```

3. 每隔 1 到 2 秒轮询：

```text
http://localhost:3000/api/auth/client?client_id=abc
```

4. 如果返回 `code = 0`，保存 `access_token`
5. 如果返回 `code = 1001`，继续轮询
6. 如果返回 `code = 1002`，停止轮询并重新发起登录

## 6. Token 说明

返回的 `access_token` 为服务端签发的短期 JWT。

特点：

- 独立于站点浏览器 session
- 默认短期有效
- 由当前登录用户信息生成
- 使用服务端认证密钥签名

当前 payload 包含：

- `user.uuid`
- `user.email`
- `user.nickname`
- `user.avatar_url`
- `user.created_at`
- `iat`
- `exp`

### 如何访问网站接口

当前版本中，这个 `access_token` 已接入现有 `getRequestUser()` 鉴权链路。

这意味着：

- 只要某个网站 API 是通过 `getRequestUser()` 做认证
- 就可以直接使用：

```http
Authorization: Bearer <access_token>
```

示例：

```bash
curl --location --request GET 'http://localhost:3000/api/demo/ping' \
  --header 'Authorization: Bearer <access_token>'
```

如果该接口本身不是走 `getRequestUser()`，则仍然不会自动支持此 token。

## 7. 注意事项

- 一个 `client_id` 只能成功读取一次 token
- 不要把同一个 `client_id` 长期复用在不同授权流程中
- 建议每次发起授权都生成新的 `client_id`
- `redirect_uri` 不是 OAuth 回调地址，不会被服务端重定向
- `client:auth_success` 只是通知事件，不等于 token 已被客户端取走

## 8. 常见问题

### 为什么轮询一直是 `1001`？

通常是以下原因之一：

- 用户还没有完成网页登录
- 登录页没有成功创建 ticket
- `client_id` 与打开登录页时使用的不一致

### 为什么第一次成功，第二次就拿不到 token？

这是预期行为。该接口设计为一次性读取，成功后立即消费。

### 为什么拿到的是新 JWT，而不是网站 cookie/session？

这是为了把第三方客户端授权与站内浏览器登录态隔离，避免直接暴露站内 session。
