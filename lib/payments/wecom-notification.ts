import { siteConfig } from "@/config/site";
import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function formatShanghaiTime(value: Date | string | null | undefined) {
  if (!value) {
    return "未知";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

export async function sendPaymentSuccessWeComNotification(orderId: string) {
  const webhookKey = process.env.WECOM_WARN_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error("WECOM_WARN_WEBHOOK_KEY is not configured");
    return;
  }

  try {
    const [order] = await getDb()
      .select({
        id: ordersSchema.id,
        userId: ordersSchema.userId,
        provider: ordersSchema.provider,
        orderType: ordersSchema.orderType,
        status: ordersSchema.status,
        planId: ordersSchema.planId,
        productId: ordersSchema.productId,
        priceId: ordersSchema.priceId,
        amountTotal: ordersSchema.amountTotal,
        currency: ordersSchema.currency,
        createdAt: ordersSchema.createdAt,
        userEmail: userSchema.email,
        userName: userSchema.name,
        userCreatedAt: userSchema.createdAt,
        planTitle: pricingPlansSchema.cardTitle,
      })
      .from(ordersSchema)
      .innerJoin(userSchema, eq(ordersSchema.userId, userSchema.id))
      .leftJoin(pricingPlansSchema, eq(ordersSchema.planId, pricingPlansSchema.id))
      .where(eq(ordersSchema.id, orderId))
      .limit(1);

    if (!order || order.status !== "succeeded") {
      return;
    }

    const userText = [
      order.userName || null,
      order.userEmail,
      order.userId,
    ].filter(Boolean).join(" / ");
    const productText =
      order.planTitle || order.productId || order.priceId || order.planId || "未知产品";
    const amountText = `${order.amountTotal} ${order.currency.toUpperCase()}`;
    const content = [
      `${siteConfig.name} 支付成功提醒`,
      `时间: ${formatShanghaiTime(order.createdAt)}`,
      `用户: ${userText}`,
      `注册时间: ${formatShanghaiTime(order.userCreatedAt)}`,
      `金额: ${amountText}`,
      `产品: ${productText}`,
      `订单: ${order.id}`,
      `渠道: ${order.provider} / ${order.orderType}`,
    ].join("\n");

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${webhookKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msgtype: "text",
          text: {
            content,
          },
        }),
      },
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok || body?.errcode !== 0) {
      console.error("send wecom payment success notification failed:", body);
    }
  } catch (error) {
    console.error("send wecom payment success notification failed:", error);
  }
}
