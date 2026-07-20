import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

function readTasksMessages(locale: "zh" | "en" | "ja") {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../i18n/messages/${locale}/Dashboard/User/Tasks.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Record<string, any>;
}

test("removes developer-facing subtitle copy from task center", () => {
  const zh = readTasksMessages("zh");

  assert.equal(zh.summary.subtitle.includes("尽量不侵入现有系统"), false);
});

test("invite friend copy includes concrete reward placeholders", () => {
  const messages = readTasksMessages("zh");

  assert.equal(
    messages.tasks.invite_signup.description.includes("{signupCredit}"),
    true,
  );
  assert.equal(
    messages.tasks.invite_signup.description.includes("{firstOrderReward}"),
    true,
  );
});

const locales = ["en", "zh", "ja"] as const;
const manualTaskKeys = [
  "github_star",
  "huggingface_like",
  "share_twitter",
  "share_facebook",
  "share_tiktok",
  "share_instagram",
] as const;

function getNestedValue(
  source: Record<string, any>,
  path: readonly string[],
): unknown {
  return path.reduce<unknown>(
    (value, key) =>
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined,
    source,
  );
}

test("all locales describe every manual review task", () => {
  for (const locale of locales) {
    const messages = readTasksMessages(locale);

    for (const taskKey of manualTaskKeys) {
      assert.equal(
        typeof messages.tasks?.[taskKey]?.title,
        "string",
        `${locale}.${taskKey}.title`,
      );
      assert.equal(
        typeof messages.tasks?.[taskKey]?.description,
        "string",
        `${locale}.${taskKey}.description`,
      );
      assert.match(
        messages.tasks[taskKey].description,
        /screenshot|截图|スクリーンショット/i,
        `${locale}.${taskKey}.description should explain screenshot review`,
      );
    }
  }
});

test("all locales contain the complete manual submission flow copy", () => {
  const requiredPaths = [
    ["status", "available"],
    ["status", "pending"],
    ["status", "rejected"],
    ["actions", "submit"],
    ["actions", "resubmit"],
    ["actions", "pending"],
    ["manualSubmission", "description"],
    ["manualSubmission", "openTarget"],
    ["manualSubmission", "screenshotLabel"],
    ["manualSubmission", "screenshotHint"],
    ["manualSubmission", "screenshotAlt"],
    ["manualSubmission", "textLabel"],
    ["manualSubmission", "textPlaceholder"],
    ["manualSubmission", "characterCount"],
    ["manualSubmission", "cancel"],
    ["manualSubmission", "submit"],
    ["manualSubmission", "submitting"],
    ["manualSubmission", "validation", "screenshotRequired"],
    ["manualSubmission", "validation", "screenshotType"],
    ["manualSubmission", "validation", "screenshotSize"],
    ["manualSubmission", "validation", "textRequired"],
    ["manualSubmission", "validation", "textLength"],
    ["manualSubmission", "errors", "upload"],
    ["manualSubmission", "errors", "submit"],
    ["manualSubmission", "success"],
    ["reviewReason"],
  ] as const;

  for (const locale of locales) {
    const messages = readTasksMessages(locale);

    for (const path of requiredPaths) {
      const value = getNestedValue(messages, path);
      assert.equal(typeof value, "string", `${locale}.${path.join(".")}`);
      assert.notEqual(
        (value as string).trim(),
        "",
        `${locale}.${path.join(".")}`,
      );
    }
  }
});

test("removes the obsolete external-task timer copy", () => {
  for (const locale of locales) {
    const messages = readTasksMessages(locale);

    assert.equal("readyToCheck" in messages.status, false, locale);
    assert.equal("start" in messages.actions, false, locale);
    assert.equal("check" in messages.actions, false, locale);
    assert.equal("syncing" in messages.toast, false, locale);
    assert.equal("externalStarted" in messages.toast, false, locale);
  }
});

test("task center routes manual tasks through a dedicated submission dialog", () => {
  const dialogUrl = new URL(
    "../../app/[locale]/(protected)/dashboard/(user)/tasks/ManualTaskSubmissionDialog.tsx",
    import.meta.url,
  );
  assert.equal(
    existsSync(dialogUrl),
    true,
    "manual submission dialog should exist",
  );

  const tasksClient = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(user)/tasks/TasksClient.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(tasksClient, /ManualTaskSubmissionDialog/);
  assert.match(tasksClient, /isAutomaticClaimableTaskKey\(task\.taskKey\)/);
  assert.doesNotMatch(tasksClient, /as AutomaticClaimableTaskKey/);
  assert.doesNotMatch(tasksClient, /localStorage|setTimeout|readyToCheck/);
});

test("manual submission dialog implements the evidence upload contract", () => {
  const dialogUrl = new URL(
    "../../app/[locale]/(protected)/dashboard/(user)/tasks/ManualTaskSubmissionDialog.tsx",
    import.meta.url,
  );
  assert.equal(
    existsSync(dialogUrl),
    true,
    "manual submission dialog should exist",
  );

  const source = readFileSync(dialogUrl, "utf8");
  const createUploadIndex = source.indexOf("createTaskEvidenceUploadAction(");
  const putIndex = source.indexOf("fetch(", createUploadIndex);
  const submitIndex = source.indexOf(
    "submitManualTaskApplicationAction(",
    putIndex,
  );

  assert.ok(createUploadIndex >= 0, "should request a presigned upload");
  assert.ok(putIndex > createUploadIndex, "should PUT after presigning");
  assert.ok(submitIndex > putIndex, "should submit after the upload completes");
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(source, /5 \* 1024 \* 1024|MAX_TASK_EVIDENCE_BYTES/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /submissionText\.trim\(\)/);
  assert.match(source, /maxLength=\{500\}/);
  assert.match(source, /"Content-Type": file\.type/);
  assert.match(source, /router\.refresh\(\)/);
});

test("manual submission fields announce and focus validation errors", () => {
  const dialogSource = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(user)/tasks/ManualTaskSubmissionDialog.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const tasksSource = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(user)/tasks/TasksClient.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    dialogSource,
    /id=\{screenshotErrorId\}[\s\S]{0,160}role="alert"/,
  );
  assert.match(dialogSource, /id=\{textErrorId\}[\s\S]{0,160}role="alert"/);
  assert.match(dialogSource, /const textInputRef = useRef/);
  assert.match(dialogSource, /fileInputRef\.current\?\.focus\(\)/);
  assert.match(dialogSource, /textInputRef\.current\?\.focus\(\)/);
  assert.match(tasksSource, /role="progressbar"/);
  assert.match(tasksSource, /aria-valuenow=\{summary\.progressPercent\}/);
  assert.match(tasksSource, /aria-valuemin=\{0\}/);
  assert.match(tasksSource, /aria-valuemax=\{100\}/);
});

test("admin task review client exposes accessible controls and loading status", () => {
  const source = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(admin)/task-rewards-admin/TaskRewardReviewClient.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /aria-label=\{t\("filters\.email"\)\}/);
  assert.match(source, /aria-label=\{t\("filters\.status"\)\}/);
  assert.match(source, /aria-label=\{t\("filters\.task"\)\}/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
});

test("admin task review uses a synchronous in-flight guard", () => {
  const source = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(admin)/task-rewards-admin/TaskRewardReviewClient.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const reviewStart = source.indexOf("const review = async");
  const reviewSource = source.slice(reviewStart);
  const guardCheck = reviewSource.indexOf("reviewInFlightRef.current");
  const guardSet = reviewSource.indexOf("reviewInFlightRef.current = true");
  const request = reviewSource.indexOf("reviewRewardApplicationAction({");
  const guardReset = reviewSource.indexOf("reviewInFlightRef.current = false");

  assert.match(source, /const reviewInFlightRef = useRef\(false\)/);
  assert.ok(reviewStart >= 0);
  assert.ok(guardCheck >= 0 && guardCheck < guardSet);
  assert.ok(guardSet >= 0 && guardSet < request);
  assert.ok(guardReset > request);
});

test("task reward pagination supplies localized labels without changing defaults", () => {
  const source = readFileSync(
    new URL(
      "../../app/[locale]/(protected)/dashboard/(admin)/task-rewards-admin/TaskRewardReviewClient.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const paginationSource = readFileSync(
    new URL("../../components/shared/AdminPagination.tsx", import.meta.url),
    "utf8",
  );

  assert.match(paginationSource, /labels\?:/);
  assert.match(source, /labels=\{\{/);
  for (const key of ["first", "previous", "next", "last", "perPage", "range"]) {
    assert.match(source, new RegExp(`pagination\\.${key}`));
  }

  for (const locale of locales) {
    const messages = JSON.parse(
      readFileSync(
        new URL(
          `../../i18n/messages/${locale}/Dashboard/Admin/TaskRewards.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Record<string, any>;
    for (const key of [
      "first",
      "previous",
      "next",
      "last",
      "perPage",
      "range",
    ]) {
      assert.equal(
        typeof messages.pagination?.[key],
        "string",
        `${locale}.${key}`,
      );
      assert.notEqual(messages.pagination[key].trim(), "", `${locale}.${key}`);
    }
  }
});

test("manual task setup documents the private bucket upload CORS requirement", () => {
  const envExample = readFileSync(
    new URL("../../.env.example", import.meta.url),
    "utf8",
  );
  const readme = readFileSync(
    new URL("../../README.md", import.meta.url),
    "utf8",
  );

  assert.match(envExample, /R2_TASK_EVIDENCE_BUCKET_NAME/);
  assert.match(envExample, /private bucket/i);
  assert.match(readme, /manual task|人工任务/i);
  assert.match(readme, /private bucket|私有 bucket/i);
  assert.match(readme, /CORS/i);
  assert.match(readme, /PUT/);
  assert.match(readme, /Content-Type/);
});
