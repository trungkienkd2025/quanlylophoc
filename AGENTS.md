# QLLH — Agent instructions (Codex / Cursor / Claude)

This file is the **entry point** for AI agents (especially OpenAI Codex).  
Detailed product + tech truth lives in the docs below — **do not invent stack or scope from memory**.

## Mandatory reading (every session / before code changes)

1. Read [`docs/KNOWLEDGE.md`](docs/KNOWLEDGE.md) — business rules, MVP vs backlog, conventions, quality gate.
2. Read [`docs/architecture.md`](docs/architecture.md) — schema, RLS, RPC, idempotency, risks.
3. If touching deploy/env: also read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
4. If touching Next.js APIs: check `node_modules/next/dist/docs/` (see Next.js block below).

When KNOWLEDGE / architecture conflict with an old master prompt or training data: **follow the docs in this repo**.

## Product in one line

Vietnamese web app for elementary teachers to manage a class: students, attendance, participation, reward points, reports, Excel import. Mobile-first. Teacher A must never see Teacher B data.

## Stack (do not replace without explicit product decision)

- Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 + shadcn/ui + Zod
- Supabase: Auth + PostgreSQL + **RLS** + SQL trong `supabase/complete_setup.sql`
- Mutations: Server Actions + Postgres RPC (not NestJS / not Prisma in this repo)

## Hard rules

- UI copy for teachers: **Tiếng Việt**; no raw technical errors.
- Prefer few clicks; soft delete (`deleted_at`); DB constraints over frontend-only checks.
- Fast taps (participation / points): idempotent `client_request_id` via RPC.
- Dates/reports: timezone **Asia/Ho_Chi_Minh**.
- No PII of real children in seed/code; no secrets in git; never expose service-role as `NEXT_PUBLIC_*`.
- “Điểm” in this app = **điểm thi đua** (`student_points`), not subject grades 0–10 (not implemented).
- Do not claim done without verifying the touched flow (`lint` / `typecheck` / `build` as relevant).
- After correcting a recurring agent mistake, update `docs/KNOWLEDGE.md` and this file.

## Commands

```bash
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
# Apply supabase/complete_setup.sql in Supabase SQL Editor (new/reset project only)
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Dependency lockfile (Vercel / Codex web)

- Commit `package-lock.json` together with every dependency change.
- Never manually write or copy a package `integrity` value. Regenerate the lockfile with npm (for example `npm install --package-lock-only`) and verify with `npm ci` before committing.
- When Vercel reports `EINTEGRITY`, compare the affected package's `dist.integrity` from the configured npm registry, correct/regenerate the lockfile, then run `npm ci` locally. Do not work around it with `--force` or disabled integrity checks.

## Where to change code

| Area | Path |
| --- | --- |
| Pages / UI | `src/app/(app)/`, `src/components/` |
| Mutations | `src/app/actions/` |
| Domain helpers | `src/lib/` |
| Types | `src/types/` |
| Schema / RLS / RPC | `supabase/complete_setup.sql` (một file; chỉ chạy trên project mới/reset) |

## Codex tip

Repo-recommended config: [`.codex/config.toml`](.codex/config.toml).  
Optional larger instruction budget:

```bash
export CODEX_HOME="$(pwd)/.codex"
codex
```

Verify instructions loaded:

```bash
codex --ask-for-approval never "Summarize the project instructions and name the docs you must follow."
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
