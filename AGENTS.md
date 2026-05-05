# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 / React 19 app currently run with Docker. Do not add Cloudflare Worker cron or Cloudflare scheduled-event code unless explicitly requested. Pages and route handlers live under `app/`, including localized routes in `app/[locale]` and APIs in `app/api`. Shared UI is in `components/`, hooks in `hooks/`, business logic in `lib/`, and server actions in `actions/`. Internationalization files are under `i18n/messages/{en,zh,ja}`. Content sources live in `content/`, `docs/`, and `blogs/`; static assets are in `public/`. Database migrations and seeds are under `lib/db`.

## Build, Test, and Development Commands

Use `pnpm` for package scripts.

- `pnpm dev`: start the local Next.js development server.
- `pnpm build`: run a production Next.js build.
- `pnpm start`: serve the built Next.js app.
- `pnpm lint`: run the Next.js ESLint checks.
- `pnpm exec tsx --test`: run Node tests for `*.test.ts` / `*.test.tsx`.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`: manage Drizzle database changes.

## Coding Style & Naming Conventions

Write TypeScript with `strict` mode in mind and prefer the `@/*` alias for repository imports. Follow the existing two-space indentation style. Name React components in PascalCase, hooks as `useXxx`, and utilities in camelCase. Keep route files aligned with Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`). Use `.eslintrc.js`, which extends `next/core-web-vitals` with project-specific overrides.

## Testing Guidelines

Tests use Node’s built-in `node:test` and `node:assert/strict`. Place focused tests next to the covered code, using the existing `*.test.ts` or `*.test.tsx` pattern, for example `lib/admin/system-emails.test.ts`. Prefer small behavioral tests for business logic, data transforms, and route helpers. Run `pnpm exec tsx --test` before submitting shared logic changes.

## Commit & Pull Request Guidelines

Recent commits use short, direct summaries, often in Chinese, such as `细节优化` or `积分有效期 + 上传 r2 优化`. Keep commit messages concise and scoped to the actual change. Pull requests should include a brief description, affected areas, verification commands run, and screenshots for visible UI changes. Link related issues or tasks when available, and call out required environment or database changes.

## Security & Configuration Tips

Do not commit secrets or local deployment credentials. Use `.env` / `.env.local` for local configuration. When changing payment, auth, webhook, or credit logic, document the test path and any migration or seed requirement in the PR.
