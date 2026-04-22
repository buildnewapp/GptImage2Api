import { parseClientAuthParams } from "@/lib/auth/client-auth-request";
import { consumeClientTicketWithDb } from "@/lib/auth/client-ticket-store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { clientId } = parseClientAuthParams(request.nextUrl.searchParams);
    const result = await consumeClientTicketWithDb({ clientId });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid client auth request";

    return NextResponse.json(
      {
        code: 4000,
        message,
        data: null,
      },
      { status: 400 },
    );
  }
}
