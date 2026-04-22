import { getAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

// Better Auth handler for Cloudflare Workers
// Uses getAuth() to ensure database connection is resolved within request context

export async function GET(req: NextRequest) {
  const auth = getAuth();
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  const auth = getAuth();
  return auth.handler(req);
}

// Support other HTTP methods used by Better Auth
export async function PUT(req: NextRequest) {
  const auth = getAuth();
  return auth.handler(req);
}

export async function DELETE(req: NextRequest) {
  const auth = getAuth();
  return auth.handler(req);
}

export async function PATCH(req: NextRequest) {
  const auth = getAuth();
  return auth.handler(req);
}
