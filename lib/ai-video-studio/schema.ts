type JsonSchema = Record<string, any>;

export type AiVideoStudioFieldKind =
  | "prompt"
  | "image"
  | "enum"
  | "boolean"
  | "number"
  | "string-array"
  | "text";

export type AiVideoStudioFieldDescriptor = {
  key: string;
  label: string;
  kind: AiVideoStudioFieldKind;
  required: boolean;
  schema: JsonSchema;
  defaultValue: unknown;
};

export type AiVideoStudioSchemaState = {
  fields: AiVideoStudioFieldDescriptor[];
  defaults: Record<string, unknown>;
  requiresPrompt: boolean;
  requiresImage: boolean;
};

function titleCase(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isImageField(key: string, schema: JsonSchema) {
  const lowerKey = key.toLowerCase();
  if (!lowerKey.includes("image")) {
    return false;
  }

  if (schema.type === "array") {
    return schema.items?.type === "string";
  }

  return schema.type === "string";
}

function getFieldKind(key: string, schema: JsonSchema): AiVideoStudioFieldKind {
  const lowerKey = key.toLowerCase();

  if (lowerKey === "prompt" || lowerKey.endsWith("_prompt")) {
    return "prompt";
  }

  if (isImageField(key, schema)) {
    return "image";
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  if (schema.type === "number" || schema.type === "integer") {
    return "number";
  }

  if (
    schema.type === "array" &&
    schema.items &&
    schema.items.type === "string"
  ) {
    return "string-array";
  }

  return "text";
}

function getOrderedFieldKeys(properties: Record<string, JsonSchema>, schema: JsonSchema) {
  const ordered = Array.isArray(schema["x-apidog-orders"])
    ? schema["x-apidog-orders"].filter((key: unknown): key is string => typeof key === "string")
    : [];
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const key of ordered) {
    if (!(key in properties) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }

  for (const key of Object.keys(properties)) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }

  return keys;
}

export function normalizeAiVideoStudioSchema(detail: {
  requestSchema: JsonSchema | null | undefined;
  examplePayload: JsonSchema | null | undefined;
}): AiVideoStudioSchemaState {
  const inputSchema = detail.requestSchema?.properties?.input;
  const properties = (inputSchema?.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set<string>(
    Array.isArray(inputSchema?.required)
      ? inputSchema.required.filter((key: unknown): key is string => typeof key === "string")
      : [],
  );
  const exampleInput =
    detail.examplePayload?.input && typeof detail.examplePayload.input === "object"
      ? (detail.examplePayload.input as Record<string, unknown>)
      : {};

  const fields: AiVideoStudioFieldDescriptor[] = [];
  const defaults: Record<string, unknown> = {};

  for (const key of getOrderedFieldKeys(properties, inputSchema ?? {})) {
    const schema = properties[key];
    const defaultValue =
      exampleInput[key] !== undefined ? exampleInput[key] : schema?.default;

    defaults[key] = defaultValue;
    fields.push({
      key,
      label: titleCase(key),
      kind: getFieldKind(key, schema),
      required: required.has(key),
      schema,
      defaultValue,
    });
  }

  return {
    fields,
    defaults,
    requiresPrompt:
      required.has("prompt") ||
      fields.some((field) => field.kind === "prompt" && field.required),
    requiresImage:
      fields.some((field) => field.kind === "image" && field.required),
  };
}
