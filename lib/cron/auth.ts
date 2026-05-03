import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

export async function assertCronAdminApiKey(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key")?.trim();
  const headers = new Headers(request.headers);
  if (key) {
    headers.set("authorization", `Bearer ${key}`);
  }
  const authRequest = key ? new Request(request, { headers }) : request;
  const user = await getRequestUser(authRequest);

  if (!user) {
    return apiResponse.unauthorized("invalid api key");
  }

  if (user.authType !== "apikey" || user.role !== "admin") {
    return apiResponse.forbidden("admin api key required");
  }

  return null;
}
