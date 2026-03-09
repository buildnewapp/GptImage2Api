# AI Video Studio Design

**Context**

`components/home/seedance/VideoStudio.tsx` already has the desired landing-page layout and interaction model: mode toggle, model and version selection, cached form state, task list, polling, download, prompt copy, and remix. The problem is that it depends on the legacy `model_config` plus provider-specific form renderer and `/api/video/*` APIs, while the product direction is to move video generation onto the newer `ai-studio` catalog and execution pipeline.

The first migration target is intentionally narrow: only `Sora2` and `Sora2 Pro`, each with text-to-video and image-to-video modes. The new implementation must preserve the current shell and task interactions, but the request model, pricing, execution, and polling must come from `ai-studio`.

**Decision**

Build a new `components/ai/AIVideoStudio.tsx` component that keeps the `VideoStudio` shell behavior while replacing the legacy provider stack with a small, configuration-driven `ai-studio` adapter layer.

The adapter layer will do three separate jobs:

- define the visible model family and version choices for `Sora2` and `Sora2 Pro`
- resolve each family/version/mode tuple to the correct `ai-studio` `modelId`
- derive visible form fields, defaults, and payload mappings from the selected model's `requestSchema` and `examplePayload`

The field set will follow `ai-studio` semantics rather than attempting to force the old provider fields onto the new models. The layout stays familiar, but the field controls are allowed to be more appropriate for the selected schema.

**Recommended Approach**

Introduce a dedicated `ai-video-studio` layer outside the component tree:

- `config/ai-video-studio.ts`
  - exposes the allowed model families and versions for the landing page
  - maps `text-to-video` and `image-to-video` to `ai-studio` model ids
- `lib/ai-video-studio/schema.ts`
  - normalizes `AiStudioPublicDocDetail` into renderable field descriptors
  - extracts defaults and required information from `requestSchema` and `examplePayload`
- `lib/ai-video-studio/adapter.ts`
  - converts between UI form values and submitted `ai-studio` payloads
  - reconstructs form values from saved task payloads for remix
- `lib/ai-video-studio/storage.ts`
  - replaces the legacy local-storage payload parsing for the new component

`AIVideoStudio` will keep the high-level `VideoStudio` flow:

- choose mode
- choose family and version
- load `ai-studio` model detail
- render fields from the normalized schema
- submit to `/api/ai-studio/execute`
- poll `/api/ai-studio/tasks/[taskId]`
- append task cards and allow remix, copy, preview, and download

**Alternatives Considered**

1. Render `requestSchema` directly with no adapter.
This is the fastest path, but it creates an unstable UI because upstream field order and labels leak into the product surface. It also makes remix and storage harder to keep consistent.

2. Reuse the old `ProviderFieldsRenderer` and force `ai-studio` values into that shape.
This keeps the old form visuals, but it bakes legacy assumptions into the new stack and becomes brittle as soon as `Sora2` schema fields diverge from the legacy provider keys.

3. Rewrite the full page into a generic AI Studio shell.
This would be useful long term, but it is unnecessary for the current scope and creates extra regression risk on a working landing page.

**Component Structure**

- `components/ai/AIVideoStudio.tsx`
  - owns page-local state, fetches `ai-studio` model detail, submits jobs, polls status, and renders the existing shell
- `components/ai/AIVideoStudioFields.tsx`
  - renders normalized fields using appropriate controls for strings, enums, booleans, numbers, prompt text, image inputs, and advanced options
- optionally extract presentational helpers for task cards or result preview only if the main file grows too large

The goal is to keep product logic in `lib/ai-video-studio/*` and keep UI files focused on rendering and event flow.

**Data Flow**

1. The user selects mode, family, and version.
2. The config layer resolves the `ai-studio` `modelId`.
3. The component fetches `/api/ai-studio/models/[id]`.
4. Schema helpers normalize the returned `requestSchema` and `examplePayload`.
5. The form renderer shows only supported fields for the chosen model and hydrates defaults.
6. On submit, adapter helpers convert `formValues` to the `payload` expected by `/api/ai-studio/execute`.
7. The execute response creates a local task entry and starts polling if `taskId` is present.
8. Polling updates local task state from `queued/running` to `succeeded/failed`.
9. Remix reads the saved task payload and rebuilds `mode`, `family`, `version`, `formValues`, and `isPublic`.

**Task and Storage Model**

The new component should not reuse the legacy `ProviderFormValues` contract. It needs a more neutral task payload:

- `mode`
- `familyKey`
- `versionKey`
- `modelId`
- `payload`
- `formValues`
- `selectedPricing`
- `isPublic`
- `reservedCredits`
- `taskId`
- `state`
- `mediaUrls`

Local storage should save the same neutral data shape so the new component can survive page reloads and support future model families without depending on legacy provider keys.

**Error Handling**

- If the selected combination has no mapped `modelId`, disable generation and show the existing unsupported-combination message style.
- If model detail fetch fails, show a form-level error state and do not render stale fields.
- If execute fails, mark the task as failed immediately and surface the server error toast.
- If polling fails transiently, retry with backoff-like spacing similar to the current behavior without erasing the task.
- If a schema field is unsupported by the renderer, skip it rather than rendering a broken control; log enough information during development to diagnose the gap.

**Testing**

Use TDD around the non-visual logic:

- config resolution for family/version/mode to `modelId`
- schema normalization for common `Sora2` fields
- payload building from form values
- remix/state restoration from saved task payloads
- pricing row selection when multiple `pricingRows` exist

Verification should also include a production build and targeted tests for the new helper modules.
