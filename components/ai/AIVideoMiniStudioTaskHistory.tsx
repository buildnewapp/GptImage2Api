import { getAiVideoStudioVersions } from "@/config/ai-video-studio";
import type { AiVideoMiniStudioGenerationTask } from "@/lib/ai-video-studio/mini-history";
import { cn } from "@/lib/utils";
import { Loader2, Play, X } from "lucide-react";

interface AIVideoMiniStudioTaskHistoryTexts {
  historyTitle: string;
  historyHint: string;
  queuedOrRunning: (progress: number) => string;
  succeeded: string;
  failed: string;
  creditsRequired: (count: number) => string;
  task: (index: number) => string;
  openVideos: string;
}

interface AIVideoMiniStudioTaskHistoryProps {
  tasks: AiVideoMiniStudioGenerationTask[];
  activeTaskLocalId: string | null;
  onOpenVideos: () => void;
  texts: AIVideoMiniStudioTaskHistoryTexts;
}

function getTaskStatusLabel(
  task: AiVideoMiniStudioGenerationTask,
  texts: AIVideoMiniStudioTaskHistoryTexts,
) {
  if (task.state === "failed") {
    return texts.failed;
  }

  if (task.state === "succeeded") {
    return texts.succeeded;
  }

  return texts.queuedOrRunning(task.progress);
}

function getVersionLabel(task: AiVideoMiniStudioGenerationTask) {
  return (
    getAiVideoStudioVersions(task.familyKey).find(
      (version) => version.key === task.versionKey,
    )?.label ?? task.versionKey
  );
}

export default function AIVideoMiniStudioTaskHistory({
  tasks,
  activeTaskLocalId,
  onOpenVideos,
  texts,
}: AIVideoMiniStudioTaskHistoryProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      data-ai-video-mini-studio-history
      className="border-t border-white/8 px-5 py-4 sm:px-7"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{texts.historyTitle}</p>
          <p className="text-xs text-white/45">{texts.historyHint}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
          {tasks.length}
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {tasks.map((task, index) => {
          const previewUrl = task.mediaUrls[0] ?? null;
          const isActive = task.localId === activeTaskLocalId;

          return (
            <button
              key={task.localId}
              data-ai-video-mini-studio-task={task.localId}
              data-ai-video-mini-studio-open-videos={task.localId}
              type="button"
              title={texts.openVideos}
              aria-label={texts.openVideos}
              onClick={onOpenVideos}
              className={cn(
                "flex w-full flex-col items-start gap-3 rounded-[1.15rem] border p-3 text-left transition sm:flex-row",
                isActive
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-black/10 hover:border-white/15 hover:bg-white/[0.08]",
              )}
            >
              <div className="flex h-16 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/35 sm:w-24">
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : task.state === "failed" ? (
                  <X className="h-4 w-4 text-white/60" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-white/70" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {texts.task(tasks.length - index)}
                      </span>
                      {task.taskId ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                          {task.taskId}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-white/45">
                      {getVersionLabel(task)} · {texts.creditsRequired(task.creditsRequired)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/35">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-white/85">{task.prompt}</p>

                <div className="mt-2 flex items-center gap-2">
                  {task.state === "succeeded" ? (
                    <Play className="h-3.5 w-3.5 text-emerald-300" />
                  ) : task.state === "failed" ? (
                    <X className="h-3.5 w-3.5 text-rose-300" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      task.state === "succeeded"
                        ? "text-emerald-200"
                        : task.state === "failed"
                          ? "text-rose-200"
                          : "text-white/55",
                    )}
                  >
                    {getTaskStatusLabel(task, texts)}
                  </span>
                </div>

                {task.state !== "succeeded" ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        task.state === "failed" ? "bg-rose-400" : "bg-white/70",
                      )}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
