type JsonSchema = Record<string, any>;

type AiVideoStudioFormUiConfig = {
  fieldOrder?: string[];
  advancedFields?: string[];
};

export type AiVideoStudioFieldKind =
  | "enum"
  | "boolean"
  | "number"
  | "array"
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
  primaryFields: AiVideoStudioFieldDescriptor[];
  advancedFields: AiVideoStudioFieldDescriptor[];
  defaults: Record<string, unknown>;
  usesDefaultAdvancedGrouping: boolean;
};

function getValueAtPath(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function hasFilledValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function isFieldValueSupported(
  field: AiVideoStudioFieldDescriptor,
  value: unknown,
) {
  if (!hasFilledValue(value)) {
    return false;
  }

  if (field.kind !== "enum") {
    return true;
  }

  const options = Array.isArray(field.schema.enum) ? field.schema.enum : [];

  return options.some((option) => option === value);
}

function getPathTokens(path: string[]) {
  return path
    .flatMap((segment) =>
      segment
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean),
    );
}

function matchesDefaultAdvancedField(path: string[]) {
  const tokens = getPathTokens(path);

  return tokens.some(
    (token) => token === "seed" || token === "seeds" || token === "watermark",
  );
}

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

  if (schema.type === "array") {
    return "array";
  }

  return "text";
}

function getOrderedFieldKeys(
  properties: Record<string, JsonSchema>,
  schema: JsonSchema,
  preferredOrder?: string[],
) {
  const ordered = Array.isArray(preferredOrder)
    ? preferredOrder.filter((key): key is string => typeof key === "string")
    : Array.isArray(schema["x-apidog-orders"])
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

function isPromptField(key: string) {
  const normalized = key.toLowerCase();
  return normalized === "prompt" || normalized.endsWith("_prompt");
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
  formUi?: AiVideoStudioFormUiConfig | null | undefined;
}): AiVideoStudioSchemaState {
  const payloadSchema = getPayloadSchemaRoot(detail.requestSchema);
  const fields: AiVideoStudioFieldDescriptor[] = [];
  const defaults: Record<string, unknown> = {};
  const advancedFieldSet = new Set(
    Array.isArray(detail.formUi?.advancedFields)
      ? detail.formUi?.advancedFields.filter((key): key is string => typeof key === "string")
      : [],
  );
  const hasCustomFormUi =
    (Array.isArray(detail.formUi?.fieldOrder) &&
      detail.formUi.fieldOrder.length > 0) ||
    (Array.isArray(detail.formUi?.advancedFields) &&
      detail.formUi.advancedFields.length > 0);

  function walkSchema(schema: JsonSchema | null | undefined, path: string[] = []) {
    const properties = (schema?.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set<string>(
      Array.isArray(schema?.required)
        ? schema.required.filter((key: unknown): key is string => typeof key === "string")
        : [],
    );

    const preferredOrder =
      path.length === 0 && Array.isArray(detail.formUi?.fieldOrder)
        ? detail.formUi.fieldOrder
        : undefined;

    for (const key of getOrderedFieldKeys(properties, schema ?? {}, preferredOrder)) {
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
        required: required.has(key) || isPromptField(key),
        schema: childSchema,
        defaultValue,
      });
    }
  }

  walkSchema(payloadSchema);
  const advancedFields = fields.filter((field) => {
    if (!hasCustomFormUi) {
      return field.kind === "boolean" || matchesDefaultAdvancedField(field.path);
    }

    const joinedPath = field.path.join(".");
    return (
      advancedFieldSet.has(joinedPath) ||
      advancedFieldSet.has(field.key) ||
      advancedFieldSet.has(field.path[0] ?? "")
    );
  });
  const advancedJoinedPaths = new Set(
    advancedFields.map((field) => field.path.join(".")),
  );
  const primaryFields = fields.filter(
    (field) => !advancedJoinedPaths.has(field.path.join(".")),
  );

  return {
    fields,
    primaryFields,
    advancedFields,
    defaults,
    usesDefaultAdvancedGrouping: !hasCustomFormUi,
  };
}

export function mergeAiVideoStudioFormValues(input: {
  fields: AiVideoStudioFieldDescriptor[];
  defaults: Record<string, unknown>;
  previousValues: Record<string, unknown>;
}) {
  const next: Record<string, unknown> = {};

  for (const field of input.fields) {
    const previousValue = getValueAtPath(input.previousValues, field.path);
    const defaultValue = getValueAtPath(input.defaults, field.path);

    setValueAtPath(
      next,
      field.path,
      isFieldValueSupported(field, previousValue) ? previousValue : defaultValue,
    );
  }

  return next;
}
