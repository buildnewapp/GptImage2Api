import { siteConfig } from "@/config/site";
import { apiResponse } from "@/lib/api-response";
import { assertCronPassword } from "@/lib/cron/auth";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";


/**
 curl -X GET "http://localhost:3000/api/cron/check" \
 -H "Authorization: Bearer cron_pwd"

 curl -X GET "http://localhost:3000/api/cron/check?pwd=cron_pwd"

 curl -X GET "http://localhost:3000/api/cron/check?m=show" \
  -H "Authorization: Bearer cron_pwd"
 */
export const dynamic = "force-dynamic";

const KIE_CREDIT_WARN_THRESHOLD = 3000;
const OPENROUTER_CREDIT_WARN_THRESHOLD = 10;
const APIMART_CREDIT_WARN_THRESHOLD = 20;
const FAL_CREDIT_WARN_THRESHOLD = 10;

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
    fal: CheckItem;
  };
  warnings: string[];
  changes: CronCheckChange[];
};

type CronCheckChange = {
  label: string;
  previous: string | null;
  current: string;
};

const globalState = globalThis as typeof globalThis & {
  __cronCheckLastResult?: CronCheckResult;
};

function toCheckError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
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

async function getFalCredits(): Promise<number | null> {
  const apiKey = process.env.FAL_ADMIN_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_ADMIN_API_KEY is not configured");
  }

  const response = await fetch("https://api.fal.ai/v1/account/billing?expand=credits", {
    method: "GET",
    headers: {
      Authorization: apiKey.startsWith("Key ") ? apiKey : `Key ${apiKey}`,
    },
  });
  const result = await response.json().catch(() => ({}));

  if (response.ok) {
    return normalizeNumber(result?.credits?.current_balance);
  }

  throw new Error(`FAL admin billing query failed: ${JSON.stringify(result)}`);
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

function collectWarnings(result: Omit<CronCheckResult, "warnings" | "status" | "changes">) {
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
  if (result.checks.fal.status === "warn") {
    warnings.push(`FAL 账户余额低于 ${FAL_CREDIT_WARN_THRESHOLD}: ${result.checks.fal.value}`);
  }

  return warnings;
}

function getOverallStatus(checks: CronCheckResult["checks"], warnings: string[]): CheckStatus {
  if (Object.values(checks).some((item) => item.status === "error")) {
    return "error";
  }

  return warnings.length > 0 ? "warn" : "ok";
}

function formatCheckSnapshot(item: CheckItem) {
  const valueText = item.value === undefined ? "" : `, value=${item.value ?? "null"}`;
  return `status=${item.status}${valueText}`;
}

function collectCheckChanges(
  previous: CronCheckResult | undefined,
  current: Omit<CronCheckResult, "status" | "warnings" | "changes">,
) {
  const checks: Array<[string, CheckItem | undefined, CheckItem]> = [
    ["DB", previous?.checks.db, current.checks.db],
    ["KIE", previous?.checks.kie, current.checks.kie],
    ["OpenRouter", previous?.checks.openrouter, current.checks.openrouter],
    ["APIMART", previous?.checks.apimart, current.checks.apimart],
    ["FAL", previous?.checks.fal, current.checks.fal],
  ];

  return checks
    .map(([label, previousItem, currentItem]) => ({
      label,
      previous: previousItem ? formatCheckSnapshot(previousItem) : null,
      current: formatCheckSnapshot(currentItem),
    }))
    .filter((change) => change.previous === null || change.previous !== change.current);
}

function formatShanghaiTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

async function sendWeComCheckChange(result: CronCheckResult) {
  if (result.changes.length === 0) {
    return;
  }

  const webhookKey = process.env.WECOM_MSG_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error("WECOM_MSG_WEBHOOK_KEY is not configured");
    return;
  }

  const content = [
    `${siteConfig.name} 系统检测变动通知`,
    `时间: ${formatShanghaiTime(result.checkedAt)}`,
    ...result.changes.map((change) => `${change.label}: ${change.previous ?? "无"} -> ${change.current}`),
    ...(result.warnings.length > 0 ? result.warnings : ["报警: 无"]),
    `DB: ${result.checks.db.status}`,
    `KIE: ${result.checks.kie.value ?? "查询失败"}`,
    `OpenRouter: ${result.checks.openrouter.value ?? "查询失败"}`,
    `APIMART: ${result.checks.apimart.value ?? "查询失败"}`,
    `FAL: ${result.checks.fal.value ?? "查询失败"}`,
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
    console.error("send wecom check change failed:", body);
  }
}

async function runCheck(): Promise<CronCheckResult> {
  const startTime = Date.now();
  const previousResult = globalState.__cronCheckLastResult;
  const [dbResult, kieResult, openrouterResult, apimartResult, falResult] = await Promise.all([
    checkDb().catch((error) => ({
      status: "error" as const,
      message: toCheckError(error),
    })),
    checkCredit("KIE", KIE_CREDIT_WARN_THRESHOLD, getKieCredits),
    checkCredit("OpenRouter", OPENROUTER_CREDIT_WARN_THRESHOLD, getOpenrouterCredits),
    checkCredit("APIMART", APIMART_CREDIT_WARN_THRESHOLD, getApimartCredits),
    checkCredit("FAL", FAL_CREDIT_WARN_THRESHOLD, getFalCredits),
  ]);

  const partialResult = {
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    checks: {
      db: dbResult,
      kie: kieResult,
      openrouter: openrouterResult,
      apimart: apimartResult,
      fal: falResult,
    },
  };
  const warnings = collectWarnings(partialResult);
  const result: CronCheckResult = {
    ...partialResult,
    status: getOverallStatus(partialResult.checks, warnings),
    warnings,
    changes: collectCheckChanges(previousResult, partialResult),
  };

  globalState.__cronCheckLastResult = result;
  await sendWeComCheckChange(result);

  return result;
}

export async function GET(request: Request) {
  const authError = assertCronPassword(request);
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
