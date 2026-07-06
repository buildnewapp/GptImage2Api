import { apiResponse } from "@/lib/api-response";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

export function assertCronPassword(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronPwd = process.env.CRON_PWD?.trim();

  if (!cronPwd) {
    return apiResponse.serverError("CRON_PWD is not configured");
  }

  const requestPwd = searchParams.get("pwd")?.trim()
    || searchParams.get("key")?.trim()
    || getBearerToken(request);

  if (requestPwd !== cronPwd) {
    return apiResponse.unauthorized("invalid cron password");
  }

  return null;
}
