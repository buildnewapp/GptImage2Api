import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { constructMetadata } from "@/lib/metadata";
import { HomeIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import CookieManagementSection from "./CookieManagementSection";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    title: "Privacy Policy",
    description: `How ${siteConfig.name} collects, uses, and protects your information when using our AI video generation services.`,
    path: `/privacy-policy`,
    locale: "en",
    availableLocales: ["en"],
  });
}

export default function PrivacyPolicyPage() {
  const COOKIE_CONSENT_ENABLED =
    process.env.NEXT_PUBLIC_COOKIE_CONSENT_ENABLED === "true";

  return (
    <div className="bg-secondary/20 py-8 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-background rounded-xl border p-6 shadow-xs sm:p-8 dark:border-zinc-800">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Last Updated: February 15, 2026
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold">Introduction</h2>
              <p className="mb-3">
                Welcome to {siteConfig.name} (&quot;we&quot;, &quot;us&quot;,
                &quot;our&quot;, or &quot;{siteConfig.name}&quot;), accessible at{" "}
                <a
                  href="https://sdanceai.com"
                  className="text-primary hover:underline"
                >
                  https://sdanceai.com
                </a>
                . We are committed to protecting your privacy and personal
                information. This Privacy Policy explains how we collect, use,
                store, share, and protect information when you use our AI video
                generation platform, including our custom interface and API
                services built on top of third-party AI models (such as
                Seedance 1.5, Veo, and Sora).
              </p>
              <p className="mb-3">
                {siteConfig.name} is an independent product and is not
                affiliated with, endorsed by, or sponsored by model providers.
                Model names are referenced only to describe compatibility.
              </p>
              <p className="mb-3">
                By accessing or using our services, you acknowledge that you
                have read, understood, and agree to the practices described in
                this Privacy Policy. If you do not agree with this policy,
                please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Information We Collect
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  1. Information You Provide Directly
                </h3>
                <p className="mb-3">
                  When you use our AI video generation services, we may collect
                  the following types of information:
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    <strong>Account Information</strong>: Your name, email
                    address, avatar, and other information you provide when
                    registering or updating your account
                  </li>
                  <li>
                    <strong>Payment Information</strong>: If you purchase credits
                    or subscription plans, we collect necessary payment details
                    through secure third-party payment processors (such as
                    Creem). We never store your full credit card number
                  </li>
                  <li>
                    <strong>User-Uploaded Content</strong>: Images, photos, text
                    prompts, and other input materials you upload for AI video
                    generation
                  </li>
                  <li>
                    <strong>Generated Content</strong>: AI-generated videos,
                    audio, and other output content created through our platform
                  </li>
                  <li>
                    <strong>API Usage Data</strong>: If you use our API services,
                    we collect API keys, request parameters, usage logs, and
                    integration details
                  </li>
                  <li>
                    <strong>Communication Data</strong>: Information you provide
                    when contacting our support team, submitting feedback, or
                    communicating with us via email
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  2. Information Collected Automatically
                </h3>
                <p className="mb-3">
                  When you visit or use our services, we may automatically
                  collect the following information:
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-6">
                  <li>
                    <strong>Device Information</strong>: Including your IP
                    address, browser type, operating system, device model, and
                    unique device identifiers
                  </li>
                  <li>
                    <strong>Usage Data</strong>: Information about how you
                    interact with our services, including access times, features
                    used, pages viewed, video generation history, and session
                    duration
                  </li>
                  <li>
                    <strong>Log Data</strong>: Server logs that record your
                    requests, including API call logs, error reports, and
                    performance metrics
                  </li>
                  <li>
                    <strong>Cookies and Similar Technologies</strong>: We use
                    cookies, web beacons, and similar technologies to collect
                    information and enhance your user experience
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                How We Use Your Information
              </h2>
              <p className="mb-3">
                We use the collected information for the following purposes:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Providing AI Video Generation Services</strong>:
                  Processing your input content (images, text prompts) through
                  integrated third-party AI models via our wrapper interface to
                  generate videos with native audio sync
                </li>
                <li>
                  <strong>Account Management</strong>: Creating and managing your
                  account, processing transactions, tracking credit usage, and
                  providing customer support
                </li>
                <li>
                  <strong>API Service Delivery</strong>: Authenticating API
                  requests, tracking usage quotas, monitoring service health, and
                  providing developer support
                </li>
                <li>
                  <strong>Service Improvement</strong>: Analyzing usage patterns,
                  optimizing AI model performance, improving video quality, and
                  developing new features
                  {COOKIE_CONSENT_ENABLED &&
                    " (only with your consent for analytics cookies)"}
                </li>
                <li>
                  <strong>Communication</strong>: Sending service notifications,
                  account updates, security alerts, API status updates, and
                  relevant product announcements
                </li>
                <li>
                  <strong>Safety and Security</strong>: Detecting and preventing
                  abuse, fraud, content policy violations, and unauthorized
                  access to our services
                </li>
                <li>
                  <strong>Legal Compliance</strong>: Complying with applicable
                  laws, regulations, and legal processes
                </li>
              </ul>
              {COOKIE_CONSENT_ENABLED && (
                <p className="mb-3 text-sm text-muted-foreground">
                  <strong>Note:</strong> When cookie consent is enabled, certain
                  data processing activities (such as analytics and advertising)
                  only occur with your explicit consent. You can manage these
                  preferences in the Cookie Preferences section below.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                User-Uploaded Content and AI-Generated Content
              </h2>
              <p className="mb-3">
                Our core service involves processing user-uploaded images and
                text prompts to generate AI videos. Regarding this content:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Processing</strong>: Your uploaded content is processed
                  by integrated third-party AI models via our platform solely
                  for the purpose of generating the requested video output
                </li>
                <li>
                  <strong>Storage</strong>: Generated videos and associated input
                  content are stored on our servers for a reasonable period to
                  allow you to access and download them. Content may be
                  automatically deleted after a specified retention period
                </li>
                <li>
                  <strong>No Training Without Consent</strong>: We do not use
                  your uploaded personal content or generated videos to train our
                  services or underlying AI models without your explicit consent
                </li>
                <li>
                  <strong>Content Moderation</strong>: We may review content to
                  ensure compliance with our content policies and applicable laws,
                  including preventing the generation of harmful, illegal, or
                  abusive content
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Information Sharing
              </h2>
              <p className="mb-3">
                We do not sell your personal information. We may share your
                information only in the following limited circumstances:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Service Providers</strong>: With trusted third-party
                  service providers who help us operate our platform, including
                  payment processing (Creem), cloud infrastructure and
                  content delivery networks (Cloudflare), and email services
                </li>
                <li>
                  <strong>AI Model Providers</strong>: Input data may be
                  transmitted to AI model infrastructure for video generation
                  processing, subject to strict data processing agreements
                </li>
                <li>
                  <strong>Legal Requirements</strong>: When we believe in good
                  faith that disclosure is required by law, regulation, legal
                  process, or governmental request
                </li>
                <li>
                  <strong>Safety and Rights Protection</strong>: To protect the
                  rights, property, or safety of {siteConfig.name}, our users,
                  or the public
                </li>
                <li>
                  <strong>Business Transfers</strong>: In connection with a
                  merger, acquisition, or sale of assets, your information may
                  be transferred as part of the transaction
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Data Storage and Security
              </h2>
              <p className="mb-3">
                We implement industry-standard technical and organizational
                measures to protect your personal information and content:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  All data transmission is encrypted using SSL/TLS protocols
                </li>
                <li>
                  All payment information is processed through secure
                  payment processors (Creem); we never store complete payment
                  card details
                </li>
                <li>
                  User-uploaded content and generated videos are stored with
                  access controls and encryption at rest
                </li>
                <li>
                  API keys are securely hashed and stored; we recommend rotating
                  your API keys regularly
                </li>
                <li>
                  We conduct regular security reviews and vulnerability
                  assessments of our systems
                </li>
                <li>
                  Access to personal data is restricted to authorized personnel
                  on a need-to-know basis
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">Data Retention</h2>
              <p className="mb-3">
                We retain your information for as long as necessary to provide
                our services and fulfill the purposes outlined in this policy:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Account Data</strong>: Retained for the duration of
                  your account and for a reasonable period after account deletion
                  for legal and business purposes
                </li>
                <li>
                  <strong>Generated Videos</strong>: Stored for a limited period
                  (typically 30 days) after generation, unless you choose to save
                  them to your account
                </li>
                <li>
                  <strong>API Logs</strong>: Retained for up to 90 days for
                  debugging and service improvement purposes
                </li>
                <li>
                  <strong>Payment Records</strong>: Retained as required by
                  applicable tax and financial regulations
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Your Rights and Choices
              </h2>
              <p className="mb-3">
                Depending on applicable laws in your region, you may have the
                following rights:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Access</strong>: Request a copy of the personal
                  information we hold about you
                </li>
                <li>
                  <strong>Correction</strong>: Update or correct inaccurate
                  personal information
                </li>
                <li>
                  <strong>Deletion</strong>: Request deletion of your personal
                  information and generated content
                </li>
                <li>
                  <strong>Data Portability</strong>: Obtain an electronic copy
                  of your data in a structured, commonly used format
                </li>
                <li>
                  <strong>Objection</strong>: Object to our processing of your
                  personal information for certain purposes
                </li>
                <li>
                  <strong>Restriction</strong>: Request that we limit the
                  processing of your personal information
                </li>
                <li>
                  <strong>Withdraw Consent</strong>: Where processing is based
                  on consent, you may withdraw your consent at any time
                </li>
              </ul>
              <p className="mb-3">
                To exercise any of these rights, please contact us at{" "}
                <a
                  href="mailto:support@sdanceai.com"
                  className="hover:underline text-blue-500"
                >
                  support@sdanceai.com
                </a>
                . We will respond to your request within 30 days.
              </p>
            </section>

            <CookieManagementSection />

            <section>
              <h2 className="mb-3 text-xl font-semibold">Cookie Policy</h2>
              <p className="mb-3">
                We use cookies and similar technologies to collect information
                and improve your experience. Cookies are small text files placed
                on your device that help us provide a better user experience.
              </p>

              {COOKIE_CONSENT_ENABLED ? (
                <>
                  <p className="mb-3">
                    <strong>Cookie Consent Management:</strong> We have
                    implemented a cookie consent system that allows you to
                    control which cookies are used on our website. You can
                    manage your preferences using the Cookie Preferences section
                    above.
                  </p>

                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-medium">
                      Essential Cookies
                    </h3>
                    <p className="mb-3">
                      These cookies are necessary for the website to function
                      and cannot be disabled:
                    </p>
                    <ul className="mb-3 list-disc space-y-1 pl-6">
                      <li>
                        <strong>cookieConsent</strong>: Stores your cookie
                        consent preferences (expires after 1 year)
                      </li>
                      <li>
                        <strong>Authentication Cookies</strong>: Required for
                        user login and session management
                      </li>
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-medium">
                      Optional Cookies (Require Consent)
                    </h3>
                    <p className="mb-3">
                      These cookies are only used if you have given your
                      consent:
                    </p>
                    <ul className="mb-3 list-disc space-y-1 pl-6">
                      <li>
                        <strong>Analytics Cookies</strong>: Help us understand
                        how visitors use our website and services
                      </li>
                      <li>
                        <strong>Performance Cookies</strong>: Help us analyze
                        and improve website performance
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3">The types of cookies we use include:</p>
                  <ul className="mb-3 list-disc space-y-1 pl-6">
                    <li>
                      <strong>Necessary Cookies</strong>: Essential for the
                      basic functionality of the website, including
                      authentication and session management
                    </li>
                    <li>
                      <strong>Analytics Cookies</strong>: Help us understand how
                      visitors interact with our website and services
                    </li>
                    <li>
                      <strong>Performance Cookies</strong>: Help us analyze and
                      improve website and video generation performance
                    </li>
                  </ul>
                </>
              )}

              <p className="mb-3">
                You can control or delete cookies by changing your browser
                settings. Please note that disabling certain cookies may affect
                your experience on our website.
                {COOKIE_CONSENT_ENABLED &&
                  " Additionally, you can use the Cookie Preferences section above to manage your consent for optional cookies."}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Children&apos;s Privacy
              </h2>
              <p className="mb-3">
                Our services are not directed to children under 13 years of age
                (or other applicable age threshold in your jurisdiction). We do
                not knowingly collect personal information from children. If you
                believe that we may have collected personal information from a
                child, please contact us at{" "}
                <a
                  href="mailto:support@sdanceai.com"
                  className="hover:underline text-blue-500"
                >
                  support@sdanceai.com
                </a>
                , and we will promptly take steps to delete that information.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                International Data Transfers
              </h2>
              <p className="mb-3">
                {siteConfig.name} operates globally, and your information may be
                processed and stored in countries outside your country of
                residence. When we transfer data internationally, we implement
                appropriate safeguards, such as standard contractual clauses or
                other legally approved mechanisms, to ensure your personal
                information receives adequate protection in accordance with
                applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Third-Party Services
              </h2>
              <p className="mb-3">
                Our platform may integrate with or link to third-party services.
                These third-party services have their own privacy policies, and
                we encourage you to review them. We are not responsible for the
                privacy practices of third-party services. Key third-party
                services we use include:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Creem</strong>: For payment processing (
                  <a
                    href="https://www.creem.io/privacy"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Creem Privacy Policy
                  </a>
                  )
                </li>
                <li>
                  <strong>Cloudflare</strong>: For cloud infrastructure,
                  content delivery network (CDN), and data storage (
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cloudflare Privacy Policy
                  </a>
                  )
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                Updates to This Privacy Policy
              </h2>
              <p className="mb-3">
                We may update this Privacy Policy from time to time to reflect
                changes in our services, legal requirements, or business
                practices. When we make significant changes, we will post the
                revised policy on our website and update the &quot;Last
                Updated&quot; date at the top. For material changes, we may also
                notify you via email or through a notice on our platform.
              </p>
              <p className="mb-3">
                We encourage you to review this policy periodically to stay
                informed about how we protect your information.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">Contact Us</h2>
              <p className="mb-3">
                If you have any questions, comments, or requests regarding this
                Privacy Policy or our privacy practices, please contact us:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  <strong>Email</strong>:{" "}
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
              <p className="mb-3">
                We will respond to your inquiries within 30 days.
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
