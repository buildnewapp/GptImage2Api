import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiVideoMiniStudioGenerationTask,
  resolveAiVideoMiniStudioTaskState,
} from "@/lib/ai-video-studio/mini-history";

test("creates a queued mini studio generation task with a prompt fallback", () => {
  const task = createAiVideoMiniStudioGenerationTask({
    familyKey: "sora2",
    versionKey: "sora-2",
    modelId: "openai/sora-2",
    formValues: {
      prompt: "   ",
      duration: 5,
    },
    creditsRequired: 12,
    promptFieldKey: "prompt",
    now: 1710000000000,
    createId: () => "task-local-1",
  });

  assert.deepEqual(task, {
    localId: "task-local-1",
    taskId: undefined,
    state: "queued",
    mediaUrls: [],
    familyKey: "sora2",
    versionKey: "sora-2",
    modelId: "openai/sora-2",
    prompt: "-",
    formValues: {
      prompt: "   ",
      duration: 5,
    },
    creditsRequired: 12,
    progress: 5,
    createdAt: 1710000000000,
  });
});

test("maps execute and polling states into the mini studio task state union", () => {
  assert.equal(resolveAiVideoMiniStudioTaskState("queued"), "queued");
  assert.equal(resolveAiVideoMiniStudioTaskState("running"), "running");
  assert.equal(resolveAiVideoMiniStudioTaskState("processing"), "running");
  assert.equal(resolveAiVideoMiniStudioTaskState("succeeded"), "succeeded");
  assert.equal(resolveAiVideoMiniStudioTaskState("failed"), "failed");
  assert.equal(resolveAiVideoMiniStudioTaskState(undefined), "queued");
});
