import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { apiResponse } from "@/lib/api-response";

export async function GET() {
  try {
    return apiResponse.success({
      families: AI_VIDEO_STUDIO_FAMILIES,
      total: AI_VIDEO_STUDIO_FAMILIES.length,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Video Studio families",
    );
  }
}
