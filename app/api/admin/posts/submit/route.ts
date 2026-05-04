import { DEFAULT_LOCALE } from "@/i18n/routing";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  appendSlugTimestamp,
  parseAdminPostSubmission,
} from "@/lib/cms/admin-post-submit";
import { getDb } from "@/lib/db";
import {
  postTags as postTagsSchema,
  posts as postsSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

  const validated = parseAdminPostSubmission(rawBody);
  if (!validated.success) {
    return apiResponse.error(validated.message, validated.status);
  }

  const { postType, tags, ...postData } = validated.data;
  const finalFeaturedImageUrl =
    postData.featuredImageUrl === "" ? null : postData.featuredImageUrl;

  try {
    const created = await getDb().transaction(async (tx) => {
      const existingPost = await tx
        .select({ id: postsSchema.id })
        .from(postsSchema)
        .where(
          and(
            eq(postsSchema.language, postData.language),
            eq(postsSchema.slug, postData.slug),
            eq(postsSchema.postType, postType),
          ),
        )
        .limit(1);
      const finalSlug = existingPost.length > 0
        ? appendSlugTimestamp(postData.slug)
        : postData.slug;

      const inserted = await tx
        .insert(postsSchema)
        .values({
          ...postData,
          slug: finalSlug,
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

      return {
        postId: createdPost.id,
        slug: finalSlug,
      };
    });

    if (postData.status === "published") {
      revalidatePath(
        `${postData.language === DEFAULT_LOCALE ? "" : "/" + postData.language}/${postType}`,
      );
      revalidatePath(
        `${postData.language === DEFAULT_LOCALE ? "" : "/" + postData.language}/${postType}/${created.slug}`,
      );
    }

    return apiResponse.success(created, 201);
  } catch (error: unknown) {
    if ((error as { cause?: { code?: string } })?.cause?.code === "23505") {
      return apiResponse.conflict(`Slug '${postData.slug}' already exists.`);
    }

    return apiResponse.serverError(getErrorMessage(error));
  }
}
