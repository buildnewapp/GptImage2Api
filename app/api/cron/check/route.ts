import { siteConfig } from "@/config/site";
import { apiResponse } from "@/lib/api-response";
import { assertCronAdminApiKey } from "@/lib/cron/auth";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";


/**
 curl -X GET "http://localhost:3000/api/cron/check" \
 -H "Authorization: Bearer sk_xxx"

 curl -X GET "http://localhost:3000/api/cron/check?key=sk_xxx"

 curl -X GET "http://localhost:3000/api/cron/check?m=show" \
  -H "Authorization: Bearer sk_xxx"
 */
export const dynamic = "force-dynamic";

const KIE_CREDIT_WARN_THRESHOLD = 50000;
const OPENROUTER_CREDIT_WARN_THRESHOLD = 10;
const APIMART_CREDIT_WARN_THRESHOLD = 20;

type CheckStatus = "ok" | "warn" | "error";

type CheckItem = {
  status: CheckStatus;
  message?: string;
  value?: number | null;
  threshold?: number;
};

type CronCheckResult = {
  checkedAt: string;
  status: CheckStatus;
  durationMs: number;
  checks: {
    db: CheckItem;
    kie: CheckItem;
    openrouter: CheckItem;
    apimart: CheckItem;
  };
  warnings: string[];
};

const globalState = globalThis as typeof globalThis & {
  __cronCheckLastResult?: CronCheckResult;
};

function toCheckError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

async function checkDb(): Promise<CheckItem> {
  const rows = await getDb().execute(sql`select 1 as ok`);
  const rowCount = Array.isArray(rows) ? rows.length : 1;

  return {
    status: rowCount > 0 ? "ok" : "error",
    message: rowCount > 0 ? "db connected" : "db check returned empty result",
  };
}

async function getKieCredits(): Promise<number | null> {
  const apiKey = process.env.KIE_API_KEY;
  const baseUrl = process.env.KIE_BASE_URL || "https://api.kie.ai";

  if (!apiKey) {
    throw new Error("KIE_API_KEY is not configured");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/chat/credit`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const result = await response.json().catch(() => ({}));

  if (response.ok && result?.code === 200) {
    return normalizeNumber(result.data);
  }

  throw new Error(`KIE credit query failed: ${JSON.stringify(result)}`);
}

async function getOpenrouterCredits(): Promise<number | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const keyResponse = await fetch("https://openrouter.ai/api/v1/key", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const keyResult = await keyResponse.json().catch(() => ({}));

  if (keyResponse.ok) {
    const limitRemaining = normalizeNumber(keyResult?.data?.limit_remaining);

    if (limitRemaining !== null) {
      return limitRemaining;
    }
  }

  const creditsResponse = await fetch("https://openrouter.ai/api/v1/credits", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const creditsResult = await creditsResponse.json().catch(() => ({}));

  if (creditsResponse.ok) {
    const totalCredits = normalizeNumber(creditsResult?.data?.total_credits);
    const totalUsage = normalizeNumber(creditsResult?.data?.total_usage);

    if (totalCredits !== null && totalUsage !== null) {
      return totalCredits - totalUsage;
    }

    return normalizeNumber(creditsResult?.data?.credits);
  }

  throw new Error(
    `OpenRouter credit query failed: ${JSON.stringify(keyResult)} ${JSON.stringify(creditsResult)}`,
  );
}

async function getApimartCredits(): Promise<number | null> {
  const apiKey = process.env.APIMART_API_KEY;
  const baseUrl = process.env.APIMART_BASE_URL || "https://api.apimart.ai";

  if (!apiKey) {
    throw new Error("APIMART_API_KEY is not configured");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/user/balance`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const result = await response.json().catch(() => ({}));

  if (response.ok && result?.success) {
    return normalizeNumber(result.remain_balance);
  }

  throw new Error(`APIMART credit query failed: ${JSON.stringify(result)}`);
}

async function checkCredit(
  name: string,
  threshold: number,
  getCredits: () => Promise<number | null>,
): Promise<CheckItem> {
  try {
    const value = await getCredits();

    if (value === null) {
      return {
        status: "error",
        value,
        threshold,
        message: `${name} balance returned empty value`,
      };
    }

    return {
      status: value < threshold ? "warn" : "ok",
      value,
      threshold,
      message: value < threshold
        ? `${name} balance is below ${threshold}`
        : `${name} balance is ok`,
    };
  } catch (error) {
    return {
      status: "error",
      value: null,
      threshold,
      message: toCheckError(error),
    };
  }
}

function collectWarnings(result: Omit<CronCheckResult, "warnings" | "status">) {
  const warnings: string[] = [];

  if (result.checks.kie.status === "warn") {
    warnings.push(`KIE_API_KEY 余额低于 ${KIE_CREDIT_WARN_THRESHOLD}: ${result.checks.kie.value}`);
  }
  if (result.checks.openrouter.status === "warn") {
    warnings.push(`OPENROUTER_API_KEY 余额低于 ${OPENROUTER_CREDIT_WARN_THRESHOLD}: ${result.checks.openrouter.value}`);
  }
  if (result.checks.apimart.status === "warn") {
    warnings.push(`APIMART_API_KEY 余额低于 ${APIMART_CREDIT_WARN_THRESHOLD}: ${result.checks.apimart.value}`);
  }

  return warnings;
}

function getOverallStatus(checks: CronCheckResult["checks"], warnings: string[]): CheckStatus {
  if (Object.values(checks).some((item) => item.status === "error")) {
    return "error";
  }

  return warnings.length > 0 ? "warn" : "ok";
}

async function sendWeComWarning(result: CronCheckResult) {
  if (result.warnings.length === 0) {
    return;
  }

  const webhookKey = process.env.WECOM_WARN_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error("WECOM_WARN_WEBHOOK_KEY is not configured");
    return;
  }

  const content = [
    `${siteConfig.name} 系统报警`,
    `时间: ${new Date(result.checkedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    ...result.warnings,
    `DB: ${result.checks.db.status}`,
    `KIE: ${result.checks.kie.value ?? "查询失败"}`,
    `OpenRouter: ${result.checks.openrouter.value ?? "查询失败"}`,
    `APIMART: ${result.checks.apimart.value ?? "查询失败"}`,
  ].join("\n");

  const response = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${webhookKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "text",
        text: {
          content,
        },
      }),
    },
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body?.errcode !== 0) {
    console.error("send wecom warning failed:", body);
  }
}

async function runCheck(): Promise<CronCheckResult> {
  const startTime = Date.now();
  const [dbResult, kieResult, openrouterResult, apimartResult] = await Promise.all([
    checkDb().catch((error) => ({
      status: "error" as const,
      message: toCheckError(error),
    })),
    checkCredit("KIE", KIE_CREDIT_WARN_THRESHOLD, getKieCredits),
    checkCredit("OpenRouter", OPENROUTER_CREDIT_WARN_THRESHOLD, getOpenrouterCredits),
    checkCredit("APIMART", APIMART_CREDIT_WARN_THRESHOLD, getApimartCredits),
  ]);

  const partialResult = {
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    checks: {
      db: dbResult,
      kie: kieResult,
      openrouter: openrouterResult,
      apimart: apimartResult,
    },
  };
  const warnings = collectWarnings(partialResult);
  const result: CronCheckResult = {
    ...partialResult,
    status: getOverallStatus(partialResult.checks, warnings),
    warnings,
  };

  globalState.__cronCheckLastResult = result;
  await sendWeComWarning(result);

  return result;
}

export async function GET(request: Request) {
  const authError = await assertCronAdminApiKey(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("m") === "show") {
    return apiResponse.success({
      result: globalState.__cronCheckLastResult ?? null,
    });
  }

  try {
    const result = await runCheck();
    return apiResponse.success(result);
  } catch (error) {
    return apiResponse.serverError(`cron check failed: ${toCheckError(error)}`);
  }
}
