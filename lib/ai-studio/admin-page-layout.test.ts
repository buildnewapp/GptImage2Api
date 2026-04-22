import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const aiStudioAdminClientPath = path.join(
  projectRoot,
  "app/[locale]/(protected)/dashboard/(admin)/ai-studio-admin/AiStudioAdminClient.tsx",
);

test("moves ai studio admin details actions into the actions dropdown", () => {
  const source = readFileSync(aiStudioAdminClientPath, "utf8");

  assert.match(source, /DropdownMenu/);
  assert.match(source, /DropdownMenuTrigger/);
  assert.match(source, /DropdownMenuContent/);
  assert.match(source, /DropdownMenuItem/);
  assert.doesNotMatch(source, /<TableHead>Details<\/TableHead>/);
  assert.match(source, /<TableHead>Actions<\/TableHead>/);
  assert.match(source, /Request Payload/);
  assert.match(source, /Response Payload/);
  assert.match(source, /Callback Payload/);
  assert.match(source, /Pricing Snapshot/);
});

test("renders an edit entry for admin generation updates", () => {
  const source = readFileSync(aiStudioAdminClientPath, "utf8");

  assert.match(source, /Edit/);
  assert.match(source, /catalogModelId/);
  assert.match(source, /resultUrls/);
  assert.match(source, /isPublic/);
  assert.match(source, /completedAt/);
  assert.match(source, /userDeletedAt/);
});

test("renders all result urls as direct preview links in the admin table", () => {
  const source = readFileSync(aiStudioAdminClientPath, "utf8");

  assert.match(source, /<TableHead>Preview<\/TableHead>/);
  assert.match(source, /record\.resultUrls\.map/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer"/);
});

test("shows isPublic inside the status cell instead of a separate column", () => {
  const source = readFileSync(aiStudioAdminClientPath, "utf8");

  assert.match(source, /record\.isPublic \? "Public" : "Private"/);
  assert.match(source, /onClick=\{\(\) => openEditDialog\(record\)\}/);
  assert.doesNotMatch(source, /<TableHead>isPublic<\/TableHead>/);
});

test("shows request and response shortcuts under provider task id", () => {
  const source = readFileSync(aiStudioAdminClientPath, "utf8");

  assert.match(source, /Request/);
  assert.match(source, /Response/);
  assert.match(source, /openDetailDialog\("Request Payload", record\.requestPayload\)/);
  assert.match(source, /openDetailDialog\("Response Payload", record\.responsePayload\)/);
});
