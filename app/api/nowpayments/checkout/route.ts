import { apiResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth/server";
import { getErrorMessage } from "@/lib/error-utils";
import { createNowpaymentsInvoiceOrder } from "@/lib/nowpayments/service";

type RequestData = {
  locale?: string;
  planId?: string;
};

export async function POST(req: Request) {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return apiResponse.unauthorized();
  }

  let requestData: RequestData;
  try {
    requestData = await req.json();
  } catch (error) {
    console.error("[NOWPayments checkout] Invalid request body", error);
    return apiResponse.badRequest();
  }

  if (!requestData.planId) {
    return apiResponse.badRequest("Missing planId");
  }

  try {
    const result = await createNowpaymentsInvoiceOrder({
      locale: requestData.locale,
      planId: requestData.planId,
      user,
    });

    return apiResponse.success({
      orderNo: result.orderNo,
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    console.error("[NOWPayments checkout] Failed to create invoice", error);
    return apiResponse.serverError(getErrorMessage(error));
  }
}
