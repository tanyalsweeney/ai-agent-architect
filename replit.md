# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/arch-recommender` (`@workspace/arch-recommender`)

React + Vite SPA — the AI Agent Architecture Recommender wizard. Multi-stage flow: describe → analyze → refine → constraints → tools → security → review → generating → done.

- Entry: `src/main.tsx`, renders `<ArchRecommender />` from `src/ArchRecommender.tsx`
- Fonts: JetBrains Mono, Sora, Playfair Display, Nunito (loaded from Google Fonts in `index.html`)
- All styling via inline styles — no Tailwind/shadcn used (design system via `T` object)
- Calls `POST /api/arch/analyze` to parse descriptions via Claude (returns structured JSON)
- Calls `POST /api/arch/generate` to stream a full architecture spec via SSE
- Draft state saved to localStorage key `arch_v4_draft`; supports JSON export/import
- Uses `react-markdown` + `remark-gfm` to render the streamed markdown spec
- Vite proxies `/api` → `http://localhost:8080` in dev mode
- Running on port 20608

#### Multi-Agent Generation Architecture

`POST /api/arch/generate` runs a two-phase pipeline:

**Phase 1 — Specialist Review (parallel):** All seven agents run simultaneously via `Promise.all`. Each agent reviews the spec context through its specialist lens and returns a full review. The frontend tracks per-agent status via SSE events (`agentStart`, `agentDone`).

**Phase 2 — Lead Architect Synthesis (streamed):** All seven specialist reviews are passed to a synthesis prompt. The output streams to the client via SSE `content` events and is rendered as markdown.

#### The Seven-Agent Panel (`artifacts/api-server/src/agents/index.ts`)

| ID | Name | Role |
|---|---|---|
| `cicd` | 🔧 CI/CD Engineer | Deployment pipelines, auth, environment parity, trip hazards |
| `ui-architect` | 🖥️ UI Architect | Frontend framework, rendering strategy, ADRs, budget-tier calibration |
| `devops-architect` | ⚙️ DevOps Architect | IaC, container orchestration, observability, release safety |
| `technical-writer` | ✍️ Technical Writer | Implementation clarity, terminology, flags [UNRESOLVED] gaps |
| `sentinel` | 🛡️ SENTINEL | Security baseline, threat model, pipeline gate manifest, versioned tools |
| `perf-agent` | ⚡ Performance Engineer | Latency analysis, bottleneck hierarchy, perf verdicts (APPROVED/CONCERN/BLOCKING) |
| `skeptical-architect` | 🔍 Skeptical Architect | Adversarial review, overall verdict, complexity budget, agentic-specific risks |

To add a new agent: add an entry to the `AGENTS` array in `src/agents/index.ts`. No other changes required. The synthesis prompt already references all seven specialists by role.

#### SSE Event Schema

- `{ phase: "specialists" | "synthesis", message: string }` — phase announcements
- `{ agentStart: id, agentName: string, icon: string }` — agent starting
- `{ agentDone: id, agentName: string, icon: string }` — agent finished
- `{ content: string }` — streamed synthesis text chunk
- `{ done: true }` — generation complete
- `{ error: string }` — error during generation

### `lib/integrations-anthropic-ai` (`@workspace/integrations-anthropic-ai`)

Replit AI Integrations wrapper for Anthropic Claude. Provides a pre-configured `anthropic` client using `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (automatically provisioned, no user API key needed). Also includes batch processing utilities and DB schema for conversations/messages.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
