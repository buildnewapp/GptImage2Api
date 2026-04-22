import assert from "node:assert/strict";
import test from "node:test";

import AIVideoMiniStudioTaskHistory from "@/components/ai/AIVideoMiniStudioTaskHistory";
import type { AiVideoMiniStudioGenerationTask } from "@/lib/ai-video-studio/mini-history";
import { renderToStaticMarkup } from "react-dom/server";

const tasks: AiVideoMiniStudioGenerationTask[] = [
  {
    localId: "task-2",
    taskId: "remote-2",
    state: "running",
    mediaUrls: [],
    familyKey: "sora2",
    versionKey: "sora-2",
    modelId: "openai/sora-2",
    prompt: "A fox running through neon rain.",
    formValues: {
      prompt: "A fox running through neon rain.",
    },
    creditsRequired: 18,
    progress: 45,
    createdAt: Date.UTC(2026, 3, 12, 11, 30, 0),
  },
  {
    localId: "task-1",
    taskId: "remote-1",
    state: "succeeded",
    mediaUrls: ["https://cdn.example.com/video.mp4"],
    familyKey: "sora2",
    versionKey: "sora-2",
    modelId: "openai/sora-2",
    prompt: "A cinematic ocean drone shot at sunrise.",
    formValues: {
      prompt: "A cinematic ocean drone shot at sunrise.",
    },
    creditsRequired: 12,
    progress: 100,
    createdAt: Date.UTC(2026, 3, 12, 11, 25, 0),
  },
];

test("renders mini studio generation history cards with task status", () => {
  const html = renderToStaticMarkup(
    <AIVideoMiniStudioTaskHistory
      tasks={tasks}
      activeTaskLocalId="task-2"
      onOpenVideos={() => {}}
      texts={{
        historyTitle: "任务列表",
        historyHint: "提交后会显示在这里",
        queuedOrRunning: (progress) => `生成中 ${progress}%`,
        succeeded: "可预览",
        failed: "生成失败",
        creditsRequired: (count) => `${count} 积分`,
        task: (index) => `任务 #${index}`,
        openVideos: "在我的视频中查看",
      }}
    />,
  );

  assert.match(html, /data-ai-video-mini-studio-history/);
  assert.match(html, /任务列表/);
  assert.match(html, /提交后会显示在这里/);
  assert.match(html, /任务 #2/);
  assert.match(html, /任务 #1/);
  assert.match(html, /remote-2/);
  assert.match(html, /A fox running through neon rain\./);
  assert.match(html, /A cinematic ocean drone shot at sunrise\./);
  assert.match(html, /生成中 45%/);
  assert.match(html, /可预览/);
  assert.match(html, /Sora 2 · 18 积分/);
  assert.match(html, /data-ai-video-mini-studio-task="task-2"/);
  assert.match(html, /data-ai-video-mini-studio-open-videos="task-1"/);
  assert.match(html, /data-ai-video-mini-studio-open-videos="task-2"/);
  assert.match(html, /title="在我的视频中查看"/);
  assert.match(
    html,
    /class="[^"]*flex-col[^"]*sm:flex-row[^"]*"/,
  );
});
