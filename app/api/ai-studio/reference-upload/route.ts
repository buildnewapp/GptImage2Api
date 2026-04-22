import { apiResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth/server";
import { serverUploadFile } from "@/lib/cloudflare/r2";
import {
  buildReferenceUploadObjectKey,
  isReferenceUploadKind,
} from "@/lib/ai-video-studio/reference-upload";
import { getErrorMessage } from "@/lib/error-utils";

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return apiResponse.unauthorized("Please sign in to upload reference files.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiResponse.badRequest("Invalid form data.");
  }

  const kindValue = formData.get("kind");
  const fileValue = formData.get("file");

  if (typeof kindValue !== "string" || !isReferenceUploadKind(kindValue)) {
    return apiResponse.badRequest("Unsupported reference upload kind.");
  }

  if (!(fileValue instanceof File)) {
    return apiResponse.badRequest("Missing upload file.");
  }

  try {
    const objectKey = buildReferenceUploadObjectKey({
      kind: kindValue,
      fileName: fileValue.name,
    });

    const buffer = Buffer.from(await fileValue.arrayBuffer());
    const uploaded = await serverUploadFile({
      data: buffer,
      contentType: fileValue.type || "application/octet-stream",
      key: objectKey,
    });

    return apiResponse.success({
      key: uploaded.key,
      publicObjectUrl: uploaded.url,
    });
  } catch (error) {
    return apiResponse.serverError(
      getErrorMessage(error) || "Failed to upload reference file.",
    );
  }
}
