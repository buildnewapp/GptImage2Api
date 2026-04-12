import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

export const IMAGE_WITH_ROLES_ORDER = [
  "first_frame",
  "last_frame",
] as const;

export type ImageWithRolesSlot = typeof IMAGE_WITH_ROLES_ORDER[number];

type ImageWithRolesItem = {
  url: string;
  role: ImageWithRolesSlot;
};

type JsonSchema = Record<string, any>;

function getRoleSchemaEnum(schema: JsonSchema) {
  return Array.isArray(schema.enum)
    ? schema.enum.filter((value): value is string => typeof value === "string")
    : [];
}

function isImageWithRolesItem(value: unknown): value is ImageWithRolesItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === "string" &&
    IMAGE_WITH_ROLES_ORDER.includes(candidate.role as ImageWithRolesSlot)
  );
}

export function isImageWithRolesFieldDescriptor(
  field: AiVideoStudioFieldDescriptor,
) {
  if (field.kind !== "array" || field.schema.type !== "array") {
    return false;
  }

  const itemSchema =
    field.schema.items && typeof field.schema.items === "object"
      ? (field.schema.items as JsonSchema)
      : null;

  if (!itemSchema || itemSchema.type !== "object") {
    return false;
  }

  const urlSchema =
    itemSchema.properties?.url && typeof itemSchema.properties.url === "object"
      ? (itemSchema.properties.url as JsonSchema)
      : null;
  const roleSchema =
    itemSchema.properties?.role && typeof itemSchema.properties.role === "object"
      ? (itemSchema.properties.role as JsonSchema)
      : null;

  if (!urlSchema || !roleSchema) {
    return false;
  }

  const roles = getRoleSchemaEnum(roleSchema);

  return (
    urlSchema.type === "string" &&
    urlSchema.format === "uri" &&
    IMAGE_WITH_ROLES_ORDER.every((role) => roles.includes(role))
  );
}

export function getImageWithRolesSlotUrl(
  value: unknown,
  role: ImageWithRolesSlot,
) {
  if (!Array.isArray(value)) {
    return "";
  }

  const match = value.find(
    (item): item is ImageWithRolesItem =>
      isImageWithRolesItem(item) && item.role === role && item.url.trim().length > 0,
  );

  return match?.url ?? "";
}

export function setImageWithRolesSlotUrl(
  value: unknown,
  role: ImageWithRolesSlot,
  url: string,
) {
  const normalizedUrl = url.trim();
  const nextByRole = new Map<ImageWithRolesSlot, string>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isImageWithRolesItem(item)) {
        continue;
      }

      const itemUrl = item.url.trim();
      if (!itemUrl) {
        continue;
      }

      nextByRole.set(item.role, itemUrl);
    }
  }

  if (normalizedUrl) {
    nextByRole.set(role, normalizedUrl);
  } else {
    nextByRole.delete(role);
  }

  return IMAGE_WITH_ROLES_ORDER.flatMap((currentRole) => {
    const currentUrl = nextByRole.get(currentRole);

    return currentUrl
      ? [
          {
            url: currentUrl,
            role: currentRole,
          },
        ]
      : [];
  });
}
