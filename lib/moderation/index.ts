type ModerationProvider = "none" | "creem";
type CreemModerationDecision = "allow" | "flag" | "deny";

const MODERATION_TIMEOUT_MS = 5000;

const PROMPT_KEYS = new Set([
  "prompt",
  "textprompt",
  "prompttext",
  "imageprompt",
  "videoprompt",
  "userprompt",
  "caption",
  "description",
]);

function normalizeFieldName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isPromptFieldName(input: string) {
  const normalized = normalizeFieldName(input);

  if (PROMPT_KEYS.has(normalized)) {
    return true;
  }

  if (normalized.includes("prompt") && !normalized.includes("negative")) {
    return true;
  }

  return false;
}

function collectPrompts(value: unknown, fieldName: string | null, results: string[]) {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return;
    }

    if (fieldName && isPromptFieldName(fieldName)) {
      results.push(text);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPrompts(item, fieldName, results);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    collectPrompts(nestedValue, key, results);
  }
}

export function extractGenerationPrompt(payload: Record<string, unknown>) {
  const prompts: string[] = [];
  collectPrompts(payload, null, prompts);

  if (prompts.length === 0) {
    return null;
  }

  const uniquePrompts = [...new Set(prompts)];
  return uniquePrompts.join("\n\n");
}

function resolveModerationProvider(): ModerationProvider | string {
  const provider = (process.env.MODERATION ?? "none").trim().toLowerCase();
  if (!provider || provider === "none") {
    return "none";
  }
  if (provider === "creem") {
    return "creem";
  }
  return provider;
}

type ModerateWithCreemInput = {
  prompt: string;
  externalId?: string;
};

type CreemModerationResponse = {
  id: string;
  object: string;
  prompt: string;
  external_id?: string;
  decision: CreemModerationDecision;
  usage?: {
    units?: number;
  };
};

async function moderateWithCreem(input: ModerateWithCreemInput) {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error("CREEM_API_KEY is not configured for moderation."),
      { status: 500 },
    );
  }

  const baseUrl = (process.env.CREEM_API_BASE_URL ?? "https://api.creem.io/v1").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/moderation/prompt`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      external_id: input.externalId,
    }),
    signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw Object.assign(
      new Error(`Moderation service unavailable (${response.status}).`),
      { status: 503 },
    );
  }

  const data = (await response.json()) as Partial<CreemModerationResponse>;
  console.log('creem moderation', input.prompt, data)
  const decision = data.decision;
  if (decision !== "allow" && decision !== "flag" && decision !== "deny") {
    throw Object.assign(
      new Error("Moderation returned an invalid decision."),
      { status: 503 },
    );
  }

  return {
    decision,
    id: typeof data.id === "string" ? data.id : null,
  };
}

type AssertGenerationModerationInput = {
  category: string;
  payload: Record<string, unknown>;
  requestModeration?: string | null;
  externalId?: string;
};

export async function assertGenerationPromptAllowed(input: AssertGenerationModerationInput) {
  if (input.category !== "image" && input.category !== "video") {
    return;
  }

  if (input.requestModeration?.toLowerCase() === "none") {
    return;
  }

  const provider = resolveModerationProvider();
  if (provider === "none") {
    return;
  }

  if (provider !== "creem") {
    throw Object.assign(
      new Error(`Unsupported moderation provider: ${provider}`),
      { status: 500 },
    );
  }

  const prompt = extractGenerationPrompt(input.payload);
  if (!prompt) {
    throw Object.assign(
      new Error("Prompt is required for moderation."),
      { status: 400 },
    );
  }

  let result: { decision: CreemModerationDecision; id: string | null };
  try {
    result = await moderateWithCreem({
      prompt,
      externalId: input.externalId,
    });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    throw Object.assign(
      new Error(
        status === 503
          ? "Moderation is temporarily unavailable. Please retry."
          : (error?.message ?? "Moderation failed."),
      ),
      { status },
    );
  }

  if (result.decision === "allow") {
    return;
  }

  throw Object.assign(
    new Error("Your prompt could not be processed. Please revise and try again."),
    { status: 400 },
  );
}
