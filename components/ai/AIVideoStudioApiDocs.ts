export type AiVideoStudioApiFieldDoc = {
  key: string;
  title: string;
  description: string;
  meta: string;
};

type AiVideoStudioApiFieldDocCopy = {
  required: string;
  type: string;
  enum: string;
  range: string;
  minimum: string;
  maximum: string;
};

function getInputSchema(detail: {
  requestSchema?: Record<string, any> | null;
}) {
  const inputSchema = detail.requestSchema?.properties?.input;

  if (
    inputSchema &&
    typeof inputSchema === "object" &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    return inputSchema as Record<string, any>;
  }

  return null;
}

function getOrderedFieldKeys(schema: Record<string, any>) {
  const properties = (schema.properties ?? {}) as Record<string, Record<string, any>>;
  const ordered = Array.isArray(schema["x-apidog-orders"])
    ? schema["x-apidog-orders"].filter(
        (key: unknown): key is string => typeof key === "string" && key in properties,
      )
    : [];
  const seen = new Set(ordered);

  for (const key of Object.keys(properties)) {
    if (!seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  return ordered;
}

export function collectApiFieldDocs(input: {
  requestSchema?: Record<string, any> | null;
  copy: AiVideoStudioApiFieldDocCopy;
}): AiVideoStudioApiFieldDoc[] {
  const schema = getInputSchema(input);

  if (!schema) {
    return [];
  }

  const properties = (schema.properties ?? {}) as Record<string, Record<string, any>>;
  const requiredFields = new Set<string>(
    Array.isArray(schema.required)
      ? schema.required.filter((key: unknown): key is string => typeof key === "string")
      : [],
  );

  return getOrderedFieldKeys(schema).map((key) => {
    const field = properties[key] ?? {};
    const meta: string[] = [];

    if (requiredFields.has(key)) {
      meta.push(input.copy.required);
    }

    if (typeof field.type === "string" && field.type) {
      meta.push(`${input.copy.type}: ${field.type}`);
    }

    if (Array.isArray(field.enum) && field.enum.length > 0) {
      meta.push(`${input.copy.enum}: ${field.enum.map(String).join(", ")}`);
    }

    const hasMinimum = typeof field.minimum === "number";
    const hasMaximum = typeof field.maximum === "number";

    if (hasMinimum && hasMaximum) {
      meta.push(`${input.copy.range}: ${field.minimum} - ${field.maximum}`);
    } else if (hasMinimum) {
      meta.push(`${input.copy.minimum}: ${field.minimum}`);
    } else if (hasMaximum) {
      meta.push(`${input.copy.maximum}: ${field.maximum}`);
    }

    return {
      key,
      title: key,
      description:
        typeof field.description === "string" ? field.description : "",
      meta: meta.join(" · "),
    };
  });
}
