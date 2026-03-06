import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

export async function GET(req: Request) {
  const user = await getRequestUser(req);

  if (!user) {
    return apiResponse.unauthorized();
  }

  return apiResponse.success({
    message: "pong",
    user,
  });
}
