import {
  buildNowpaymentsRedirectUrl,
  extractNowpaymentsCallbackPaymentId,
  syncNowpaymentsOrder,
} from "@/lib/nowpayments/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const orderNo = req.nextUrl.searchParams.get("order_no") || "";
  const locale = req.nextUrl.searchParams.get("locale") || undefined;
  const paymentId = extractNowpaymentsCallbackPaymentId(req.nextUrl.searchParams);

  if (orderNo) {
    try {
      await syncNowpaymentsOrder({
        orderNo,
        paymentIdHint: paymentId,
      });
    } catch (error) {
      console.error("[NOWPayments callback] Failed to sync order", error);
    }
  }

  return NextResponse.redirect(
    buildNowpaymentsRedirectUrl({
      locale,
      orderNo,
      paymentId: paymentId || undefined,
    }),
  );
}
