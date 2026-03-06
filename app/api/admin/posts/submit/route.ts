import { basePostSchema } from "@/components/cms/post-config";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import {
  postTags as postTagsSchema,
  posts as postsSchema,
  postTypeEnum,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitPostSchema = z.object({
  postType: z.enum(postTypeEnum.enumValues).default("blog"),
}).merge(basePostSchema);

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return apiResponse.unauthorized();
  }

  if (user.role !== "admin") {
    return apiResponse.forbidden("Admin privileges required.");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON body.");
  }

  const validated = submitPostSchema.safeParse(rawBody);
  if (!validated.success) {
    return apiResponse.badRequest("Invalid input data.");
  }

  const { postType, tags, ...postData } = validated.data;
  const finalFeaturedImageUrl =
    postData.featuredImageUrl === "" ? null : postData.featuredImageUrl;

  try {
    const postId = await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(postsSchema)
        .values({
          ...postData,
          postType,
          authorId: user.id,
          featuredImageUrl: finalFeaturedImageUrl,
          content: postData.content || null,
          description: postData.description || null,
          isPinned: postData.isPinned || false,
        })
        .returning({ id: postsSchema.id });

      const createdPost = inserted[0];
      if (!createdPost?.id) {
        throw new Error("FAILED_TO_CREATE_POST");
      }

      if (tags && tags.length > 0) {
        await tx.insert(postTagsSchema).values(
          tags.map((tag) => ({
            postId: createdPost.id,
            tagId: tag.id,
          })),
        );
      }

      return createdPost.id;
    });

    if (postData.status === "published") {
      revalidatePath(
        `${postData.language === DEFAULT_LOCALE ? "" : "/" + postData.language}/${postType}`,
      );
      revalidatePath(
        `${postData.language === DEFAULT_LOCALE ? "" : "/" + postData.language}/${postType}/${postData.slug}`,
      );
    }

    return apiResponse.success({ postId }, 201);
  } catch (error: unknown) {
    if ((error as { cause?: { code?: string } })?.cause?.code === "23505") {
      return apiResponse.conflict(`Slug '${postData.slug}' already exists.`);
    }

    return apiResponse.serverError(getErrorMessage(error));
  }
}
