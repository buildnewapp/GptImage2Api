import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

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
