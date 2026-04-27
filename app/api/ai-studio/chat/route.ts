import { getCachedAiStudioCatalogDetail } from "@/lib/ai-studio/catalog";
import {
  getAiStudioApiBaseUrl,
  getAiStudioApiKey,
} from "@/lib/ai-studio/execute";
import {
  canAccessAiStudioModel,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import {
  creditLogs,
  usage,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const CHAT_BILLING_INPUT_USD_PER_M = 5;
const CHAT_BILLING_OUTPUT_USD_PER_M = 25;
const CREDIT_USD = 0.01;
const MIN_CHAT_CREDITS = 0.1;

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([z.string(), z.array(z.any())]),
});

const inputSchema = z.object({
  modelId: z.string().min(1),
  model: z.string().optional(),
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional().default(true),
}).passthrough();

type UsageStats = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type BillingStats = UsageStats & {
  costUsd: number;
  credits: number;
};

type ChatCreditSettlement = {
  billedCredits: number;
  chargedCredits: number;
  availableCredits: number;
};

function normalizeMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const block = part as Record<string, unknown>;
      if (typeof block.text === "string") {
        return block.text;
      }
      if (
        block.type === "image_url" &&
        block.image_url &&
        typeof block.image_url === "object"
      ) {
        const imageUrl = (block.image_url as Record<string, unknown>).url;
        if (typeof imageUrl === "string" && imageUrl) {
          return `[image] ${imageUrl}`;
        }
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function toResponsesInput(messages: Array<{ role: string; content: unknown }>) {
  return messages.map((message) => {
    const text = normalizeMessageText(message.content);
    if (text) {
      return {
        role: message.role,
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

function toClaudeBody(input: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  stream: boolean;
  rest: Record<string, unknown>;
  defaultMaxTokens?: number;
}) {
  const systemText = input.messages
    .filter((message) => message.role === "system")
    .map((message) => normalizeMessageText(message.content))
    .filter(Boolean)
    .join("\n\n");

  const messages = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: normalizeMessageText(message.content),
    }))
    .filter((message) => message.content.length > 0);

  return {
    ...input.rest,
    model: input.model,
    messages,
    stream: input.stream,
    max_tokens:
      input.rest.max_tokens ?? input.defaultMaxTokens ?? 4096,
    ...(systemText ? { system: systemText } : {}),
  };
}

function toGeminiContents(messages: Array<{ role: string; content: unknown }>) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      const text = normalizeMessageText(message.content);
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter((message) => message.parts[0].text.length > 0);
}

function toGeminiBody(input: {
  messages: Array<{ role: string; content: unknown }>;
  stream: boolean;
  rest: Record<string, unknown>;
}) {
  const systemText = input.messages
    .filter((message) => message.role === "system")
    .map((message) => normalizeMessageText(message.content))
    .filter(Boolean)
    .join("\n\n");

  const contents = toGeminiContents(input.messages);
  return {
    ...input.rest,
    stream: input.stream,
    contents: contents.length > 0
      ? contents
      : [{ role: "user", parts: [{ text: "Hello" }] }],
    ...(systemText
      ? {
          systemInstruction: {
            parts: [{ text: systemText }],
          },
        }
      : {}),
  };
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeUsageStats(raw: Record<string, any> | undefined | null): UsageStats | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const inputTokens =
    parseNumber(raw.prompt_tokens) ||
    parseNumber(raw.input_tokens) ||
    parseNumber(raw.promptTokenCount) ||
    parseNumber(raw.inputTokenCount);

  const outputTokens =
    parseNumber(raw.completion_tokens) ||
    parseNumber(raw.output_tokens) ||
    parseNumber(raw.candidatesTokenCount) ||
    parseNumber(raw.outputTokenCount);

  const totalTokens =
    parseNumber(raw.total_tokens) ||
    parseNumber(raw.totalTokenCount) ||
    parseNumber(raw.totalTokens) ||
    (inputTokens + outputTokens);

  if (inputTokens <= 0 && outputTokens <= 0 && totalTokens <= 0) {
    return null;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function extractUsageStats(raw: unknown): UsageStats | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, any>;
  const candidates = [
    record.usage,
    record.usageMetadata,
    record.data?.usage,
    record.data?.usageMetadata,
    record.response?.usage,
    record.message?.usage,
    record.x_groq?.usage,
  ];

  for (const usage of candidates) {
    const normalized = normalizeUsageStats(usage);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function computeBillingFromUsage(usageStats: UsageStats): BillingStats {
  const inputCostUsd =
    (usageStats.inputTokens / 1_000_000) * CHAT_BILLING_INPUT_USD_PER_M;
  const outputCostUsd =
    (usageStats.outputTokens / 1_000_000) * CHAT_BILLING_OUTPUT_USD_PER_M;
  const costUsd = inputCostUsd + outputCostUsd;
  const rawCredits = costUsd / CREDIT_USD;
  const credits = Math.max(
    MIN_CHAT_CREDITS,
    Math.ceil(rawCredits * 10) / 10,
  );

  return {
    ...usageStats,
    costUsd: Number(costUsd.toFixed(6)),
    credits: Number(credits.toFixed(1)),
  };
}

function buildCreditNotes(input: {
  modelId: string;
  resolvedModel: string;
  billing: BillingStats;
  settlement: ChatCreditSettlement;
}) {
  return JSON.stringify({
    source: "ai_studio_chat",
    modelId: input.modelId,
    model: input.resolvedModel,
    inputTokens: input.billing.inputTokens,
    outputTokens: input.billing.outputTokens,
    totalTokens: input.billing.totalTokens,
    costUsd: input.billing.costUsd,
    billedCredits: input.settlement.billedCredits,
    chargedCredits: input.settlement.chargedCredits,
  });
}

async function assertChatCreditsAvailable(userId: string) {
  const usageRows = await getDb()
    .select({
      oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
      subscriptionCreditsBalance: usage.subscriptionCreditsBalance,
    })
    .from(usage)
    .where(eq(usage.userId, userId))
    .limit(1);

  const usageRecord = usageRows[0];
  if (!usageRecord) {
    throw Object.assign(new Error("Insufficient credits."), { status: 402 });
  }

  const totalCredits =
    usageRecord.oneTimeCreditsBalance + usageRecord.subscriptionCreditsBalance;

  if (totalCredits <= 0) {
    throw Object.assign(
      new Error("Insufficient credits. Chat requires available credits greater than 0."),
      { status: 402 },
    );
  }
}

async function settleChatBillingCredits(input: {
  userId: string;
  modelId: string;
  resolvedModel: string;
  billing: BillingStats;
}) {
  const billedCredits = input.billing.credits;
  const chargedCredits = Math.max(1, Math.ceil(billedCredits));

  const settlement = await getDb().transaction(async (tx) => {
    const usageRows = await tx
      .select({
        oneTimeCreditsBalance: usage.oneTimeCreditsBalance,
        subscriptionCreditsBalance: usage.subscriptionCreditsBalance,
      })
      .from(usage)
      .where(eq(usage.userId, input.userId))
      .for("update");

    const usageRecord = usageRows[0];
    if (!usageRecord) {
      throw Object.assign(new Error("Insufficient credits."), { status: 402 });
    }

    const totalCredits =
      usageRecord.oneTimeCreditsBalance + usageRecord.subscriptionCreditsBalance;
    if (totalCredits < chargedCredits) {
      throw Object.assign(new Error("Insufficient credits."), { status: 402 });
    }

    const chargedFromSubscription = Math.min(
      usageRecord.subscriptionCreditsBalance,
      chargedCredits,
    );
    const chargedFromOneTime = chargedCredits - chargedFromSubscription;

    const nextSubscriptionBalance =
      usageRecord.subscriptionCreditsBalance - chargedFromSubscription;
    const nextOneTimeBalance =
      usageRecord.oneTimeCreditsBalance - chargedFromOneTime;

    await tx
      .update(usage)
      .set({
        subscriptionCreditsBalance: nextSubscriptionBalance,
        oneTimeCreditsBalance: nextOneTimeBalance,
      })
      .where(eq(usage.userId, input.userId));

    const availableCredits = nextOneTimeBalance + nextSubscriptionBalance;

    const settlementData: ChatCreditSettlement = {
      billedCredits: Number(billedCredits.toFixed(1)),
      chargedCredits,
      availableCredits,
    };

    if (chargedCredits > 0) {
      await tx.insert(creditLogs).values({
        userId: input.userId,
        amount: -chargedCredits,
        oneTimeCreditsSnapshot: nextOneTimeBalance,
        subscriptionCreditsSnapshot: nextSubscriptionBalance,
        type: "ai_studio_chat_usage",
        notes: buildCreditNotes({
          modelId: input.modelId,
          resolvedModel: input.resolvedModel,
          billing: input.billing,
          settlement: settlementData,
        }),
      });
    }

    return settlementData;
  });

  return settlement;
}

async function buildBillingPayload(input: {
  userId: string;
  modelId: string;
  resolvedModel: string;
  usageStats: UsageStats;
  shouldSettle: boolean;
}) {
  const billing = computeBillingFromUsage(input.usageStats);

  if (!input.shouldSettle) {
    return {
      type: "billing",
      ...billing,
    };
  }

  try {
    const settlement = await settleChatBillingCredits({
      userId: input.userId,
      modelId: input.modelId,
      resolvedModel: input.resolvedModel,
      billing,
    });

    return {
      type: "billing",
      ...billing,
      settlement,
    };
  } catch (error: any) {
    return {
      type: "billing",
      ...billing,
      settlementError: error?.message || "Failed to settle chat credits",
    };
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    await assertChatCreditsAvailable(user.id);

    const body = inputSchema.parse(await request.json());
    const detail = await getCachedAiStudioCatalogDetail(body.modelId);
    if (!detail) {
      return apiResponse.notFound("Model not found");
    }
    if (detail.category !== "chat") {
      return apiResponse.badRequest("Selected model is not a chat model.");
    }

    const policy = await loadAiStudioPolicyConfig();
    if (!canAccessAiStudioModel(detail, { role: user.role, config: policy })) {
      return apiResponse.forbidden("This model is unavailable for your account.");
    }

    const {
      modelId: _modelId,
      model,
      messages,
      stream,
      ...rest
    } = body;

    const resolvedModel = model || detail.modelKeys[0];
    if (!resolvedModel) {
      return apiResponse.badRequest("Model runtime id is missing.");
    }

    const isResponsesApi = detail.endpoint.includes("/responses");
    const isClaudeApi = detail.endpoint.includes("/claude/");
    const isGeminiNativeApi =
      detail.endpoint.includes("/gemini/v1/models/") ||
      detail.endpoint.includes(":streamGenerateContent") ||
      detail.endpoint.includes(":generateContent");

    const requestBody = isResponsesApi
      ? {
          ...rest,
          model: resolvedModel,
          input: toResponsesInput(messages),
          stream,
        }
      : isClaudeApi
        ? toClaudeBody({
            model: resolvedModel,
            messages,
            stream,
            rest,
            defaultMaxTokens:
              typeof detail.examplePayload?.max_tokens === "number"
                ? detail.examplePayload.max_tokens
                : undefined,
          })
        : isGeminiNativeApi
          ? toGeminiBody({
              messages,
              stream,
              rest,
            })
          : {
          ...rest,
          model: resolvedModel,
          messages,
          stream,
          ...(stream
            ? {
                stream_options: {
                  include_usage: true,
                },
              }
            : {}),
        };

    const upstream = await fetch(
      `${getAiStudioApiBaseUrl(detail.vendor ?? "kie")}${detail.endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAiStudioApiKey(detail.vendor ?? "kie")}`,
          "Content-Type": "application/json",
          Accept: stream ? "text/event-stream" : "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    const contentType = upstream.headers.get("content-type") ?? "";
    const isStream = stream && contentType.includes("text/event-stream");

    if (isStream && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let buffer = "";
      let latestUsage: UsageStats | null = null;

      const transformed = upstream.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            const text = decoder.decode(chunk, { stream: true });
            buffer += text;

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            const output: string[] = [];
            for (const rawLine of lines) {
              output.push(rawLine);

              const line = rawLine.trim();
              if (!line.startsWith("data:")) {
                continue;
              }

              const data = line.slice(5).trim();
              if (!data || data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const usageStats = extractUsageStats(parsed);
                if (usageStats) {
                  latestUsage = usageStats;
                }
              } catch {
                // Ignore malformed chunks.
              }
            }

            if (output.length > 0) {
              controller.enqueue(encoder.encode(`${output.join("\n")}\n`));
            }
          },
          async flush(controller) {
            if (buffer) {
              controller.enqueue(encoder.encode(buffer));
            }

            if (latestUsage) {
              const billingPayload = await buildBillingPayload({
                userId: user.id,
                modelId: detail.id,
                resolvedModel,
                usageStats: latestUsage,
                shouldSettle: upstream.ok,
              });

              controller.enqueue(
                encoder.encode(
                  `event: billing\ndata: ${JSON.stringify(billingPayload)}\n\n`,
                ),
              );
            }
          },
        }),
      );

      return new Response(transformed, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const rawText = await upstream.text();
    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawText) as Record<string, any>;
        const usageStats = extractUsageStats(parsed);
        if (usageStats) {
          parsed.billing = await buildBillingPayload({
            userId: user.id,
            modelId: detail.id,
            resolvedModel,
            usageStats,
            shouldSettle: upstream.ok,
          });
        }
        return new Response(JSON.stringify(parsed), {
          status: upstream.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      } catch {
        // Fallthrough to raw text response.
      }
    }

    return new Response(rawText, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType || "application/json; charset=utf-8",
      },
    });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    return apiResponse.error(
      error?.message || "Failed to execute chat request",
      status,
    );
  }
}
