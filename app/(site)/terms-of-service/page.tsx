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
    title: "Terms of Service",
    description: `Terms and conditions for using ${siteConfig.name} AI video generation platform and API services.`,
    path: `/terms-of-service`,
    locale: "en",
    availableLocales: ["en"],
  });
}

export default function TermsOfServicePage() {
  return (
    <div className="bg-secondary/20 py-8 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-background rounded-xl border p-6 shadow-xs sm:p-8 dark:border-zinc-800">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Last Updated: February 15, 2026
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold">
                1. Acceptance of Terms
              </h2>
              <p className="mb-3">
                Welcome to {siteConfig.name} (&quot;we&quot;, &quot;us&quot;,
                &quot;our&quot;, or &quot;{siteConfig.name}&quot;), an AI video
                generation platform accessible at{" "}
                <a
                  href="https://sdanceai.com"
                  className="text-primary hover:underline"
                >
                  https://sdanceai.com
                </a>
                . These Terms of Service (&quot;Terms&quot;) govern your access
                to and use of our website, AI video generation services, API
                services, and all related products and features (collectively,
                the &quot;Services&quot;).
              </p>
              <p className="mb-3">
                By creating an account, accessing, or using our Services, you
                agree to be bound by these Terms. If you do not agree to these
                Terms, you must not use our Services. If you are using our
                Services on behalf of an organization, you represent and warrant
                that you have the authority to bind that organization to these
                Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                2. Description of Services
              </h2>
              <p className="mb-3">
                {siteConfig.name} provides the following services:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>AI Video Generation</strong>: An independent wrapper
                  platform that provides a custom interface for third-party AI
                  models (such as Seedance, Veo, and Sora) to create
                  high-quality videos from user inputs
                </li>
                <li>
                  <strong>Online Experience Platform</strong>: A web-based
                  interface for generating, previewing, managing, and downloading
                  AI-generated videos
                </li>
                <li>
                  <strong>API Services</strong>: Stable API access for
                  developers to integrate AI video generation capabilities into
                  their own applications and workflows
                </li>
                <li>
                  <strong>Credit System</strong>: A credit-based or
                  subscription-based system for accessing video generation
                  resources
                </li>
              </ul>
              <p className="mb-3">
                {siteConfig.name} is an independent service and is not
                affiliated with, endorsed by, or sponsored by third-party model
                providers. Model names are used only to describe compatibility.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                3. Account Registration and Security
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  3.1 Account Creation
                </h3>
                <p className="mb-3">
                  To access certain features of our Services, you must create an
                  account. You agree to provide accurate, complete, and current
                  information during registration and to keep your account
                  information up to date. You must be at least 13 years of age
                  (or the applicable minimum age in your jurisdiction) to create
                  an account.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  3.2 Account Security
                </h3>
                <p className="mb-3">
                  You are responsible for maintaining the confidentiality of your
                  account credentials, including your password and API keys. You
                  are solely responsible for all activities that occur under your
                  account. If you suspect any unauthorized use of your account or
                  API keys, you must notify us immediately at{" "}
                  <a
                    href="mailto:support@sdanceai.com"
                    className="hover:underline text-blue-500"
                  >
                    support@sdanceai.com
                  </a>
                  .
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  3.3 API Key Management
                </h3>
                <p className="mb-3">
                  If you use our API services, you are responsible for securely
                  storing your API keys. Do not share your API keys with
                  unauthorized parties, embed them in client-side code, or
                  expose them in public repositories. We may revoke compromised
                  API keys without prior notice.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                4. Acceptable Use Policy
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  4.1 Permitted Use
                </h3>
                <p className="mb-3">
                  You may use our Services for lawful purposes in accordance
                  with these Terms. This includes creating AI-generated videos
                  for personal projects, social media content, commercial
                  marketing, artistic creation, educational materials, and other
                  legitimate applications.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  4.2 Prohibited Use
                </h3>
                <p className="mb-3">
                  You agree NOT to use our Services to:
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    Generate content that is illegal, harmful, threatening,
                    abusive, harassing, defamatory, or otherwise objectionable
                  </li>
                  <li>
                    Create deepfake content intended to deceive, defraud, or
                    harm individuals, or to spread disinformation
                  </li>
                  <li>
                    Generate content depicting child sexual abuse material
                    (CSAM) or any content that exploits minors
                  </li>
                  <li>
                    Produce non-consensual intimate imagery of real individuals
                  </li>
                  <li>
                    Create content that infringes on the intellectual property
                    rights, privacy rights, or publicity rights of any third
                    party
                  </li>
                  <li>
                    Impersonate any person or entity without their explicit
                    consent
                  </li>
                  <li>
                    Attempt to reverse-engineer, decompile, extract, or
                    otherwise access the source code or underlying models of
                    our Services
                  </li>
                  <li>
                    Circumvent usage limits, rate limits, or any technical
                    restrictions of our Services
                  </li>
                  <li>
                    Use automated means (bots, scrapers, etc.) to access our
                    Services beyond the provided API
                  </li>
                  <li>
                    Distribute malware, viruses, or any other harmful code
                    through our platform
                  </li>
                  <li>
                    Resell, redistribute, or sublicense access to our Services
                    without written authorization
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  4.3 Content Moderation
                </h3>
                <p className="mb-3">
                  We reserve the right to review, moderate, and remove any
                  content that violates these Terms or our content policies. We
                  may use automated tools and human reviewers to detect
                  prohibited content. Repeated violations may result in account
                  suspension or termination.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                5. Intellectual Property
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  5.1 Our Intellectual Property
                </h3>
                <p className="mb-3">
                  All content on {siteConfig.name}, including but not limited to
                  the platform interface, designs, code, text, graphics, logos,
                  images, AI models, algorithms, and software, is owned by us
                  or our licensors and is protected by copyright, trademark, and
                  other intellectual property laws. You may not copy, modify,
                  distribute, or create derivative works from our platform
                  without our prior written consent.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  5.2 Your Input Content
                </h3>
                <p className="mb-3">
                  You retain ownership of the original content you upload to our
                  platform (e.g., images, photos, text prompts). You represent
                  and warrant that you have all necessary rights and permissions
                  to upload and use such content. You grant us a limited,
                  non-exclusive, worldwide license to process your input content
                  solely for the purpose of providing the Services to you.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  5.3 Generated Content
                </h3>
                <p className="mb-3">
                  Subject to your compliance with these Terms and applicable
                  laws, you are granted rights to use the AI-generated videos
                  produced through our Services, including for commercial
                  purposes. However, please note:
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    AI-generated content may not be eligible for copyright
                    protection in all jurisdictions
                  </li>
                  <li>
                    You are solely responsible for ensuring that your use of
                    generated content complies with applicable laws
                  </li>
                  <li>
                    We do not guarantee the uniqueness of generated content;
                    similar inputs from different users may produce similar
                    outputs
                  </li>
                  <li>
                    You should not claim that AI-generated content was created
                    by a human when disclosure of AI involvement is required by
                    law or platform policies
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">5.4 Feedback</h3>
                <p className="mb-3">
                  Any feedback, suggestions, or ideas you provide about our
                  Services may be used by us without obligation or compensation
                  to you, for the purpose of improving our products and services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                6. Payment Terms
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  6.1 Pricing and Plans
                </h3>
                <p className="mb-3">
                  We offer various service plans, including free tiers,
                  credit-based purchases, and subscription plans. Pricing
                  details are available on our website. We reserve the right to
                  modify pricing at any time, with advance notice to existing
                  subscribers.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  6.2 Credits and Usage
                </h3>
                <p className="mb-3">
                  Video generation consumes credits based on factors such as
                  video duration, resolution, and model complexity. Credit
                  consumption rates are displayed before generation begins.
                  Credits may have an expiration date depending on the plan.
                  Unused credits are generally non-transferable.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  6.3 Payment Processing
                </h3>
                <p className="mb-3">
                  Payments are processed through secure third-party payment
                  processors (such as Creem). By making a purchase, you agree
                  to provide accurate payment information and authorize us to
                  charge your payment method. All prices are displayed in the
                  applicable currency and may be subject to taxes.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  6.4 Subscription Auto-Renewal
                </h3>
                <p className="mb-3">
                  Subscription plans automatically renew at the end of each
                  billing cycle unless you cancel before the renewal date.
                  Cancellation takes effect at the end of the current billing
                  period. To cancel, go to{" "}
                  <Link
                    href="/dashboard/subscription"
                    className="text-primary hover:underline"
                  >
                    Dashboard &gt; Subscription
                  </Link>{" "}
                  and open the billing portal to manage or cancel your plan.
                  If you need help, contact{" "}
                  <a
                    href="mailto:support@sdanceai.com"
                    className="hover:underline text-blue-500"
                  >
                    support@sdanceai.com
                  </a>
                  .
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  6.5 Refunds
                </h3>
                <p className="mb-3">
                  Our refund policy is outlined in our{" "}
                  <Link
                    href="/refund-policy"
                    className="text-primary hover:underline"
                  >
                    Refund Policy
                  </Link>
                  . Please review it for details on refund eligibility and
                  processes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                7. API Terms
              </h2>
              <p className="mb-3">
                If you use our API services, the following additional terms
                apply:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Rate Limits</strong>: API usage is subject to rate
                  limits based on your plan. Exceeding rate limits may result
                  in request throttling or temporary access suspension
                </li>
                <li>
                  <strong>SLA</strong>: We strive to maintain high availability
                  but do not guarantee 100% uptime. Service level details are
                  available in our API documentation
                </li>
                <li>
                  <strong>Versioning</strong>: We may update API versions over
                  time. Deprecated API versions will be supported for a
                  reasonable transition period with advance notice
                </li>
                <li>
                  <strong>Usage Monitoring</strong>: We monitor API usage to
                  ensure compliance with these Terms, prevent abuse, and
                  maintain service quality
                </li>
                <li>
                  <strong>Data Handling</strong>: You must comply with all
                  applicable data protection laws when processing data obtained
                  through our API
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                8. Service Availability and Modifications
              </h2>
              <p className="mb-3">
                We reserve the right to modify, suspend, or discontinue any
                part of our Services at any time, with or without prior notice.
                We may perform scheduled maintenance, during which certain
                features may be temporarily unavailable. We are not liable for
                any modification, suspension, or discontinuation of the
                Services.
              </p>
              <p className="mb-3">
                We may also impose usage limitations on certain features,
                especially for free-tier users or during trial periods.
                Exceeding these limitations may require upgrading to a paid
                plan.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                9. Disclaimers
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  9.1 Services Provided &quot;As Is&quot;
                </h3>
                <p className="mb-3">
                  Our Services are provided &quot;as is&quot; and &quot;as
                  available&quot; without warranties of any kind, either express
                  or implied. We do not guarantee that the Services will be
                  error-free, secure, or uninterrupted, or that generated
                  content will meet your specific quality expectations.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  9.2 AI Output Disclaimer
                </h3>
                <p className="mb-3">
                  AI-generated content may contain imperfections, artifacts, or
                  unexpected results. We do not guarantee the accuracy,
                  completeness, or suitability of any AI-generated content for
                  your specific purposes. You are solely responsible for
                  reviewing and validating generated content before use.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  9.3 Third-Party Services
                </h3>
                <p className="mb-3">
                  Our Services may contain links to or integrate with
                  third-party websites or services. We are not responsible for
                  any third-party content, products, or services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                10. Limitation of Liability
              </h2>
              <p className="mb-3">
                To the maximum extent permitted by applicable law,{" "}
                {siteConfig.name}, its founders, employees, partners, and
                service providers shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages,
                including but not limited to loss of profits, revenue, data,
                business opportunities, or goodwill, whether based on warranty,
                contract, tort, or any other legal theory.
              </p>
              <p className="mb-3">
                Our total aggregate liability for any claims arising from or
                related to these Terms or our Services shall not exceed the
                amount you paid to us in the twelve (12) months preceding the
                event giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                11. Indemnification
              </h2>
              <p className="mb-3">
                You agree to indemnify, defend, and hold harmless{" "}
                {siteConfig.name} and its officers, directors, employees, and
                agents from and against any claims, liabilities, damages,
                losses, and expenses (including reasonable attorney&apos;s fees)
                arising out of or in connection with: (a) your use of the
                Services; (b) your violation of these Terms; (c) your violation
                of any rights of a third party; or (d) your uploaded or
                generated content.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                12. Termination
              </h2>
              <p className="mb-3">
                We may suspend or terminate your account and access to our
                Services at any time, with or without cause, including for
                violations of these Terms. Upon termination:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  Your right to access and use the Services will immediately
                  cease
                </li>
                <li>
                  Any unused credits or remaining subscription time may be
                  forfeited unless otherwise required by law
                </li>
                <li>
                  You should download any content you wish to retain before
                  your account is terminated
                </li>
                <li>
                  We may delete your account data, uploaded content, and
                  generated content after a reasonable retention period
                </li>
              </ul>
              <p className="mb-3">
                You may also terminate your account at any time by contacting
                us at{" "}
                <a
                  href="mailto:support@sdanceai.com"
                  className="hover:underline text-blue-500"
                >
                  support@sdanceai.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                13. Governing Law and Dispute Resolution
              </h2>
              <p className="mb-3">
                These Terms are governed by applicable laws. Any dispute arising
                from or related to these Terms or our Services shall be resolved
                through good-faith negotiation first. If negotiation fails,
                disputes may be submitted to binding arbitration or the courts
                of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                14. General Provisions
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  14.1 Entire Agreement
                </h3>
                <p className="mb-3">
                  These Terms, together with our{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/refund-policy"
                    className="text-primary hover:underline"
                  >
                    Refund Policy
                  </Link>
                  , constitute the entire agreement between you and{" "}
                  {siteConfig.name} regarding the use of our Services.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  14.2 Modification of Terms
                </h3>
                <p className="mb-3">
                  We may modify these Terms from time to time. Material changes
                  will be communicated via email or through our platform.
                  Continued use of the Services after changes take effect
                  constitutes your acceptance of the modified Terms.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  14.3 Severability
                </h3>
                <p className="mb-3">
                  If any provision of these Terms is found to be unenforceable,
                  the remaining provisions will continue in full force and
                  effect.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  14.4 Waiver
                </h3>
                <p className="mb-3">
                  Our failure to enforce any right or provision of these Terms
                  shall not constitute a waiver of such right or provision.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                15. Contact Information
              </h2>
              <p className="mb-3">
                If you have any questions or comments about these Terms, please
                contact us:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>General Support</strong>:{" "}
                  <a
                    href="mailto:support@sdanceai.com"
                    className="hover:underline text-blue-500"
                  >
                    support@sdanceai.com
                  </a>
                </li>
                <li>
                  <strong>Website</strong>:{" "}
                  <a
                    href="https://sdanceai.com"
                    className="text-primary hover:underline"
                  >
                    https://sdanceai.com
                  </a>
                </li>
              </ul>
              <p className="mb-3">Thank you for using {siteConfig.name}!</p>
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
