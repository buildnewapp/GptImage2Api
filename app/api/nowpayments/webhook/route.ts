import {
  getNowpaymentsIpnSecret,
  verifyNowpaymentsSignature,
} from "@/lib/nowpayments";
import {
  extractNowpaymentsPayloadIdentity,
  syncNowpaymentsOrder,
} from "@/lib/nowpayments/service";

export async function POST(req: Request) {
  const signature = req.headers.get("x-nowpayments-sig") || "";
  const body = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    console.error("[NOWPayments webhook] Invalid JSON body", error);
    return new Response("Invalid request body.", { status: 400 });
  }

  let secret: string;
  try {
    secret = getNowpaymentsIpnSecret();
  } catch (error) {
    console.error("[NOWPayments webhook] Missing IPN secret", error);
    return new Response("Server configuration error.", { status: 500 });
  }

  const verified = verifyNowpaymentsSignature({
    payload,
    secret,
    signature,
  });

  if (!verified) {
    return new Response("Invalid signature.", { status: 400 });
  }

  const { orderNo, paymentId } = extractNowpaymentsPayloadIdentity(payload);
  if (!orderNo && !paymentId) {
    return new Response("Missing order reference.", { status: 400 });
  }

  try {
    const result = await syncNowpaymentsOrder({
      orderNo: orderNo || undefined,
      paymentIdHint: paymentId || undefined,
    });

    if (!result) {
      return new Response("Payment record not found.", { status: 404 });
    }

    return Response.json({
      ok: true,
      orderNo: result.order.providerOrderId,
      paymentId: result.paymentId,
      status: result.status,
    });
  } catch (error) {
    console.error("[NOWPayments webhook] Failed to sync order", error);
    return new Response("Failed to sync payment status.", { status: 500 });
  }
}
