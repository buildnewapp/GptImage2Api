import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { constructMetadata } from "@/lib/metadata";
import { HomeIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    title: "GptImage2Api – Fast & Reliable GPT Image 2 API for Developers",
    description: `GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.`,
    path: `/refund-policy`,
    locale: "en",
    availableLocales: ["en"],
  });
}

export default function RefundPolicyPage() {
  return (
    <div className="bg-secondary/20 py-8 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-background rounded-xl border p-6 shadow-xs sm:p-8 dark:border-zinc-800">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            Refund Policy
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Last Updated: February 15, 2026
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
              <p className="mb-3">
                At {siteConfig.name}, we are committed to providing
                high-quality AI image generation services through our
                independent platform and supported third-party models. This
                Refund Policy outlines the terms and conditions under which
                refunds may be granted for purchases made on our platform,
                including credit purchases, subscription plans, and API service
                fees.
              </p>
              <p className="mb-3">
                {siteConfig.name} is an independent service that provides a
                custom interface for third-party AI models. We are not
                affiliated with, endorsed by, or sponsored by model providers.
              </p>
              <p className="mb-3">
                By making a purchase on {siteConfig.name}, you agree to the
                terms set forth in this policy. We encourage you to read this
                policy carefully before making a purchase.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                2. Credit Purchases
              </h2>
              <p className="mb-3">
                Our platform uses a credit-based system where credits are
                consumed when generating AI images. The following policies apply
                to credit purchases:
              </p>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  2.1 Refundable Scenarios
                </h3>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    <strong>Unused Credits</strong>: If you have not used any
                    purchased credits, you may request a full refund within 7
                    days of purchase
                  </li>
                  <li>
                    <strong>Technical Failures</strong>: If credits were consumed
                    due to technical errors on our platform (e.g., the image
                    generation failed but credits were deducted), we will
                    restore the credits to your account or issue a refund
                  </li>
                  <li>
                    <strong>Billing Errors</strong>: If you were charged
                    incorrectly due to a system error or payment processing
                    mistake, we will issue a full correction or refund
                  </li>
                  <li>
                    <strong>Unauthorized Charges</strong>: If charges were made
                    without your authorization (subject to verification), we
                    will issue a refund
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  2.2 Non-Refundable Scenarios
                </h3>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    <strong>Used Credits</strong>: Credits that have been
                    consumed through successful image generation are
                    non-refundable, as the AI processing resources have been
                    utilized
                  </li>
                  <li>
                    <strong>Dissatisfaction with AI Output</strong>: Since AI
                    image generation results may vary and are influenced by
                    input quality and prompts, we generally cannot offer refunds
                    based on subjective dissatisfaction with the output quality.
                    However, we encourage you to contact support for guidance
                    on improving results
                  </li>
                  <li>
                    <strong>Expired Credits</strong>: Credits that have expired
                    according to their terms are not eligible for refund
                  </li>
                  <li>
                    <strong>Promotional or Free Credits</strong>: Credits
                    received through promotions, referral programs, or for free
                    are non-refundable
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                3. Subscription Plans
              </h2>
              <p className="mb-3">
                For subscription-based plans, the following terms apply:
              </p>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  3.1 Cancellation
                </h3>
                <p className="mb-3">
                  You may cancel your subscription at any time from{" "}
                  <Link
                    href="/dashboard/subscription"
                    className="text-primary hover:underline"
                  >
                    Dashboard &gt; Subscription
                  </Link>{" "}
                  by opening the billing portal. If you need help, contact{" "}
                  <a
                    href="mailto:support@gptimage2api.net"
                    className="hover:underline text-blue-500"
                  >
                    support@gptimage2api.net
                  </a>
                  . Upon cancellation:
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    Your subscription will remain active until the end of the
                    current billing period
                  </li>
                  <li>
                    You will continue to have access to subscription benefits
                    until the period ends
                  </li>
                  <li>
                    No further charges will be applied after the current billing
                    cycle
                  </li>
                  <li>
                    Unused subscription credits may expire at the end of the
                    billing period, depending on plan terms
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  3.2 Subscription Refunds
                </h3>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    <strong>First-Time Subscribers</strong>: If you are
                    subscribing for the first time and are unsatisfied, you may
                    request a refund within 3 days of your initial subscription
                    purchase:
                    <ul className="mt-1 list-circle space-y-1 pl-6">
                      <li>
                        If you have <strong>not used</strong> any credits or
                        services, you are eligible for a <strong>full refund</strong>
                      </li>
                      <li>
                        If you have <strong>already used</strong> any included
                        credits or services, the subscription purchase is{" "}
                        <strong>not refundable</strong>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>Service Downtime</strong>: If our service
                    experiences significant downtime (more than 24 continuous
                    hours) during your billing period, you may be eligible for a
                    prorated refund or account credit for the affected period
                  </li>
                  <li>
                    <strong>Renewal Charges</strong>: If you forgot to cancel
                    before an auto-renewal and have not used any of the
                    renewed plan&apos;s credits, you may request a refund within
                    48 hours of the renewal charge
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                4. API Service Fees
              </h2>
              <p className="mb-3">
                For API service purchases:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Unused API Credits</strong>: Refundable within 7 days
                  of purchase if no API calls have been made
                </li>
                <li>
                  <strong>Failed API Requests</strong>: If API requests fail due
                  to our server errors (5xx errors), the consumed credits will
                  be automatically restored to your account
                </li>
                <li>
                  <strong>API Rate Limit Issues</strong>: Credits consumed due
                  to rate limiting or system-imposed restrictions are generally
                  not refundable, as these are part of normal service operations
                </li>
                <li>
                  <strong>Integration Issues</strong>: Refunds for API service
                  issues arising from incorrect integration or client-side
                  errors are not available
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                5. How to Request a Refund
              </h2>
              <p className="mb-3">
                To request a refund, please contact us at{" "}
                <a
                  href="mailto:support@gptimage2api.net"
                  className="hover:underline text-blue-500"
                >
                  support@gptimage2api.net
                </a>{" "}
                with the following information:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>Your account email address</li>
                <li>Transaction ID or payment reference number</li>
                <li>Date and amount of the purchase</li>
                <li>Detailed reason for the refund request</li>
                <li>
                  Any supporting evidence (screenshots, error messages, failed
                  generation IDs, etc.)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                6. Refund Review Process
              </h2>
              <p className="mb-3">
                Once we receive your refund request, we will follow this
                process:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Acknowledgment</strong>: We will acknowledge your
                  refund request within 1 business day
                </li>
                <li>
                  <strong>Response SLA</strong>: We will provide an initial
                  response on your request within 3 business days
                </li>
                <li>
                  <strong>Investigation</strong>: Our team will review your
                  case, including account activity, usage logs, and technical
                  data, and share progress updates by email
                </li>
                <li>
                  <strong>Decision &amp; Processing</strong>: If approved, the
                  refund will be processed within 5-10 business days. The
                  actual timing depends on your payment method and financial
                  institution
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                7. Refund Methods
              </h2>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Original Payment Method</strong>: Refunds are
                  typically processed back to the original payment method (e.g.,
                  credit card, debit card, or other payment method used)
                </li>
                <li>
                  <strong>Account Credit</strong>: In some cases, particularly
                  for technical failures, we may offer account credit
                  (additional credits) instead of a monetary refund. Account
                  credits are issued immediately and may offer a greater value
                </li>
                <li>
                  <strong>Partial Refunds</strong>: For partially consumed
                  purchases, we may issue a prorated refund based on unused
                  portions
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                8. Credit Restoration vs. Monetary Refund
              </h2>
              <p className="mb-3">
                In cases of technical failures during image generation, we
                generally prefer to restore credits to your account rather than
                issue monetary refunds, as this allows you to immediately retry
                the generation. Credit restoration is typically processed within
                24 hours. If you prefer a monetary refund instead, please
                specify this in your request.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                9. Dispute Resolution
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  9.1 Internal Review
                </h3>
                <p className="mb-3">
                  If you disagree with our refund decision, you may request a
                  review by contacting us at{" "}
                  <a
                    href="mailto:support@gptimage2api.net"
                    className="hover:underline text-blue-500"
                  >
                    support@gptimage2api.net
                  </a>
                  . Please provide additional information or documentation that
                  supports your case.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  9.2 Chargebacks
                </h3>
                <p className="mb-3">
                  We strongly encourage you to contact us directly before
                  initiating a chargeback with your payment provider. We are
                  committed to resolving issues fairly and promptly. Please
                  note that filing a chargeback may result in the suspension of
                  your account pending investigation, and may incur additional
                  processing fees.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                10. Special Circumstances
              </h2>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Service Discontinuation</strong>: If we discontinue a
                  service or feature that you have paid for, we will provide a
                  prorated refund for the unused portion
                </li>
                <li>
                  <strong>Legal Requirements</strong>: In jurisdictions where
                  local consumer protection laws provide additional or mandatory
                  refund rights, those laws take precedence over this policy
                </li>
                <li>
                  <strong>Force Majeure</strong>: In case of events beyond our
                  reasonable control (natural disasters, pandemic, etc.), we
                  will work with affected users on a case-by-case basis
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                11. Changes to This Policy
              </h2>
              <p className="mb-3">
                We may update this Refund Policy from time to time to reflect
                changes in our services, legal requirements, or business
                practices. When we make significant changes, we will notify
                users via email or through our website. The updated policy will
                be effective immediately upon posting.
              </p>
              <p className="mb-3">
                We encourage you to review this policy periodically to stay
                informed about our refund terms and conditions.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                12. Contact Us
              </h2>
              <p className="mb-3">
                If you have any questions about this Refund Policy or need to
                request a refund, please contact us:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Support Email</strong>:{" "}
                  <a
                    href="mailto:support@gptimage2api.net"
                    className="hover:underline text-blue-500"
                  >
                    support@gptimage2api.net
                  </a>
                </li>
                <li>
                  <strong>Founder</strong>:{" "}
                  <a
                    href="mailto:support@gptimage2api.net"
                    className="hover:underline text-blue-500"
                  >
                    support@gptimage2api.net
                  </a>{" "}
                  (for escalation)
                </li>
                <li>
                  <strong>Website</strong>:{" "}
                  <a
                    href="https://gptimage2api.net"
                    className="text-primary hover:underline"
                  >
                    https://gptimage2api.net
                  </a>
                </li>
              </ul>
              <p className="mb-3">
                We are committed to providing fair and transparent refund
                services. Please allow us the opportunity to resolve any issues
                before seeking alternative remedies.
              </p>
            </section>
          </div>

          <Separator />

          <div className="mt-8">
            <Link
              href="/"
              className="text-primary hover:underline flex items-center gap-2"
              title="Return to Home"
            >
              <HomeIcon className="size-4" /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
