# 邮件发送与后台记录

## 配置

使用 `EMAIL_PROVIDER=resend` 或 `EMAIL_PROVIDER=cloudflare` 选择一个通道。未设置时默认 Resend，兼容已有部署；不会在发送失败时切换通道或自动重发。

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=support@example.com
EMAIL_FROM_NAME=Example
RESEND_API_KEY=...
```

使用 Cloudflare 时配置：

```env
EMAIL_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_EMAIL_API_TOKEN=...
EMAIL_FROM=support@example.com
EMAIL_FROM_NAME=Example
```

`EMAIL_FROM` / `EMAIL_FROM_NAME` 为空时，分别回退到 `ADMIN_EMAIL` / `ADMIN_NAME`。`ADMIN_EMAIL` 同时仍是管理员告警的收件邮箱。邮箱登录开关沿用 `NEXT_PUBLIC_EMAIL_LOGIN`；这是前端配置，部署时需重新构建镜像使其生效。

Cloudflare 通过 REST API 发送，可用于 Docker 部署。需要将发件域名接入 Cloudflare Email Service，并给 API Token 授予 `Email Sending: Edit`。邮件类型应符合所选通道的使用范围。

- [Cloudflare 发信配置](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Cloudflare REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/)
- [Cloudflare 使用范围](https://developers.cloudflare.com/email-service/reference/faq/)

## 数据库与部署

新增迁移 `lib/db/migrations/0048_email_logs.sql`，仅新增邮件状态枚举、`email_logs` 表及索引，无 seed。先检查并执行待应用迁移，再启动新版本：

```sh
pnpm db:migrate
```

记录从启用功能后开始保存，没有自动过期或清理。历史自动邮件无法回填。群发任务仍使用原有任务记录；每个收件人的发送结果分别写入 `email_logs`。

## 发送入口

服务端统一调用 `lib/email/send.ts` 中的 `sendEmail()`，显式传入 `templateKey`、React 模板和 `reactProps`。模板统一生成 HTML 和纯文本，再发给选中的通道。

普通通知、认证邮件和管理员群发均接入该入口。验证码、登录链接、退订令牌在写入变量、主题和错误信息时脱敏，原始变量用于实际发信。Resend 联系人同步仅在选择 Resend 且调用方要求同步时执行，失败不会导致邮件重发；本次没有新增跨通道营销订阅管理。

发送前必须成功创建记录。准备或明确拒绝记为 `failed`，网络超时、不完整响应记为 `unknown`，通道确认接受记为 `sent`。CF 返回的投递、排队、永久退信或收件人抑制结果另存 `deliveryStatus`。`sent` 不等于一定进入收件箱，也没有接入后续 Webhook。

发送后数据库更新失败时，原记录可能停留在 `sending`，服务日志会输出记录 ID 和结果；需要核对通道后台。对带有 `idempotencyKey` 的请求，已提交记录直接返回原结果，其他既有状态不会自动重新发送。这样群发续发和切换通道不会重复投递结果未确认的邮件。

## 后台

管理员菜单「邮件记录」：`/dashboard/email-logs`。

- 按收件人、发件人、主题或通道邮件 ID 搜索。
- 按通道、发送状态、模板、日期范围组合筛选；日期与显示时间统一为 UTC+8。
- 服务端分页，按创建时间和 ID 倒序。
- 详情展示变量快照、错误原因、通道邮件 ID 和群发任务 ID。
- 列表和详情查询都检查管理员权限。

## 验证

```sh
pnpm exec tsx --test lib/email/email.test.ts lib/admin/system-emails.test.ts
pnpm exec tsc --noEmit --incremental false
```

实际通道连通性需使用已验证的发件域名和对应凭据，在测试环境发送一封测试邮件，再检查后台记录及收件箱。

## 创始人关怀邮件

五个自动关怀节点、子项目品牌配置、可选 PDF 附件和定时接口见 [创始人关怀与召回邮件](./email-recall.md)。`sendEmail()` 同时支持 `replyTo` 及 base64 `attachments`，沿用本页的发送记录和幂等机制。
