import { getEmailLogs } from "@/actions/email-logs/admin";
import { getTranslations } from "next-intl/server";
import { EmailLogsTable } from "./EmailLogsTable";

export default async function EmailLogsPage() {
  const result = await getEmailLogs();
  const t = await getTranslations("EmailLogs");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <EmailLogsTable
        initialData={
          result.success && result.data ? result.data : { logs: [], count: 0 }
        }
        initialError={result.success ? null : result.error}
      />
    </div>
  );
}
