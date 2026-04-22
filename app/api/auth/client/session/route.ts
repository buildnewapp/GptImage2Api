import { getSession } from "@/lib/auth/server";
import { parseClientAuthBody } from "@/lib/auth/client-auth-request";
import { saveClientTicketWithDb } from "@/lib/auth/client-ticket-store";
import { signClientAccessToken } from "@/lib/auth/client-token";
import { getDb } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function getCurrentUserProfile(userId: string) {
  const rows = await getDb()
    .select({
      id: userSchema.id,
      email: userSchema.email,
      name: userSchema.name,
      image: userSchema.image,
      createdAt: userSchema.createdAt,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          code: 4001,
          message: "unauthorized",
          data: null,
        },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          code: 4000,
          message: "invalid_json_body",
          data: null,
        },
        { status: 400 },
      );
    }

    const { clientId, redirectUri } = parseClientAuthBody(body);
    const profile = await getCurrentUserProfile(session.user.id);
    if (!profile) {
      return NextResponse.json(
        {
          code: 4004,
          message: "user_not_found",
          data: null,
        },
        { status: 404 },
      );
    }

    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        {
          code: 5001,
          message: "missing_auth_secret",
          data: null,
        },
        { status: 500 },
      );
    }

    const tokenUser = {
      uuid: profile.id,
      email: profile.email,
      nickname: profile.name ?? profile.email,
      avatar_url: profile.image,
      created_at: profile.createdAt.toISOString(),
    };

    const accessToken = await signClientAccessToken({
      secret,
      user: tokenUser,
    });

    await saveClientTicketWithDb({
      clientId,
      redirectUri,
      accessToken,
      user: tokenUser,
    });

    return NextResponse.json({
      code: 0,
      message: "ok",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create client ticket";

    const status = /client_id|redirect_uri|request body/i.test(message) ? 400 : 500;

    return NextResponse.json(
      {
        code: status === 400 ? 4000 : 5000,
        message,
        data: null,
      },
      { status },
    );
  }
}
