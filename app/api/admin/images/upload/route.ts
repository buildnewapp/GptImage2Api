import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  buildAdminImageUploadObjectKey,
  isAdminUploadImageContentType,
} from "@/lib/cms/admin-image-upload";
import { serverUploadFile } from "@/lib/cloudflare/r2";
import { getErrorMessage } from "@/lib/error-utils";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return apiResponse.unauthorized();
  }

  if (user.role !== "admin") {
    return apiResponse.forbidden("Admin privileges required.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiResponse.badRequest("Invalid form data.");
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return apiResponse.badRequest("Missing upload file.");
  }

  const contentType = fileValue.type || "application/octet-stream";
  if (!isAdminUploadImageContentType(contentType)) {
    return apiResponse.badRequest("Only image uploads are supported.");
  }

  try {
    const objectKey = buildAdminImageUploadObjectKey({
      fileName: fileValue.name,
    });
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    const uploaded = await serverUploadFile({
      data: buffer,
      contentType,
      key: objectKey,
    });

    return apiResponse.success(
      {
        key: uploaded.key,
        publicObjectUrl: uploaded.url,
      },
      201,
    );
  } catch (error) {
    return apiResponse.serverError(
      getErrorMessage(error) || "Failed to upload image.",
    );
  }
}
