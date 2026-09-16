"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import { and, count, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { z } from "zod";

export type EmailLogRecord = typeof emailLogs.$inferSelect;
export type EmailLogSummary = Omit<
  EmailLogRecord,
  "variables" | "errorMessage" | "idempotencyKey"
>;

const filtersSchema = z
  .object({
    query: z.string().trim().max(200).default(""),
    provider: z.enum(["all", "resend", "cloudflare"]).default("all"),
    status: z
      .enum(["all", "sending", "sent", "failed", "unknown"])
      .default("all"),
    template: z.string().trim().max(100).default(""),
    from: z.union([z.literal(""), z.string().date()]).default(""),
    to: z.union([z.literal(""), z.string().date()]).default(""),
    pageIndex: z.number().int().min(0).max(100_000).default(0),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Start date must not be after end date.",
  });

export type EmailLogFilters = z.input<typeof filtersSchema>;
export type EmailLogPage = { logs: EmailLogSummary[]; count: number };

export async function getEmailLogs(
  input: EmailLogFilters = {},
): Promise<ActionResult<EmailLogPage>> {
  if (!(await isAdmin()))
    return actionResponse.forbidden("Admin privileges required.");
  const parsed = filtersSchema.safeParse(input);
  if (!parsed.success)
    return actionResponse.badRequest("Invalid email log filters.");
  const filters = parsed.data;
  const conditions = [];
  if (filters.query) {
    const pattern = `%${filters.query.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(emailLogs.toEmail, pattern),
        ilike(emailLogs.fromEmail, pattern),
        ilike(emailLogs.fromName, pattern),
        ilike(emailLogs.subject, pattern),
        ilike(emailLogs.providerMessageId, pattern),
      ),
    );
  }
  if (filters.provider !== "all")
    conditions.push(eq(emailLogs.provider, filters.provider));
  if (filters.status !== "all")
    conditions.push(eq(emailLogs.status, filters.status));
  if (filters.template)
    conditions.push(eq(emailLogs.templateKey, filters.template));
  // The UI displays and filters dates in UTC+8.
  if (filters.from)
    conditions.push(
      gte(emailLogs.createdAt, new Date(`${filters.from}T00:00:00+08:00`)),
    );
  if (filters.to)
    conditions.push(
      lt(
        emailLogs.createdAt,
        new Date(
          new Date(`${filters.to}T00:00:00+08:00`).getTime() + 86_400_000,
        ),
      ),
    );
  const where = and(...conditions);
  try {
    const db = getDb();
    const [logs, totals] = await Promise.all([
      db
        .select({
          id: emailLogs.id,
          toEmail: emailLogs.toEmail,
          fromEmail: emailLogs.fromEmail,
          fromName: emailLogs.fromName,
          subject: emailLogs.subject,
          templateKey: emailLogs.templateKey,
          provider: emailLogs.provider,
          status: emailLogs.status,
          providerMessageId: emailLogs.providerMessageId,
          deliveryStatus: emailLogs.deliveryStatus,
          jobId: emailLogs.jobId,
          createdAt: emailLogs.createdAt,
          sentAt: emailLogs.sentAt,
          updatedAt: emailLogs.updatedAt,
        })
        .from(emailLogs)
        .where(where)
        .orderBy(desc(emailLogs.createdAt), desc(emailLogs.id))
        .limit(filters.pageSize)
        .offset(filters.pageIndex * filters.pageSize),
      db.select({ count: count() }).from(emailLogs).where(where),
    ]);
    return actionResponse.success({ logs, count: totals[0]?.count ?? 0 });
  } catch {
    console.error("Failed to load email logs.");
    return actionResponse.error(
      "Unable to load email records. Verify the email_logs migration has been applied.",
    );
  }
}

export async function getEmailLog(
  id: string,
): Promise<ActionResult<EmailLogRecord>> {
  if (!(await isAdmin()))
    return actionResponse.forbidden("Admin privileges required.");
  if (!z.string().uuid().safeParse(id).success)
    return actionResponse.badRequest("Invalid email record ID.");
  try {
    const [log] = await getDb()
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, id))
      .limit(1);
    return log
      ? actionResponse.success(log)
      : actionResponse.notFound("Email record not found.");
  } catch {
    return actionResponse.error("Unable to load email record.");
  }
}
