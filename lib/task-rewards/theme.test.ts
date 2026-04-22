import assert from "node:assert/strict";
import test from "node:test";

import {
  getMetricToneClasses,
  getTaskIconToneClasses,
  getTaskStatusToneClasses,
} from "@/lib/task-rewards/theme";

test("task status tones include dark-mode classes", () => {
  assert.match(
    getTaskStatusToneClasses("claimed"),
    /dark:border-emerald-900\/60/,
  );
  assert.match(
    getTaskStatusToneClasses("claimable"),
    /dark:border-amber-900\/60/,
  );
  assert.match(
    getTaskStatusToneClasses("incomplete"),
    /dark:border-slate-800/,
  );
});

test("metric tones include dark-mode classes", () => {
  assert.match(getMetricToneClasses("amber"), /dark:bg-amber-950\/30/);
  assert.match(getMetricToneClasses("emerald"), /dark:bg-emerald-950\/30/);
});

test("task icon tones include dark-mode classes", () => {
  assert.match(
    getTaskIconToneClasses({ completed: true, claimable: false }),
    /dark:bg-emerald-500\/20/,
  );
  assert.match(
    getTaskIconToneClasses({ completed: false, claimable: true }),
    /dark:bg-amber-950\/40/,
  );
  assert.match(
    getTaskIconToneClasses({ completed: false, claimable: false }),
    /dark:bg-slate-800/,
  );
});
