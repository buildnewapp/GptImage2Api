import * as React from "react";
import type { RecallStep } from "@/lib/email/recall/rules";

export interface FounderRecallEmailProps {
  step: RecallStep;
  name: string | null;
  founderName: string;
  founderEmail: string;
  productName: string;
  productDescription: string;
  siteUrl: string;
  pricingUrl: string;
  planName?: string;
  couponCode?: string;
  couponDescription?: string;
  couponUrl?: string;
  hasAttachment: boolean;
}

export function getRecallSubject(step: RecallStep, productName: string) {
  switch (step) {
    case "checkout-help":
      return `Any trouble checking out with ${productName}?`;
    case "checkout-coupon":
      return `A little help getting started with ${productName}`;
    case "paid-help":
      return `Thank you for supporting ${productName}`;
    case "signup-help":
      return `What would you like to do with ${productName}?`;
    case "signup-coupon":
      return `A first-purchase offer for ${productName}`;
  }
}

export function FounderRecallEmail(props: Readonly<FounderRecallEmailProps>) {
  const { step, productName, founderName } = props;
  const coupon = step === "signup-coupon" || step === "checkout-coupon";
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fff", color: "#292524" }}>
        <div
          style={{
            maxWidth: 600,
            padding: "28px 24px",
            fontFamily: "Arial, sans-serif",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          <p>Hi{props.name ? ` ${props.name}` : " there"},</p>
          <p>
            I'm {founderName}, the founder of {productName}.
          </p>
          {step === "checkout-help" && (
            <>
              <p>
                You recently started checking out
                {props.planName ? ` for ${props.planName}` : ""}, but the
                payment hasn't been completed yet.
              </p>
              <p>
                Did you run into a payment issue, or is there something about
                the plan you'd like to understand before deciding? Just reply
                and I'll help you work through it.
              </p>
              <p>
                <a href={props.pricingUrl}>Return to plans and checkout</a>
              </p>
            </>
          )}
          {step === "paid-help" && (
            <>
              <p>
                Thank you for your purchase and for supporting {productName}. It
                means a lot.
              </p>
              <p>
                How has your experience been so far? If anything is confusing or
                isn't working as you expected, reply and tell me what you're
                trying to do. I'll help you get started.
              </p>
              <p>
                <a href={props.siteUrl}>Open {productName}</a>
              </p>
            </>
          )}
          {step === "signup-help" && (
            <>
              <p>
                Welcome to {productName}. What brought you here, and what would
                you like to accomplish?
              </p>
              <p>{props.productDescription}</p>
              <p>
                If you're unsure where to start, just reply with your goal or
                the part you're stuck on. I'd be happy to help.
              </p>
              <p>
                <a href={props.siteUrl}>Explore {productName}</a>
              </p>
            </>
          )}
          {coupon && (
            <>
              <p>
                {step === "checkout-coupon"
                  ? "If you're still considering your purchase, I've put together an offer that might help."
                  : "If you're still deciding whether to make your first purchase, here's an offer to help you get started."}
              </p>
              <p>
                {props.couponDescription}
                <br />
                Code: <strong>{props.couponCode}</strong>
              </p>
              <p>{props.productDescription}</p>
              <p>
                <a href={props.couponUrl || props.pricingUrl}>
                  View the offer and plans
                </a>
              </p>
              <p>
                Is price, the product, or getting started holding you back? I'd
                appreciate hearing your thoughts. You can reply directly to me.
              </p>
            </>
          )}
          {props.hasAttachment && (
            <p>
              I've attached a short product guide that you may find helpful.
            </p>
          )}
          <p>
            {founderName}
            <br />
            Founder, {productName}
            <br />
            <a href={`mailto:${props.founderEmail}`}>{props.founderEmail}</a>
          </p>
        </div>
      </body>
    </html>
  );
}
