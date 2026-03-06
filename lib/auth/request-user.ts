import "server-only";

import { API_KEY_STATUS_ACTIVE, parseBearerToken } from "@/lib/apikeys/index";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apikeys as apikeysSchema, user as userSchema } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type RequestUser = {
  id: string;
  email: string;
  role: string;
  authType: "session" | "apikey";
};

export async function getRequestUser(
    request: Request,
): Promise<RequestUser | null> {
  const bearerToken = parseBearerToken(request.headers.get("authorization"));

  if (bearerToken) {
    const results = await getDb()
        .select({
          id: userSchema.id,
          email: userSchema.email,
          role: userSchema.role,
          banned: userSchema.banned,
        })
        .from(apikeysSchema)
        .innerJoin(
            userSchema,
            sql`${apikeysSchema.userUuid} = ${userSchema.id}::text`,
        )
        .where(
            and(
                eq(apikeysSchema.apiKey, bearerToken),
                eq(apikeysSchema.status, API_KEY_STATUS_ACTIVE),
            ),
        )
        .limit(1);

    const matchedUser = results[0];
    if (!matchedUser || matchedUser.banned) {
      return null;
    }

    return {
      id: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role,
      authType: "apikey",
    };
  }

  const session = await getAuth().api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role:  (session.user as unknown as { role: string }).role ?? "user",
    authType: "session",
  };
}
