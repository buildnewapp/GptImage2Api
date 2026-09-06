import { apiResponse } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/error-utils";
import { isPayPalEnabled } from "@/lib/paypal/client";
import { getAvailableCheckoutProviders } from "@/lib/payments/checkout-availability";
import {
  getMainPaymentSiteUrl,
  isMainPaymentSite,
} from "@/lib/payments/main-site";
import { getPricingPlanById, isActivePricingPlan } from "@/lib/pricing";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const planId = requestUrl.searchParams.get("planId")?.trim();

  if (!planId) {
    return apiResponse.badRequest("Missing planId");
  }

  if (!isMainPaymentSite()) {
    const mainSiteUrl = new URL(
      "/api/payment/options",
      getMainPaymentSiteUrl(),
    );
    mainSiteUrl.searchParams.set("planId", planId);

    try {
      const response = await fetch(mainSiteUrl, {
        cache: "no-store",
        headers: {
          "Accept-Language": req.headers.get("accept-language") ?? "en",
        },
      });
      const body = await response.text();

      return new Response(body, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type":
            response.headers.get("content-type") ?? "application/json",
        },
        status: response.status,
      });
    } catch (error) {
      console.error("Failed to load payment options from main site:", error);
      return apiResponse.serverError(getErrorMessage(error));
    }
  }

  const plan = getPricingPlanById(planId);
  if (!isActivePricingPlan(plan) || plan.provider !== "all") {
    return apiResponse.notFound("Plan not found for payment selection");
  }

  const providers = getAvailableCheckoutProviders(plan, {
    creemEnabled: Boolean(process.env.CREEM_API_KEY),
    nowpaymentsEnabled: Boolean(process.env.NOWPAYMENTS_API_KEY),
    paypalEnabled: isPayPalEnabled,
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    subotizEnabled: Boolean(
      process.env.SUBOTIZ_API_KEY &&
        process.env.SUBOTIZ_ACCESS_NO &&
        process.env.SUBOTIZ_MERCHANT_ID,
    ),
  });

  const response = apiResponse.success({ providers });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
