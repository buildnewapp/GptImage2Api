import { basePostSchema } from "@/components/cms/post-config";
import { postTypeEnum } from "@/lib/db/schema";
import {
  normalizeAlternativeMetadata,
  normalizeCompareMetadata,
  normalizeTemplateMetadata,
  normalizeUseCaseMetadata,
} from "@/lib/seo/content-schema";
import { z } from "zod";

const submitPostSchema = z
  .object({
    postType: z.enum(postTypeEnum.enumValues).default("blog"),
  })
  .merge(basePostSchema);

export type AdminPostSubmission = z.infer<typeof submitPostSchema>;

type ParseAdminPostSubmissionResult =
  | {
      success: true;
      data: AdminPostSubmission;
    }
  | {
      success: false;
      status: 400;
      message: string;
    };

function normalizeSeoMetadata(input: AdminPostSubmission) {
  switch (input.postType) {
    case "use_case":
      return normalizeUseCaseMetadata(input.metadataJsonb ?? {});
    case "template":
      return normalizeTemplateMetadata(input.metadataJsonb);
    case "alternative":
      return normalizeAlternativeMetadata(input.metadataJsonb ?? {});
    case "compare":
      return normalizeCompareMetadata(input.metadataJsonb ?? {});
    default:
      return input.metadataJsonb;
  }
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

export function appendSlugTimestamp(slug: string, date = new Date()) {
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());

  return `${slug}-${month}${day}${hour}${minute}`;
}

export function parseAdminPostSubmission(
  input: unknown,
): ParseAdminPostSubmissionResult {
  const validated = submitPostSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      status: 400,
      message: "Invalid input data.",
    };
  }

  try {
    return {
      success: true,
      data: {
        ...validated.data,
        metadataJsonb: normalizeSeoMetadata(validated.data),
      },
    };
  } catch {
    return {
      success: false,
      status: 400,
      message: `Invalid metadataJsonb for postType '${validated.data.postType}'.`,
    };
  }
}
