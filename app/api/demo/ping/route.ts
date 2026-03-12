import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { count } from "drizzle-orm";


export async function GET(req: Request) {
  const [user, totalUsers] = await Promise.all([
    getRequestUser(req),
    getTotalUsers(),
  ]);

  return apiResponse.success({user, totalUsers});
}

async function getTotalUsers() {
  const result = await getDb()
    .select({ value: count() })
    .from(userSchema);

  return Number(result[0]?.value ?? 0);
}
