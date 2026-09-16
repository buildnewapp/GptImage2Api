import { apiResponse } from "@/lib/api-response";
import { assertCronPassword } from "@/lib/cron/auth";
import { runRecallEmails } from "@/lib/email/recall/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = assertCronPassword(request);
  if (authError) return authError;
  try {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
    return apiResponse.success(await runRecallEmails({ dryRun }));
  } catch (error) {
    console.error("Recall cron failed:", error);
    return apiResponse.serverError("Recall cron failed; check server logs.");
  }
}
