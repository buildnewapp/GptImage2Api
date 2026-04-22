import "server-only";

import { API_KEY_STATUS_ACTIVE, parseBearerToken } from "@/lib/apikeys/index";
import { getAuth } from "@/lib/auth";
import {
  isLikelyClientAccessToken,
  verifyClientAccessToken,
} from "@/lib/auth/client-token";
import { getDb } from "@/lib/db";
import { apikeys as apikeysSchema, user as userSchema } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type RequestUser = {
  id: string;
  email: string;
  role: string;
  authType: "session" | "apikey" | "client_token";
};

export async function getRequestUser(
    request: Request,
): Promise<RequestUser | null> {
  const bearerToken = parseBearerToken(request.headers.get("authorization"));

  if (bearerToken) {
    if (bearerToken.startsWith("sk_")) {
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

    if (!isLikelyClientAccessToken(bearerToken)) {
      return null;
    }

    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      return null;
    }

    const payload = await verifyClientAccessToken({
      token: bearerToken,
      secret,
    });
    if (!payload?.user?.uuid) {
      return null;
    }

    const results = await getDb()
      .select({
        id: userSchema.id,
        email: userSchema.email,
        role: userSchema.role,
        banned: userSchema.banned,
      })
      .from(userSchema)
      .where(eq(userSchema.id, payload.user.uuid))
      .limit(1);

    const matchedUser = results[0];
    if (!matchedUser || matchedUser.banned) {
      return null;
    }

    return {
      id: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role,
      authType: "client_token",
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
