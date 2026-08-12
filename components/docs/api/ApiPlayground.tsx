"use client";

import CopyButton from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CircleStop,
  Clock3,
  KeyRound,
  Loader2,
  Play,
  RotateCcw,
  TerminalSquare,
} from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

type ApiPlaygroundMethod = "GET" | "POST";

type ApiPlaygroundProps = {
  locale: string;
  method: ApiPlaygroundMethod;
  initialPath: string;
  initialBody?: string;
  consumesCredits?: boolean;
};

type PlaygroundResult = {
  body: string;
  duration: number;
  ok: boolean;
  status: number;
  statusText: string;
};

const PLAYGROUND_COPY = {
  en: {
    title: "API playground",
    description:
      "Send a real request to this site and inspect the HTTP response immediately.",
    endpoint: "Endpoint",
    endpointHint: "Only same-origin /api/* paths are allowed.",
    apiKey: "API Key (optional)",
    apiKeyPlaceholder: "sk_...",
    apiKeyHint:
      "Leave blank to use your current signed-in browser session. The key is never saved.",
    requestBody: "JSON request body",
    send: "Send request",
    sending: "Sending...",
    cancel: "Cancel",
    reset: "Reset",
    response: "Response",
    noResponse: "Send a request to view its response here.",
    copy: "Copy",
    copied: "Copied",
    invalidPath: "Enter a same-origin path beginning with /api/.",
    replacePlaceholder:
      "Replace every path placeholder, such as {taskId}, before sending.",
    invalidJson: "The request body must be valid JSON.",
    requestFailed: "The request could not be completed.",
    cancelled: "Request cancelled.",
    emptyResponse: "(empty response)",
    creditWarning:
      "This is a real generation request and may reserve or consume account credits.",
  },
  zh: {
    title: "API Playground",
    description: "直接向当前站点发送真实请求，并立即查看 HTTP 响应。",
    endpoint: "接口地址",
    endpointHint: "仅允许调用当前站点的 /api/* 路径。",
    apiKey: "API Key（可选）",
    apiKeyPlaceholder: "sk_...",
    apiKeyHint:
      "留空时使用当前浏览器登录会话；填写后使用 Bearer Key。Key 不会被保存。",
    requestBody: "JSON 请求体",
    send: "发送请求",
    sending: "正在请求...",
    cancel: "取消",
    reset: "重置",
    response: "响应结果",
    noResponse: "发送请求后，响应内容会显示在这里。",
    copy: "复制",
    copied: "已复制",
    invalidPath: "请输入以 /api/ 开头的当前站点接口路径。",
    replacePlaceholder: "发送前请替换 {taskId} 等所有路径占位符。",
    invalidJson: "请求体必须是有效的 JSON。",
    requestFailed: "请求未能完成。",
    cancelled: "请求已取消。",
    emptyResponse: "（空响应）",
    creditWarning: "这是真实的生成请求，可能会预留或消耗账户积分。",
  },
  ja: {
    title: "API Playground",
    description:
      "このサイトへ実際のリクエストを送信し、HTTP レスポンスを確認できます。",
    endpoint: "エンドポイント",
    endpointHint: "同一サイトの /api/* パスのみ呼び出せます。",
    apiKey: "API Key（任意）",
    apiKeyPlaceholder: "sk_...",
    apiKeyHint:
      "空欄の場合は現在のブラウザーセッションを使用します。Key は保存されません。",
    requestBody: "JSON リクエストボディ",
    send: "リクエスト送信",
    sending: "送信中...",
    cancel: "キャンセル",
    reset: "リセット",
    response: "レスポンス",
    noResponse: "リクエストを送信すると、ここにレスポンスが表示されます。",
    copy: "コピー",
    copied: "コピーしました",
    invalidPath: "/api/ で始まる同一サイトのパスを入力してください。",
    replacePlaceholder:
      "送信前に {taskId} などのパス変数をすべて置き換えてください。",
    invalidJson: "リクエストボディは有効な JSON である必要があります。",
    requestFailed: "リクエストを完了できませんでした。",
    cancelled: "リクエストをキャンセルしました。",
    emptyResponse: "（空のレスポンス）",
    creditWarning:
      "これは実際の生成リクエストです。アカウントのクレジットを消費する場合があります。",
  },
} as const;

function getCopy(locale: string) {
  return locale === "zh"
    ? PLAYGROUND_COPY.zh
    : locale === "ja"
      ? PLAYGROUND_COPY.ja
      : PLAYGROUND_COPY.en;
}

function formatResponseBody(value: string, emptyLabel: string) {
  if (!value) return emptyLabel;

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function ApiPlayground({
  locale,
  method,
  initialPath,
  initialBody = "",
  consumesCredits = false,
}: ApiPlaygroundProps) {
  const copy = getCopy(locale);
  const endpointId = useId();
  const apiKeyId = useId();
  const bodyId = useId();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [endpoint, setEndpoint] = useState(initialPath);
  const [apiKey, setApiKey] = useState("");
  const [requestBody, setRequestBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaygroundResult | null>(null);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    let requestPath: string;
    try {
      const url = new URL(endpoint.trim(), window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !url.pathname.startsWith("/api/")
      ) {
        throw new Error(copy.invalidPath);
      }
      if (/[{}]/.test(url.pathname)) {
        throw new Error(copy.replacePlaceholder);
      }
      requestPath = `${url.pathname}${url.search}`;
    } catch (pathError) {
      setError(
        pathError instanceof Error ? pathError.message : copy.invalidPath,
      );
      return;
    }

    let normalizedBody: string | undefined;
    if (method === "POST") {
      try {
        normalizedBody = JSON.stringify(JSON.parse(requestBody));
      } catch {
        setError(copy.invalidJson);
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    const startedAt = performance.now();

    try {
      const headers = new Headers({ Accept: "application/json" });
      if (apiKey.trim()) {
        headers.set("Authorization", `Bearer ${apiKey.trim()}`);
      }
      if (normalizedBody !== undefined) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(requestPath, {
        method,
        headers,
        body: normalizedBody,
        credentials: "same-origin",
        signal: controller.signal,
      });
      const responseText = await response.text();

      setResult({
        body: formatResponseBody(responseText, copy.emptyResponse),
        duration: Math.round(performance.now() - startedAt),
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        setError(copy.cancelled);
      } else {
        const message =
          requestError instanceof Error ? requestError.message : "";
        setError(
          message ? `${copy.requestFailed} ${message}` : copy.requestFailed,
        );
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setEndpoint(initialPath);
    setApiKey("");
    setRequestBody(initialBody);
    setError(null);
    setResult(null);
  };

  return (
    <section
      id="playground"
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-sm"
    >
      <div className="border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TerminalSquare
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold tracking-tight">
                {copy.title}
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-semibold ${
              method === "POST"
                ? "bg-primary text-primary-foreground"
                : "bg-emerald-600 text-white"
            }`}
          >
            {method}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-5 border-b border-border/70 p-5 sm:p-6 xl:border-b-0 xl:border-r"
        >
          <div className="space-y-2">
            <Label htmlFor={endpointId}>{copy.endpoint}</Label>
            <div className="flex min-w-0 items-stretch rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="flex min-h-11 shrink-0 items-center border-r border-border/70 px-3 font-mono text-xs font-semibold text-muted-foreground">
                {method}
              </span>
              <Input
                id={endpointId}
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                className="h-11 border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                aria-describedby={`${endpointId}-hint`}
              />
            </div>
            <p
              id={`${endpointId}-hint`}
              className="text-xs leading-5 text-muted-foreground"
            >
              {copy.endpointHint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={apiKeyId}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {copy.apiKey}
            </Label>
            <Input
              id={apiKeyId}
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={copy.apiKeyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono"
              aria-describedby={`${apiKeyId}-hint`}
            />
            <p
              id={`${apiKeyId}-hint`}
              className="text-xs leading-5 text-muted-foreground"
            >
              {copy.apiKeyHint}
            </p>
          </div>

          {method === "POST" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={bodyId}>{copy.requestBody}</Label>
                <CopyButton
                  text={requestBody}
                  variant="ghost"
                  label={copy.copy}
                  copiedLabel={copy.copied}
                />
              </div>
              <Textarea
                id={bodyId}
                value={requestBody}
                onChange={(event) => setRequestBody(event.target.value)}
                spellCheck={false}
                className="min-h-64 resize-y font-mono text-xs leading-6 sm:text-sm"
              />
            </div>
          ) : null}

          {consumesCredits ? (
            <div className="flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <AlertTriangle
                className="mt-1 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p>{copy.creditWarning}</p>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 cursor-pointer px-5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {loading ? copy.sending : copy.send}
            </Button>
            {loading ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => abortControllerRef.current?.abort()}
                className="h-11 cursor-pointer"
              >
                <CircleStop className="h-4 w-4" aria-hidden="true" />
                {copy.cancel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={loading}
              className="h-11 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {copy.reset}
            </Button>
          </div>
        </form>

        <div className="flex min-h-[320px] min-w-0 flex-col bg-slate-950 text-slate-100">
          <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              {copy.response}
            </span>
            {result ? (
              <>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                    result.ok
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {result.status} {result.statusText}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {result.duration} ms
                </span>
                <CopyButton
                  text={result.body}
                  variant="ghost"
                  label={copy.copy}
                  copiedLabel={copy.copied}
                  className="text-slate-300 hover:bg-white/10 hover:text-white"
                />
              </>
            ) : null}
          </div>
          <pre
            aria-live="polite"
            className="min-h-0 flex-1 overflow-auto p-5 text-xs leading-6 text-slate-100 sm:text-sm"
          >
            <code className={result ? "" : "text-slate-500"}>
              {result?.body ?? copy.noResponse}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
