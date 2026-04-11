type JsonSchema = Record<string, any>;

export type AiVideoStudioFieldKind =
  | "enum"
  | "boolean"
  | "number"
  | "string-array"
  | "text";

export type AiVideoStudioFieldDescriptor = {
  key: string;
  path: string[];
  label: string;
  kind: AiVideoStudioFieldKind;
  required: boolean;
  schema: JsonSchema;
  defaultValue: unknown;
};

export type AiVideoStudioSchemaState = {
  fields: AiVideoStudioFieldDescriptor[];
  defaults: Record<string, unknown>;
};

function titleCase(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFieldKind(schema: JsonSchema): AiVideoStudioFieldKind {
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

function isCallbackField(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    normalized === "callback" ||
    normalized === "callbackurl" ||
    normalized === "progresscallbackurl" ||
    normalized === "webhookurl"
  );
}

function setValueAtPath(
  source: Record<string, unknown>,
  path: string[],
  value: unknown,
) {
  let cursor = source;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    const current = cursor[segment];

    if (!current || typeof current !== "object" || Array.isArray(current)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[path[path.length - 1]!] = value;
}

function getPayloadSchemaRoot(requestSchema: JsonSchema | null | undefined) {
  const inputSchema = requestSchema?.properties?.input;

  if (
    inputSchema &&
    typeof inputSchema === "object" &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    return inputSchema as JsonSchema;
  }

  return requestSchema ?? null;
}

export function normalizeAiVideoStudioSchema(detail: {
  requestSchema: JsonSchema | null | undefined;
  examplePayload: JsonSchema | null | undefined;
}): AiVideoStudioSchemaState {
  const payloadSchema = getPayloadSchemaRoot(detail.requestSchema);
  const fields: AiVideoStudioFieldDescriptor[] = [];
  const defaults: Record<string, unknown> = {};

  function walkSchema(schema: JsonSchema | null | undefined, path: string[] = []) {
    const properties = (schema?.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set<string>(
      Array.isArray(schema?.required)
        ? schema.required.filter((key: unknown): key is string => typeof key === "string")
        : [],
    );

    for (const key of getOrderedFieldKeys(properties, schema ?? {})) {
      if (key === "model" || isCallbackField(key)) {
        continue;
      }

      const childSchema = properties[key];
      if (!childSchema || typeof childSchema !== "object") {
        continue;
      }

      const nextPath = [...path, key];
      const isNestedObject =
        childSchema.type === "object" &&
        childSchema.properties &&
        !Array.isArray(childSchema.enum);

      if (isNestedObject) {
        walkSchema(childSchema, nextPath);
        continue;
      }

      const defaultValue = childSchema.default;
      setValueAtPath(defaults, nextPath, defaultValue);
      fields.push({
        key,
        path: nextPath,
        label: titleCase(nextPath.join(" / ")),
        kind: getFieldKind(childSchema),
        required: required.has(key),
        schema: childSchema,
        defaultValue,
      });
    }
  }

  walkSchema(payloadSchema);

  return {
    fields,
    defaults,
  };
}
