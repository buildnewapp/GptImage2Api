import "server-only";

import { render } from "@react-email/render";
import { getDb } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import {
  deliverEmail,
  getConfiguredEmailProvider,
  getEmailProviderConfig,
  type EmailDeliveryResult,
  type EmailPayload,
} from "@/lib/email/providers";
import { redactEmailLog } from "@/lib/email/redact";
import { eq } from "drizzle-orm";
import { createElement, type ComponentType } from "react";

interface SendEmailProps<Props extends object> {
  email: string;
  subject: string;
  templateKey: string;
  react: ComponentType<Props>;
  reactProps: Props;
  isAddContacts?: boolean;
  fromName?: string;
  fromEmail?: string;
  hasUnsubscribeLink?: boolean;
  jobId?: string;
  idempotencyKey?: string;
  replyTo?: string;
  attachments?: EmailPayload["attachments"];
}

export type SendEmailResult =
  | { status: "disabled"; logId: null; providerMessageId: null }
  | { status: "sent"; logId: string; providerMessageId: string | null };

export async function sendEmail<Props extends object>(
  input: SendEmailProps<Props>,
): Promise<SendEmailResult> {
  const provider = getConfiguredEmailProvider();
  if (!provider) {
    return { status: "disabled", logId: null, providerMessageId: null };
  }

  const db = getDb();
  const fromEmail =
    input.fromEmail?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    null;
  const fromName =
    input.fromName?.trim() ||
    process.env.EMAIL_FROM_NAME?.trim() ||
    process.env.ADMIN_NAME?.trim() ||
    "Admin";
  const snapshot = redactEmailLog(
    input.templateKey,
    input.reactProps as Record<string, unknown>,
  );
  // Persist before submitting. A failed insert must not lead to an untracked send.
  const [log] = await db
    .insert(emailLogs)
    .values({
      toEmail: input.email.trim(),
      fromEmail,
      fromName,
      subject: snapshot.redactText(input.subject),
      templateKey: input.templateKey,
      variables: snapshot.variables,
      provider,
      jobId: input.jobId,
      idempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing({ target: emailLogs.idempotencyKey })
    .returning({ id: emailLogs.id });

  if (!log) {
    const [existing] = await db
      .select({
        id: emailLogs.id,
        status: emailLogs.status,
        providerMessageId: emailLogs.providerMessageId,
      })
      .from(emailLogs)
      .where(eq(emailLogs.idempotencyKey, input.idempotencyKey!))
      .limit(1);
    if (existing?.status === "sent")
      return {
        status: "sent",
        logId: existing.id,
        providerMessageId: existing.providerMessageId,
      };
    throw new Error(
      `This email has already been attempted (${existing?.status ?? "unknown"}); check the email record before resending.`,
    );
  }

  let result: EmailDeliveryResult;
  try {
    const config = getEmailProviderConfig();
    if (!input.email.trim() || !fromEmail)
      throw new Error(
        "Recipient or sender email is not configured. Set EMAIL_FROM or ADMIN_EMAIL.",
      );
    if (/[\r\n]/.test(fromEmail + fromName + input.email + (input.replyTo ?? "")))
      throw new Error("Invalid email address or sender name.");
    const element = createElement(input.react, input.reactProps);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const headers: Record<string, string> = {};
    if (input.hasUnsubscribeLink && process.env.NEXT_PUBLIC_SITE_URL) {
      const token = Buffer.from(input.email).toString("base64");
      headers["List-Unsubscribe"] =
        `<${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/newsletter?token=${encodeURIComponent(token)}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
    result = await deliverEmail(config, {
      to: input.email.trim(),
      fromEmail,
      fromName,
      subject: input.subject,
      html,
      text,
      headers,
      idempotencyKey: input.idempotencyKey,
      replyTo: input.replyTo,
      attachments: input.attachments,
    });
  } catch (error) {
    result = {
      status: "failed",
      providerMessageId: null,
      deliveryStatus: null,
      errorMessage:
        error instanceof Error ? error.message : "Failed to prepare email.",
    };
  }
  const errorMessage = result.errorMessage
    ? snapshot.redactText(result.errorMessage).slice(0, 2000)
    : null;
  try {
    await db
      .update(emailLogs)
      .set({
        ...result,
        errorMessage,
        updatedAt: new Date(),
        sentAt: result.status === "sent" ? new Date() : null,
      })
      .where(eq(emailLogs.id, log.id));
  } catch {
    // The provider may have accepted the message. Never submit it a second time.
    console.error(
      `Failed to persist email result: logId=${log.id}, status=${result.status}`,
    );
  }
  if (result.status !== "sent")
    throw new Error(
      `Email ${result.status}: ${errorMessage} (record ${log.id})`,
    );

  if (input.isAddContacts && provider === "resend") {
    try {
      const { default: resend } = await import("@/lib/resend");
      const response = await resend?.contacts.create({ email: input.email });
      if (response?.error)
        console.error(
          `Failed to sync Resend contact for email record ${log.id}`,
        );
    } catch {
      console.error(`Failed to sync Resend contact for email record ${log.id}`);
    }
  }
  return {
    status: "sent",
    logId: log.id,
    providerMessageId: result.providerMessageId,
  };
}
