export type EmailProvider = "resend" | "cloudflare";
export type EmailDeliveryResult = {
  status: "sent" | "failed" | "unknown";
  providerMessageId: string | null;
  deliveryStatus: "delivered" | "queued" | "bounced" | "suppressed" | null;
  errorMessage: string | null;
};

export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey: string;
  accountId?: string;
}

export function getConfiguredEmailProvider(
  env: Record<string, string | undefined> = process.env,
): EmailProvider | null {
  const provider = env.EMAIL_PROVIDER?.trim();
  if (!provider) return null;
  if (provider === "resend" || provider === "cloudflare") return provider;
  throw new Error("EMAIL_PROVIDER must be resend or cloudflare.");
}

export function getEmailProviderConfig(
  env: Record<string, string | undefined> = process.env,
): EmailProviderConfig {
  const provider = getConfiguredEmailProvider(env);
  if (!provider) throw new Error("EMAIL_PROVIDER is not configured.");
  if (provider === "resend") {
    const apiKey = env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    return { provider, apiKey };
  }
  if (provider === "cloudflare") {
    const apiKey = env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
    const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (!apiKey || !accountId) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are required.",
      );
    }
    if (!/^[a-f0-9]{32}$/i.test(accountId))
      throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID.");
    return { provider, apiKey, accountId };
  }
  throw new Error("EMAIL_PROVIDER must be resend or cloudflare.");
}

export interface EmailPayload {
  to: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}

/** One request only: an ambiguous response must never cause an automatic resend. */
export async function deliverEmail(
  config: EmailProviderConfig,
  email: EmailPayload,
  request: typeof fetch = fetch,
): Promise<EmailDeliveryResult> {
  const base: EmailDeliveryResult = {
    status: "unknown",
    providerMessageId: null,
    deliveryStatus: null,
    errorMessage: null,
  };
  const isResend = config.provider === "resend";
  const endpoint = isResend
    ? "https://api.resend.com/emails"
    : `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`;
  const body = {
    from: isResend
      ? `${email.fromName} <${email.fromEmail}>`
      : { address: email.fromEmail, name: email.fromName },
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.headers && { headers: email.headers }),
    ...(email.replyTo && { reply_to: email.replyTo }),
    ...(email.attachments?.length && {
      attachments: email.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        ...(isResend
          ? { content_type: attachment.contentType }
          : { type: attachment.contentType, disposition: "attachment" }),
      })),
    }),
  };
  try {
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(isResend && email.idempotencyKey
          ? { "Idempotency-Key": email.idempotencyKey }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json().catch(() => null);
    if (
      !response.ok ||
      (isResend ? data?.error || data?.name : data?.success === false)
    ) {
      const message = isResend
        ? data?.message || data?.error?.message
        : data?.errors
            ?.map(
              (error: { code?: number; message?: string }) =>
                `${error.code ?? ""}: ${error.message ?? ""}`,
            )
            .join("; ");
      return {
        ...base,
        status:
          response.status >= 500 || response.status === 408
            ? "unknown"
            : "failed",
        errorMessage:
          typeof message === "string" && message
            ? message
            : `Email provider returned HTTP ${response.status}.`,
      };
    }
    if (isResend) {
      return typeof data?.id === "string" && data.id
        ? { ...base, status: "sent", providerMessageId: data.id }
        : {
            ...base,
            errorMessage:
              "Resend returned an unrecognized response; delivery is unconfirmed.",
          };
    }
    if (data?.success !== true || !data.result) {
      return {
        ...base,
        errorMessage:
          "Cloudflare returned an unrecognized response; delivery is unconfirmed.",
      };
    }
    const result = data.result;
    const includesRecipient = (addresses: unknown) =>
      Array.isArray(addresses) &&
      addresses.some(
        (address) =>
          typeof address === "string" &&
          address.toLowerCase() === email.to.toLowerCase(),
      );
    const providerMessageId =
      typeof result.message_id === "string" ? result.message_id : null;
    if (
      includesRecipient(result.permanent_bounces) ||
      includesRecipient(result.suppressed_recipients)
    ) {
      const bounced = includesRecipient(result.permanent_bounces);
      return {
        ...base,
        providerMessageId,
        status: "failed",
        deliveryStatus: bounced ? "bounced" : "suppressed",
        errorMessage: bounced
          ? "Cloudflare reported a permanent bounce."
          : "Cloudflare suppressed this recipient.",
      };
    }
    const deliveryStatus = includesRecipient(result.delivered)
      ? "delivered"
      : includesRecipient(result.queued)
        ? "queued"
        : null;
    if (!deliveryStatus) {
      return {
        ...base,
        providerMessageId,
        errorMessage:
          "Cloudflare did not confirm this recipient's delivery status.",
      };
    }
    return { ...base, status: "sent", providerMessageId, deliveryStatus };
  } catch {
    return {
      ...base,
      errorMessage:
        "Email request timed out or the connection failed; delivery is unconfirmed.",
    };
  }
}
