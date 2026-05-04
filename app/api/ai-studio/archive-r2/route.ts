import { archivePendingAiStudioGenerationMediaUrls } from "@/lib/ai-studio/generations";
import { apiResponse } from "@/lib/api-response";
import { NextRequest } from "next/server";

function getArchiveSecret() {
  return (
    process.env.AI_STUDIO_ARCHIVE_SECRET ||
    process.env.AI_STUDIO_CALLBACK_SECRET ||
    process.env.KIE_CALLBACK_SECRET
  );
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = getArchiveSecret();
  if (!expectedSecret) {
    return false;
  }

  const querySecret = request.nextUrl.searchParams.get("secret");
  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  return querySecret === expectedSecret || bearerToken === expectedSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiResponse.unauthorized("Invalid archive secret.");
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 10;
  const result = await archivePendingAiStudioGenerationMediaUrls(limit);

  return apiResponse.success(result);
}

