# AI Video Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new `AIVideoStudio` landing-page component that preserves the current `VideoStudio` shell and task interactions while switching `Sora2` and `Sora2 Pro` generation to the `ai-studio` catalog, execute, and polling APIs.

**Architecture:** Add a configuration-driven `ai-video-studio` layer that maps visible family/version selections to `ai-studio` model ids and derives renderable fields from `requestSchema` and `examplePayload`. The new component in `components/ai` will keep the current page layout and task behaviors, but it will submit neutral `formValues` through adapter helpers to `/api/ai-studio/execute` and poll `/api/ai-studio/tasks/[taskId]`.

**Tech Stack:** TypeScript, React 19, Next.js App Router, `next-intl`, existing `ai-studio` public APIs, SWR user benefits hook, localStorage persistence, `tsx --test` for targeted unit tests.

---

### Task 1: Add the model mapping contract

**Files:**
- Create: `config/ai-video-studio.ts`
- Test: `lib/ai-video-studio/config.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- `Sora2` standard text mode resolves to `video:sora2-text-to-video`
- `Sora2` standard image mode resolves to `video:sora2-image-to-video`
- `Sora2 Pro` text mode resolves to `video:sora2-pro-text-to-video`
- `Sora2 Pro` image mode resolves to `video:sora2-pro-image-to-video`
- unsupported family/version combinations return `null`

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test lib/ai-video-studio/config.test.ts`

Expected: FAIL because the config module does not exist yet.

**Step 3: Write minimal implementation**

Create `config/ai-video-studio.ts` with:
- family metadata for the selector UI
- version metadata
- resolver helpers for `mode -> modelId`
- any display helpers needed by `AIVideoStudio`

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test lib/ai-video-studio/config.test.ts`

Expected: PASS

### Task 2: Normalize AI Studio schema into UI fields

**Files:**
- Create: `lib/ai-video-studio/schema.ts`
- Test: `lib/ai-video-studio/schema.test.ts`

**Step 1: Write the failing test**

Add tests that prove the schema helper:
- reads `requestSchema.properties.input`
- preserves field order from `x-apidog-orders` when present
- extracts defaults from `examplePayload.input`
- detects required prompt and image fields for `Sora2`
- skips callback-related fields

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test lib/ai-video-studio/schema.test.ts`

Expected: FAIL because normalization helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement field normalization helpers that return:
- normalized field descriptors
- default form values
- required-field metadata
- specialized field kinds such as prompt, image, enum, boolean, number, and text

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test lib/ai-video-studio/schema.test.ts`

Expected: PASS

### Task 3: Build payload and remix adapters

**Files:**
- Create: `lib/ai-video-studio/adapter.ts`
- Create: `lib/ai-video-studio/storage.ts`
- Test: `lib/ai-video-studio/adapter.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- form values convert into the submitted `payload` shape expected by `/api/ai-studio/execute`
- empty optional fields are omitted
- selected pricing rows can rewrite payload model and duration when needed
- saved task payloads can be restored into remixable form values and selection state

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test lib/ai-video-studio/adapter.test.ts`

Expected: FAIL because adapter and storage helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `buildAiVideoStudioPayload`
- `restoreAiVideoStudioFormState`
- local-storage parse/serialize helpers
- neutral types for cached form state and task remix payload

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test lib/ai-video-studio/adapter.test.ts`

Expected: PASS

### Task 4: Add the new field renderer components

**Files:**
- Create: `components/ai/AIVideoStudioFields.tsx`
- Create: `components/ai/AIVideoStudioFieldControl.tsx`
- Verify: `components/ai-demo/shared/ImageUploader.tsx`

**Step 1: Write the failing test**

Add a focused test for any extracted pure rendering helper only if needed.
If the renderer remains mostly presentational, skip unit tests and rely on the schema and adapter coverage from earlier tasks.

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`

Expected: Existing tests stay green while the new renderer is still absent.

**Step 3: Write minimal implementation**

Create field-rendering components that:
- consume normalized field descriptors
- render prompt, enum pills/selects, booleans, numeric inputs, text inputs, and image upload controls
- group less-common fields into an advanced section when appropriate
- preserve the `VideoStudio` visual tone without reusing the legacy provider contract

Reuse `ImageUploader` for image-reference inputs rather than introducing a second upload flow.

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`

Expected: PASS

### Task 5: Build the main AIVideoStudio shell

**Files:**
- Create: `components/ai/AIVideoStudio.tsx`
- Modify: `components/home/seedance/ModelSelector.tsx`
- Verify: `hooks/useUserBenefits.ts`
- Verify: `components/home/seedance/VideoStudio.tsx`

**Step 1: Write the failing test**

Add a pure helper test if necessary for task progress or selected task restoration. Avoid adding brittle component tests unless a logic branch cannot be covered elsewhere.

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test lib/ai-video-studio/config.test.ts lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`

Expected: PASS for helpers, with no main component yet.

**Step 3: Write minimal implementation**

Implement `AIVideoStudio.tsx` by porting the shell behaviors from `VideoStudio`:
- mode toggle
- family and version selector
- model-detail fetch from `/api/ai-studio/models/[id]`
- local form cache hydration and persistence
- credits display with `useUserBenefits`
- submit to `/api/ai-studio/execute`
- polling through `/api/ai-studio/tasks/[taskId]`
- task list, preview, download, prompt copy, and remix

Only adjust shared selector code if `AIVideoStudio` needs a small prop extension for `Sora2` family/version metadata.

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test lib/ai-video-studio/config.test.ts lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`

Expected: PASS

### Task 6: Integrate the new component into the landing page

**Files:**
- Modify: `components/home/SeedanceHome.tsx`
- Modify: `components/home/Seedance15Home.tsx`
- Verify: `components/home/seedance/VideoStudio.tsx`

**Step 1: Switch the usage**

Replace the render/import to use `components/ai/AIVideoStudio.tsx` while leaving the old `VideoStudio` file intact for now.

**Step 2: Run targeted verification**

Run:
- `pnpm exec tsx --test lib/ai-video-studio/config.test.ts lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`
- `pnpm build`

Expected: PASS

### Task 7: Manual behavior verification before cleanup

**Files:**
- Verify: `components/ai/AIVideoStudio.tsx`
- Verify: `config/ai-video-studio.ts`
- Verify: `lib/ai-video-studio/storage.ts`

**Step 1: Manual smoke checklist**

Verify in the browser or preview environment:
- `Sora2` and `Sora2 Pro` both appear
- text and image modes choose the correct `ai-studio` `modelId`
- schema-derived fields update when switching model/version/mode
- image mode requires an uploaded image when the schema requires one
- successful runs populate the task list and preview
- remix restores the last task into the form
- page reload restores cached form state

**Step 2: Final verification**

Run:
- `pnpm exec tsx --test lib/ai-video-studio/config.test.ts lib/ai-video-studio/schema.test.ts lib/ai-video-studio/adapter.test.ts`
- `pnpm build`

Expected: PASS
