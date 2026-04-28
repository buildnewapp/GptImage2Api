"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { Bot, Plus, Send, Settings, Trash2, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ChatRole = "system" | "user" | "assistant";

type ChatModelOption = {
  value: string;
  familyKey: string;
  versionKey: string;
  modelId: string;
  label: string;
};

type RoleDefinition = {
  id: string;
  name: string;
  prompt: string;
};

type LocalMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type ChatSessionSettings = {
  modelValue: string;
  roleId: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: ChatSessionSettings;
  messages: LocalMessage[];
};

type LocalChatStudioStore = {
  activeSessionId: string | null;
  roles: RoleDefinition[];
  sessions: ChatSession[];
};

const STORAGE_KEY = "nexty-ai-chat-studio-v1";
const DEFAULT_CHAT_MEMORY_LIMIT = 30;

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "role-general",
    name: "通用助手",
    prompt: "回答简洁、准确，先给结论再补充必要细节。",
  },
  {
    id: "role-dev",
    name: "开发助手",
    prompt: "优先给出可落地方案，必要时提供代码和排查步骤。",
  },
  {
    id: "role-pm",
    name: "产品经理",
    prompt: "从用户价值、业务目标、实现成本三个角度给建议。",
  },
];

/**
 AI_VIDEO_STUDIO_FAMILIES:
 {
   key: "openai",
   label: "Openai",
   description: "open oooooo",
   icon: "sora",
   tags: [
   { text: "HOT", type: "hot" },
   ],
   selectable: true,
   versions: [
   {
   key: "chatgpt5-4-mini",
   label: "ChatGPT 5.4 mini",
   familyKey: "openai",
   modelId: "chat:gpt-5-4-mini-openrouter",
   },
   {
   key: "deepseek-v4-flash",
   label: "Deepseek v4 flash",
   familyKey: "openai",
   modelId: "chat:deepseek-v4-flash-openrouter",
   },
   ],
 }

 */
function isChatModelVersion(modelId: string | undefined) {
  return typeof modelId === "string" && modelId.startsWith("chat:");
}

const CHAT_MODEL_OPTIONS: ChatModelOption[] = AI_VIDEO_STUDIO_FAMILIES.flatMap(
  (family) => {
    if (family.selectable === false) {
      return [];
    }

    return family.versions
      .filter((version) => isChatModelVersion(version.modelId))
      .map((version) => ({
        value: `${family.key}::${version.key}`,
        familyKey: family.key,
        versionKey: version.key,
        modelId: version.modelId || version.key,
        label: `${family.label} / ${version.label}`,
      }));
  },
);

const DEFAULT_MODEL_VALUE = CHAT_MODEL_OPTIONS[0]?.value ?? "";
const DEFAULT_ROLE_ID = DEFAULT_ROLES[0]?.id ?? "role-general";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getRolePrompt(role: RoleDefinition | null) {
  if (!role) {
    return "";
  }

  return `你需要以“${role.name}”的场景来辅助用户。角色说明：${role.prompt}`;
}

function normalizeMessagesByRole(messages: LocalMessage[], role: RoleDefinition | null) {
  const nonSystem = messages.filter((message) => message.role !== "system");
  const content = getRolePrompt(role).trim();

  if (!content) {
    return nonSystem;
  }

  return [
    {
      id: `system-${role?.id ?? "default"}`,
      role: "system" as const,
      text: content,
    },
    ...nonSystem,
  ];
}

function trimMessagesForRequest(messages: LocalMessage[], memoryLimit: number) {
  const systemMessages = messages.filter((message) => message.role === "system").slice(-1);
  const historyMessages = messages.filter((message) => message.role !== "system");
  const limitedHistory = historyMessages.slice(-memoryLimit);
  return [...systemMessages, ...limitedHistory];
}

function sortSessions(sessions: ChatSession[]) {
  return [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function getTitleFromMessages(messages: LocalMessage[], fallback: string) {
  const firstUser = messages.find(
    (message) => message.role === "user" && message.text.trim().length > 0,
  );

  return firstUser ? firstUser.text.trim().slice(0, 28) : fallback;
}

function createSession(index: number, roleId: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: `新会话 ${index}`,
    createdAt: now,
    updatedAt: now,
    settings: {
      modelValue: DEFAULT_MODEL_VALUE,
      roleId,
      temperature: 0.7,
      topP: 1,
      maxOutputTokens: 1024,
    },
    messages: [],
  };
}

function parseStore(raw: string | null): LocalChatStudioStore | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalChatStudioStore>;

    const roles =
      Array.isArray(parsed.roles) && parsed.roles.length > 0
        ? parsed.roles.filter(
            (role): role is RoleDefinition =>
              Boolean(role) &&
              typeof role.id === "string" &&
              typeof role.name === "string" &&
              typeof role.prompt === "string",
          )
        : DEFAULT_ROLES;

    const parsedSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    if (parsedSessions.length === 0) {
      return null;
    }

    const sessions = parsedSessions
      .filter((session): session is ChatSession => Boolean(session) && typeof session.id === "string")
      .map((session, index) => {
        const base = createSession(index + 1, roles[0]?.id ?? DEFAULT_ROLE_ID);
        const safeMessages = Array.isArray(session.messages)
          ? session.messages.filter(
              (message): message is LocalMessage =>
                Boolean(message) &&
                typeof message.id === "string" &&
                (message.role === "system" ||
                  message.role === "user" ||
                  message.role === "assistant") &&
                typeof message.text === "string",
            )
          : [];

        const modelExists = CHAT_MODEL_OPTIONS.some(
          (option) => option.value === session.settings?.modelValue,
        );

        return {
          ...base,
          ...session,
          settings: {
            ...base.settings,
            ...session.settings,
            modelValue: modelExists
              ? session.settings.modelValue
              : DEFAULT_MODEL_VALUE,
            roleId: roles.some((role) => role.id === session.settings?.roleId)
              ? session.settings.roleId
              : roles[0]?.id ?? DEFAULT_ROLE_ID,
          },
          messages: safeMessages,
        };
      });

    const activeSessionId =
      typeof parsed.activeSessionId === "string" &&
      sessions.some((session) => session.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0].id;

    return {
      activeSessionId,
      roles,
      sessions: sortSessions(sessions),
    };
  } catch {
    return null;
  }
}

function extractTextFromContent(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromContent(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text;
  }

  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  return extractTextFromContent(record.content);
}

function extractChatDelta(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  const record = raw as Record<string, any>;
  const geminiCandidatesText =
    record.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      ?.filter(Boolean)
      ?.join("") || "";
  const geminiDataCandidatesText =
    record.data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      ?.filter(Boolean)
      ?.join("") || "";

  const candidates = [
    record.choices?.[0]?.delta?.content,
    record.data?.choices?.[0]?.delta?.content,
    record.delta?.content,
    record.delta?.text,
    record.content_block?.text,
    record.data?.delta?.text,
    record.data?.content_block?.text,
    geminiCandidatesText,
    geminiDataCandidatesText,
    record.output_text,
    record.text,
  ];

  for (const candidate of candidates) {
    const text = extractTextFromContent(candidate).trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function extractChatText(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  const record = raw as Record<string, any>;
  const geminiCandidatesText =
    record.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      ?.filter(Boolean)
      ?.join("") || "";
  const geminiDataCandidatesText =
    record.data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      ?.filter(Boolean)
      ?.join("") || "";

  const candidates = [
    record.output_text,
    record.data?.output_text,
    record.response?.output_text,
    record.choices?.[0]?.message?.content,
    record.data?.choices?.[0]?.message?.content,
    record.delta?.text,
    record.content_block?.text,
    record.data?.delta?.text,
    record.data?.content_block?.text,
    geminiCandidatesText,
    geminiDataCandidatesText,
    record.message?.content,
    record.content,
    record.output?.[0]?.content,
    record.data?.output?.[0]?.content,
    record.message,
  ];

  for (const candidate of candidates) {
    const text = extractTextFromContent(candidate).trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function parseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || "请求失败";
  }

  if (typeof error === "string") {
    return error;
  }

  return "请求失败";
}

export default function AiChatStudio() {
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [roleEditorId, setRoleEditorId] = useState<string>(DEFAULT_ROLE_ID);

  const rolesRef = useRef<RoleDefinition[]>(roles);
  const sessionsRef = useRef<ChatSession[]>(sessions);
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  rolesRef.current = roles;
  sessionsRef.current = sessions;
  activeSessionIdRef.current = activeSessionId;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const activeRole = useMemo(
    () => roles.find((role) => role.id === activeSession?.settings.roleId) ?? null,
    [roles, activeSession?.settings.roleId],
  );

  const activeModel = useMemo(
    () => CHAT_MODEL_OPTIONS.find((model) => model.value === activeSession?.settings.modelValue) ?? null,
    [activeSession?.settings.modelValue],
  );

  const roleEditor = useMemo(
    () => roles.find((role) => role.id === roleEditorId) ?? null,
    [roles, roleEditorId],
  );

  const visibleMessages = useMemo(
    () => activeSession?.messages.filter((message) => message.role !== "system") ?? [],
    [activeSession?.messages],
  );

  useEffect(() => {
    const local = parseStore(localStorage.getItem(STORAGE_KEY));

    if (local) {
      const normalizedSessions = local.sessions.map((session) => {
        const role = local.roles.find((item) => item.id === session.settings.roleId) ?? null;
        return {
          ...session,
          messages: normalizeMessagesByRole(session.messages, role),
        };
      });

      setRoles(local.roles);
      setRoleEditorId(local.roles[0]?.id ?? DEFAULT_ROLE_ID);
      setSessions(normalizedSessions);
      setActiveSessionId(local.activeSessionId);
    } else {
      const initial = createSession(1, DEFAULT_ROLE_ID);
      const first = {
        ...initial,
        messages: normalizeMessagesByRole(initial.messages, DEFAULT_ROLES[0]),
      };

      setRoles(DEFAULT_ROLES);
      setRoleEditorId(DEFAULT_ROLE_ID);
      setSessions([first]);
      setActiveSessionId(first.id);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeSessionId,
        roles,
        sessions,
      } satisfies LocalChatStudioStore),
    );
  }, [activeSessionId, hydrated, roles, sessions]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages, running, activeSessionId]);

  function updateSessionById(
    sessionId: string,
    updater: (session: ChatSession) => ChatSession,
  ) {
    setSessions((current) => {
      const idx = current.findIndex((item) => item.id === sessionId);
      if (idx < 0) {
        return current;
      }

      const next = [...current];
      const updated = updater(next[idx]);
      next[idx] = {
        ...updated,
        title: getTitleFromMessages(updated.messages, updated.title),
        updatedAt: new Date().toISOString(),
      };

      return sortSessions(next);
    });
  }

  function updateActiveSessionSettings(patch: Partial<ChatSessionSettings>) {
    if (!activeSessionId) {
      return;
    }

    updateSessionById(activeSessionId, (session) => ({
      ...session,
      settings: {
        ...session.settings,
        ...patch,
      },
    }));
  }

  function createNewSession() {
    if (running) {
      toast.error("请等待当前回复完成后再新建会话");
      return;
    }

    const roleId = roles[0]?.id ?? DEFAULT_ROLE_ID;
    const created = createSession(sessions.length + 1, roleId);
    const role = roles.find((item) => item.id === roleId) ?? null;
    const nextSession = {
      ...created,
      messages: normalizeMessagesByRole(created.messages, role),
    };

    setSessions((current) => [nextSession, ...current]);
    setActiveSessionId(nextSession.id);
    setInput("");
  }

  function switchSession(sessionId: string) {
    if (running) {
      toast.error("请等待当前回复完成后再切换会话");
      return;
    }

    setActiveSessionId(sessionId);
    setInput("");
  }

  function deleteSession(sessionId: string) {
    if (running) {
      toast.error("请等待当前回复完成后再删除会话");
      return;
    }

    const remaining = sessions.filter((session) => session.id !== sessionId);

    if (remaining.length === 0) {
      const roleId = roles[0]?.id ?? DEFAULT_ROLE_ID;
      const fresh = createSession(1, roleId);
      const role = roles.find((item) => item.id === roleId) ?? null;
      const nextFresh = {
        ...fresh,
        messages: normalizeMessagesByRole(fresh.messages, role),
      };

      setSessions([nextFresh]);
      setActiveSessionId(nextFresh.id);
      setInput("");
      return;
    }

    const sorted = sortSessions(remaining);
    const nextActive =
      activeSessionId === sessionId
        ? sorted[0]
        : sorted.find((session) => session.id === activeSessionId) ?? sorted[0];

    setSessions(sorted);
    setActiveSessionId(nextActive.id);
    setInput("");
  }

  function clearSessionList() {
    if (running) {
      toast.error("请等待当前回复完成后再清空列表");
      return;
    }

    const roleId = roles[0]?.id ?? DEFAULT_ROLE_ID;
    const fresh = createSession(1, roleId);
    const role = roles.find((item) => item.id === roleId) ?? null;
    const nextFresh = {
      ...fresh,
      messages: normalizeMessagesByRole(fresh.messages, role),
    };

    setSessions([nextFresh]);
    setActiveSessionId(nextFresh.id);
    setInput("");
  }

  function clearCurrentMessages() {
    if (running || !activeSessionId || !activeSession) {
      return;
    }

    const role = roles.find((item) => item.id === activeSession.settings.roleId) ?? null;
    updateSessionById(activeSessionId, (session) => ({
      ...session,
      messages: normalizeMessagesByRole([], role),
    }));
    setInput("");
  }

  function deleteMessage(messageId: string) {
    if (running || !activeSessionId) {
      return;
    }

    updateSessionById(activeSessionId, (session) => {
      const role = rolesRef.current.find((item) => item.id === session.settings.roleId) ?? null;
      const next = session.messages.filter((message) => message.id !== messageId);
      return {
        ...session,
        messages: normalizeMessagesByRole(next, role),
      };
    });
  }

  function addRole() {
    const role: RoleDefinition = {
      id: `role-${createId()}`,
      name: "新角色",
      prompt: "请根据这个角色给出更贴合场景的回复。",
    };

    setRoles((current) => [...current, role]);
    setRoleEditorId(role.id);
  }

  function updateRole(roleId: string, patch: Partial<RoleDefinition>) {
    const nextRoles = rolesRef.current.map((role) =>
      role.id === roleId
        ? {
            ...role,
            ...patch,
          }
        : role,
    );

    setRoles(nextRoles);
    rolesRef.current = nextRoles;

    setSessions((current) =>
      current.map((session) => {
        if (session.settings.roleId !== roleId) {
          return session;
        }

        const role = nextRoles.find((item) => item.id === roleId) ?? null;
        return {
          ...session,
          messages: normalizeMessagesByRole(session.messages, role),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  function applyRoleToActiveSession(roleId: string) {
    if (!activeSessionId) {
      return;
    }

    const role = rolesRef.current.find((item) => item.id === roleId) ?? null;

    updateSessionById(activeSessionId, (session) => ({
      ...session,
      settings: {
        ...session.settings,
        roleId,
      },
      messages: normalizeMessagesByRole(session.messages, role),
    }));
  }

  function deleteRole(roleId: string) {
    if (roles.length <= 1) {
      toast.error("至少保留一个角色");
      return;
    }

    const fallbackRole = roles.find((role) => role.id !== roleId);
    if (!fallbackRole) {
      return;
    }

    const nextRoles = roles.filter((role) => role.id !== roleId);
    setRoles(nextRoles);
    rolesRef.current = nextRoles;
    setRoleEditorId(fallbackRole.id);

    setSessions((current) =>
      current.map((session) => {
        if (session.settings.roleId !== roleId) {
          return session;
        }

        return {
          ...session,
          settings: {
            ...session.settings,
            roleId: fallbackRole.id,
          },
          messages: normalizeMessagesByRole(session.messages, fallbackRole),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeSession || !activeSessionId) {
      return;
    }

    const selectedModel = CHAT_MODEL_OPTIONS.find(
      (item) => item.value === activeSession.settings.modelValue,
    );

    if (!selectedModel?.modelId) {
      toast.error("当前模型配置无效，请在设置里重新选择");
      return;
    }

    const role = rolesRef.current.find(
      (item) => item.id === activeSession.settings.roleId,
    ) ?? null;

    const existing = activeSession.messages.filter(
      (message) => !(message.role === "assistant" && message.text.trim() === ""),
    );
    const normalized = normalizeMessagesByRole(existing, role);

    const userMessage: LocalMessage = {
      id: createId(),
      role: "user",
      text,
    };
    const assistantId = createId();

    const contextMessages = trimMessagesForRequest(
      [...normalized, userMessage],
      DEFAULT_CHAT_MEMORY_LIMIT,
    );

    const requestMessages = contextMessages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    updateSessionById(activeSessionId, (session) => ({
      ...session,
      messages: [
        ...normalized,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          text: "",
        },
      ],
    }));

    setInput("");
    setRunning(true);

    const applyAssistantText = (value: string) => {
      updateSessionById(activeSessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: value,
              }
            : message,
        ),
      }));
    };

    try {
      const response = await fetch("/api/ai-studio/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: selectedModel.modelId,
          stream: true,
          messages: requestMessages,
          temperature: activeSession.settings.temperature,
          top_p: activeSession.settings.topP,
          max_tokens: activeSession.settings.maxOutputTokens,
        }),
      });

      if (!response.ok) {
        const failedText = await response.text();
        try {
          const failedJson = JSON.parse(failedText);
          throw new Error(failedJson?.error || "聊天请求失败");
        } catch {
          throw new Error(failedText || "聊天请求失败");
        }
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let fullText = "";
        let done = false;

        while (!done) {
          const { value, done: readDone } = await reader.read();
          if (readDone) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) {
              continue;
            }

            const data = line.slice(5).trim();
            if (!data) {
              continue;
            }
            if (data === "[DONE]") {
              done = true;
              break;
            }

            try {
              const chunk = JSON.parse(data);
              const delta = extractChatDelta(chunk);
              if (!delta) {
                continue;
              }

              if (delta.startsWith(fullText)) {
                fullText = delta;
              } else if (!fullText.startsWith(delta)) {
                fullText += delta;
              }

              applyAssistantText(fullText);
            } catch {
              // ignore parse errors for partial chunk
            }
          }
        }

        if (!fullText.trim()) {
          applyAssistantText("(空回复)");
        }
      } else {
        const rawText = await response.text();
        let finalText = rawText;

        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(rawText);
            finalText = extractChatText(parsed) || rawText;
          } catch {
            finalText = rawText;
          }
        }

        applyAssistantText(finalText.trim() || "(空回复)");
      }
    } catch (error) {
      const message = parseErrorMessage(error);
      applyAssistantText(`[请求失败] ${message}`);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  if (CHAT_MODEL_OPTIONS.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          `AI_VIDEO_STUDIO_FAMILIES` 暂无可用模型。
        </CardContent>
      </Card>
    );
  }

  if (!hydrated || !activeSession) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">正在加载聊天数据...</CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[680px] overflow-hidden rounded-xl border bg-background">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex h-full flex-col border-r bg-muted/30">
          <div className="p-3">
            <Button className="w-full justify-start gap-2" onClick={createNewSession}>
              <Plus className="h-4 w-4" />
              新建会话
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-auto px-3 pb-3">
            {sessions.map((session) => {
              const selected = session.id === activeSessionId;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => switchSession(session.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-medium">{session.title}</div>
                    <Trash2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSession(session.id);
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {session.messages.filter((item) => item.role !== "system").length} 条消息
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t p-3">
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={roleManagerOpen} onOpenChange={setRoleManagerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    角色管理
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>角色管理</DialogTitle>
                    <DialogDescription>角色会影响所有使用该角色的会话。</DialogDescription>
                  </DialogHeader>

                  <div className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium">角色列表</div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={addRole}>
                          新增角色
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => deleteRole(roleEditorId)}
                          disabled={roles.length <= 1}
                        >
                          删除角色
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>编辑角色</Label>
                        <Select value={roleEditorId} onValueChange={setRoleEditorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择要编辑的角色" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>角色名称</Label>
                        <Input
                          value={roleEditor?.name ?? ""}
                          onChange={(event) => {
                            if (!roleEditor) return;
                            updateRole(roleEditor.id, { name: event.target.value });
                          }}
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>角色提示词</Label>
                        <Textarea
                          rows={4}
                          value={roleEditor?.prompt ?? ""}
                          onChange={(event) => {
                            if (!roleEditor) return;
                            updateRole(roleEditor.id, { prompt: event.target.value });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" className="w-full" onClick={clearSessionList}>
                清空会话列表
              </Button>
            </div>
          </div>
        </aside>

        <section className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-sm font-medium">{activeSession.title}</div>
              <div className="text-xs text-muted-foreground">{activeModel?.label ?? "未选择模型"}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearCurrentMessages} disabled={running}>
                清空消息
              </Button>

              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Settings className="h-4 w-4" />
                    设置
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>聊天设置</DialogTitle>
                    <DialogDescription>
                      会话角色、模型和参数只影响当前会话。
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label>会话角色</Label>
                        <Select
                          value={activeSession.settings.roleId}
                          onValueChange={(value) => applyRoleToActiveSession(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择会话角色" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>模型</Label>
                        <Select
                          value={activeSession.settings.modelValue}
                          onValueChange={(value) => updateActiveSessionSettings({ modelValue: value })}
                          disabled={running}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {CHAT_MODEL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Temperature</Label>
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={activeSession.settings.temperature}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value)) {
                              updateActiveSessionSettings({ temperature: value });
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Top P</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={activeSession.settings.topP}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value)) {
                              updateActiveSessionSettings({ topP: value });
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>最大输出 Token</Label>
                        <Input
                          type="number"
                          min={1}
                          max={8192}
                          step={1}
                          value={activeSession.settings.maxOutputTokens}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isInteger(value) && value > 0) {
                              updateActiveSessionSettings({ maxOutputTokens: value });
                            }
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 py-6">
            <div className="mx-auto w-full max-w-3xl space-y-5">
              {visibleMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  开始一个新对话吧。
                </div>
              ) : (
                visibleMessages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[88%] ${isUser ? "order-2" : "order-1"}`}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {isUser ? (
                            <User className="h-3.5 w-3.5" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                          {isUser ? "你" : "助手"}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                            isUser
                              ? "bg-primary text-primary-foreground"
                              : "border bg-background"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{message.text}</div>
                        </div>

                        <div className="mt-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 transition group-hover:opacity-100"
                            onClick={() => deleteMessage(message.id)}
                            disabled={running}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <div className="mx-auto w-full max-w-3xl space-y-2">
              <Textarea
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                disabled={running}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  角色：{activeRole?.name ?? "未设置"} | 状态：{running ? "生成中" : "就绪"}
                </div>
                <Button
                  onClick={() => void handleSend()}
                  disabled={running || input.trim().length === 0}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
