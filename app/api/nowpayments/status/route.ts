import { apiResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth/server";
import { syncNowpaymentsOrder } from "@/lib/nowpayments/service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return apiResponse.unauthorized();
  }

  const orderNo = req.nextUrl.searchParams.get("order_no");
  const paymentId =
    req.nextUrl.searchParams.get("payment_id") ||
    req.nextUrl.searchParams.get("NP_id") ||
    req.nextUrl.searchParams.get("iid") ||
    "";

  if (!orderNo) {
    return apiResponse.badRequest("Missing order number.");
  }

  const result = await syncNowpaymentsOrder({
    orderNo,
    paymentIdHint: paymentId,
    userId: user.id,
  });

  if (!result) {
    return apiResponse.notFound("Payment record not found.");
  }

  return apiResponse.success({
    message: result.message,
    orderId: result.order.id,
    paymentId: result.paymentId,
    planId: result.order.planId,
    providerStatus: result.providerStatus,
    status: result.status,
  });
}
