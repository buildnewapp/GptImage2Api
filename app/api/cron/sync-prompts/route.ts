export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { Client } from "pg";

const execFile = promisify(execFileCallback);

const LOCK_ID = 20428001;
const SYNC_TIMEOUT_MS = 1000 * 60 * 9;
const OUTPUT_TAIL_LIMIT = 3000;

function toBearerRequest(request: Request) {
  if (request.headers.get("authorization")) {
    return request;
  }

  const rawApiKey = request.headers.get("x-api-key")?.trim();
  if (!rawApiKey) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${rawApiKey}`);

  return new Request(request.url, {
    method: request.method,
    headers,
  });
}

function tailText(value: string | undefined) {
  if (!value) return "";
  if (value.length <= OUTPUT_TAIL_LIMIT) return value;
  return value.slice(-OUTPUT_TAIL_LIMIT);
}

function parseSyncSummary(stdout: string) {
  const jsonMatches = stdout.match(/\{[\s\S]*\}/g);
  if (!jsonMatches || jsonMatches.length === 0) return null;

  const lastJson = jsonMatches[jsonMatches.length - 1];
  try {
    return JSON.parse(lastJson);
  } catch {
    return null;
  }
}

async function runSyncCommand() {
  const startedAt = Date.now();
  const { stdout, stderr } = await execFile(
    "pnpm",
    ["prompts:sync-youmind", "--mode", "incremental"],
    {
      cwd: process.cwd(),
      env: process.env,
      timeout: SYNC_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return {
    durationMs: Date.now() - startedAt,
    summary: parseSyncSummary(stdout),
    stdoutTail: tailText(stdout),
    stderrTail: tailText(stderr),
  };
}

async function handle(request: Request) {
  try {
    const user = await getRequestUser(toBearerRequest(request));
    if (!user) {
      return apiResponse.unauthorized("Admin API key required.");
    }

    if (user.authType !== "apikey") {
      return apiResponse.forbidden("Only API key access is allowed for this endpoint.");
    }

    if (user.role !== "admin") {
      return apiResponse.forbidden("Only admin API key is allowed.");
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return apiResponse.serverError("DATABASE_URL is not configured.");
    }

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    let locked = false;

    try {
      const lockResult = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_lock($1) as locked",
        [LOCK_ID],
      );

      locked = Boolean(lockResult.rows[0]?.locked);
      if (!locked) {
        return apiResponse.conflict("Sync is already running.");
      }

      const result = await runSyncCommand();

      return apiResponse.success({
        ok: true,
        mode: "incremental",
        durationMs: result.durationMs,
        summary: result.summary,
        stdoutTail: result.stdoutTail,
        stderrTail: result.stderrTail,
      });
    } finally {
      if (locked) {
        await client
          .query("select pg_advisory_unlock($1)", [LOCK_ID])
          .catch(() => null);
      }
      await client.end();
    }
  } catch (error: any) {
    const message = error?.message || "Failed to sync prompts";
    const stderr = typeof error?.stderr === "string" ? tailText(error.stderr) : "";
    const stdout = typeof error?.stdout === "string" ? tailText(error.stdout) : "";

    return apiResponse.serverError(
      [message, stderr, stdout].filter(Boolean).join("\n"),
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
