"use client";

import { collectApiFieldDocs } from "@/components/ai/AIVideoStudioApiDocs";
import {
  moduleCardClass,
  sectionKickerClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CopyButton from "@/components/shared/CopyButton";
import type { AiStudioPublicDocDetail } from "@/lib/ai-studio/public";
import type { AiVideoStudioModelOption } from "@/lib/apidoc/ai-studio-api-docs";
import { cn } from "@/lib/utils";
import { FileJson, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type DetailResponse = {
  success: boolean;
  data?: AiStudioPublicDocDetail;
  error?: string;
};

export default function ApiDocModelFieldExplorer({
  modelOptions,
  siteUrl,
  copyLabel,
  copiedLabel,
}: {
  modelOptions: AiVideoStudioModelOption[];
  siteUrl: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const t = useTranslations("ApiDoc");
  const modelIdToken = "{modelId}";
  const [selectedModelId, setSelectedModelId] = useState<string>(
    modelOptions[0]?.modelId ?? "",
  );
  const [detail, setDetail] = useState<AiStudioPublicDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedModelId) {
      setDetail(null);
      return;
    }

    let isMounted = true;

    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/ai-studio/models/${encodeURIComponent(selectedModelId)}`,
        );
        const json = (await response.json()) as DetailResponse;
        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || "Failed to load model detail");
        }

        if (isMounted) {
          setDetail(json.data);
        }
      } catch (fetchError: any) {
        if (isMounted) {
          setDetail(null);
          setError(fetchError?.message || "Failed to load model detail");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedModelId]);

  const fieldDocs = useMemo(
    () =>
      collectApiFieldDocs({
        requestSchema: detail?.requestSchema,
        copy: {
          required: t("modelSchema.docMeta.required"),
          type: t("modelSchema.docMeta.type"),
          enum: t("modelSchema.docMeta.enum"),
          range: t("modelSchema.docMeta.range"),
          minimum: t("modelSchema.docMeta.minimum"),
          maximum: t("modelSchema.docMeta.maximum"),
        },
      }),
    [detail?.requestSchema, t],
  );

  const requestExample = useMemo(() => {
    if (!detail?.examplePayload) {
      return "";
    }

    return JSON.stringify(detail.examplePayload, null, 2);
  }, [detail?.examplePayload]);

  const modelLabelMap = useMemo(
    () =>
      new Map(
        modelOptions.map((model) => [
          model.modelId,
          `${model.familyLabel} · ${model.versionLabel}`,
        ]),
      ),
    [modelOptions],
  );
  const schemaEndpoint = useMemo(() => {
    if (!selectedModelId) {
      return `${siteUrl}/api/ai-studio/models/{modelId}`;
    }

    return `${siteUrl}/api/ai-studio/models/${encodeURIComponent(selectedModelId)}`;
  }, [selectedModelId, siteUrl]);

  return (
    <div
      id="dynamic-payload-fields-by-model"
      className={cn(
        moduleCardClass,
        "min-w-0 cursor-default rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6",
      )}
    >
      <div className={cn(sectionKickerClass, "mb-5")}>
        <Sparkles className="h-4 w-4" />
        {t("modelSchema.kicker")}
      </div>
      <h3 className={cn(subsectionTitleClass, "text-[1.6rem]")}>
        {t("modelSchema.title")}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("modelSchema.description", {
          modelId: modelIdToken,
        })}
      </p>

      <div className="mt-5 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("modelSchema.selectLabel")}
        </div>
        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
          <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-background/70">
            <SelectValue placeholder={t("modelSchema.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent align="start">
            {modelOptions.map((model) => (
              <SelectItem key={model.modelId} value={model.modelId}>
                {model.familyLabel} · {model.versionLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {detail ? (
        <div className="mt-4 min-w-0 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("modelSchema.endpointLabel")}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-semibold text-white">
              GET
            </span>
            <code className="min-w-0 break-all rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground">
              {schemaEndpoint}
            </code>
            <CopyButton
              text={schemaEndpoint}
              variant="ghost"
              label={copyLabel}
              copiedLabel={copiedLabel}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {modelLabelMap.get(selectedModelId) ?? selectedModelId}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("modelSchema.loading")}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("modelSchema.loadError")} {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-5">
          <div className="mb-3 text-sm font-semibold text-foreground">
            {t("modelSchema.fieldDocsTitle")}
          </div>
          {fieldDocs.length > 0 ? (
            <div className="space-y-3">
              {fieldDocs.map((field) => (
                <details
                  key={field.key}
                  className="group min-w-0 rounded-xl border border-border/60 bg-background/60 px-4 py-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="break-all font-mono text-xs text-foreground">
                      {field.title}
                    </span>
                    <span className="text-xs text-muted-foreground group-open:hidden">
                      +
                    </span>
                    <span className="hidden text-xs text-muted-foreground group-open:inline">
                      -
                    </span>
                  </summary>
                  {field.description ? (
                    <div className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      {field.description}
                    </div>
                  ) : null}
                  {field.meta ? (
                    <div className="mt-1 break-words text-xs text-muted-foreground/90">
                      {field.meta}
                    </div>
                  ) : null}
                </details>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              {t("modelSchema.noFields")}
            </div>
          )}
        </div>
      ) : null}

      {requestExample ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileJson className="size-4" />
            {t("modelSchema.requestExampleTitle")}
            <CopyButton
              text={requestExample}
              variant="ghost"
              label={copyLabel}
              copiedLabel={copiedLabel}
              className="ml-auto"
            />
          </div>
          <pre className="max-h-[320px] overflow-auto rounded-xl border border-border/60 bg-slate-950 p-4 text-[11px] leading-6 text-slate-100 sm:text-xs">
            <code>{requestExample}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}
