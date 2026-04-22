import PricingByGroup from "@/components/pricing/PricingByGroup";
import { constructMetadata } from "@/lib/metadata";
import NowpaymentsStatusBanner from "./NowpaymentsStatusBanner";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;

  return constructMetadata({
    locale,
    path: "/payment/nowpayments",
    title: "NOWPayments",
    description: "Choose a plan and pay with crypto through NOWPayments.",
  });
}

export default async function NowpaymentsPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <div className="w-full mt-20">
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
            NOWPayments
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
            Pay with Crypto
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Choose a plan below and complete your purchase with cryptocurrency via
            NOWPayments. For plans that are normally billed as subscriptions, this
            page creates a one-time payment only and does not enable auto-renewal.
          </p>
        </div>
        <NowpaymentsStatusBanner locale={locale} />
      </div>
      <PricingByGroup checkoutMode="nowpayments" />
    </div>
  );
}
