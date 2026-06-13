# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Pere Tántico" — an internal admin dashboard + WhatsApp chatbot for a Colombian logistics/services business that fulfills **health (`salud`)** and **notarial (`notarial`)** service requests via delivery distributors (`repartidores`). The React dashboard is for staff (admin / distributors); end users (`applicants`) interact entirely through a WhatsApp bot driven by an AI agent. UI text and most domain vocabulary are in **Spanish** — match that when writing user-facing strings.

- **Frontend**: React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui (new-york style), React Router v7, TanStack Query, Zustand.
- **Backend**: [Convex](https://convex.dev) (`convex/`) — database, queries/mutations/actions, HTTP webhooks, cron, file storage, and auth all live here.
- **AI**: `@convex-dev/agent` component wrapping an OpenAI model, plus Google Gemini for media/vision. WhatsApp messaging via **YCloud**.

## Commands

```bash
bun install                 # install (bun is the package manager — bun.lock is committed)
npm run dev                 # runs convex dev + vite concurrently (the normal dev loop)
npm run dev:vite            # frontend only
npm run dev:convex          # backend only (also: npm run convex)
npm run build               # tsc -b && vite build
npm run lint                # eslint .
npm run test                # vitest run (one-shot)
npm run test:watch          # vitest watch

npx vitest run tests/integration/chatBehavior.tdd.test.ts   # run a single test file
npx vitest run -t "progress question"                       # run tests matching a name

npm run seed                # npx convex run seed:seedUsers  (full demo data)
npm run seed:admin          # npx convex run seedAdmin:seedAdmin  (admin user only)
```

There is no test runner wired into `lint`/`build`; run `npm run test` explicitly. Tests run in a plain Node environment (`vitest`, `environment: node`) and import pure helper modules — they do **not** spin up a Convex backend (see Testing below).

## Path aliases

- `@/` → `src/` and `@convex/` → `convex/` (configured in `vite.config.ts` and `vitest.config.ts`).
- Frontend reads `import.meta.env.VITE_CONVEX_URL`; Convex functions read `process.env.*`.

## Backend architecture (`convex/`)

Convex is the whole backend. `schema.ts` is the source of truth for the data model — read it first. Key clusters of tables:

- **Auth & roles**: `@convex-dev/auth` (`authTables`) with a Password provider + email OTP reset (`ResendOTP.ts`, `auth.ts`). Roles (`roles`, `userRoles`) gate the dashboard; the UI checks for `"distributor"`/`"Repartidor"` to hide admin routes.
- **Domain**: `profiles` (people), `services` + `serviceFields` (configurable service catalog with dynamic fields), `requests` + `requestData` + `attachments` (a request is a service order with per-field values and files), `distributors`, `coverageAreas`, `transportationTypes`, `payments`/`paymentRequests`, `specialDates`.
- **WhatsApp / bot**: `conversations`, `ycloudMessages`, `ycloudHandoffs` (mute bot for human handoff), `botApplicants`, `botSessions` (per-contact bot state machine), `ycloudStatus`/`ycloudProcessedEvents`/`ycloudProcessingLocks` (idempotency + locking), `requestShareLinks`.
- **Queue system**: `inboundQueue`, `outboundQueue`, `deadLetterQueue`, `queueMetrics`.

### Message flow (the core of the app)

```
YCloud webhook → convex/http.ts (/webhooks/ycloud)
  → verifies HMAC signature (ycloud-signature header) or legacy secret
  → normalizes message (text/image/video/audio/document/sticker/location)
  → queue.enqueueInbound  (idempotent by eventId, debounced per contact)
  → schedules queueWorkers.processInboundQueue
       → downloads batched media to Convex storage
       → invokes the AI agent (ycloudBot.ts)
       → enqueues replies to outboundQueue → sent back to YCloud
```

- **`http.ts`** — HTTP routes. `/webhooks/ycloud` (inbound WhatsApp) and `/public/request` (token-based public request lookup). Webhook auth: HMAC-SHA256 over `${timestamp}.${rawBody}` against `WEBHOOK_SECRET`, with legacy `x-webhook-secret`/Bearer fallback.
- **`queue.ts` / `queueWorkers.ts`** — async processing with **debounce** (5s text / 15s media to batch rapid-fire messages), retries with backoff, dead-letter queue, and hourly metrics. `crons.ts` runs `queueWorkers.cleanupQueue` every 60 min. Always go through the queue; don't call the bot directly from the webhook.
- **`ycloudBot.ts`** (large) — orchestrates an inbound turn: loads/creates the bot session, runs the agent, and syncs the result back into `botSessions`. **`ycloudBot.helpers.ts`** holds the pure decision logic (off-topic filtering, service shorthand matching, fallback replies) — this is what the tests target.
- **`ycloudState.ts` / `whatsappBotState.ts` / `conversationState.ts`** — bot/session/conversation state mutations and queries, including `mergeSessionFlow`.

### AI agent (`convex/system/`)

- **`system/ai/agents/tanticoAgent.ts`** — the "Tantico" agent: `@convex-dev/agent` `Agent` over `openai.chat("gpt-4o-mini")`, `maxSteps: 5`, with a fixed tool set.
- **`system/ai/tools/*`** — agent tools, each its own file: `searchProfileByNumber`, `listServices`, `getServiceFields`, `validateServiceField`, `createApplicantProfile`, `createRequest`, `getRequestStatus`, `getSpecialDateToday`.
- **`system/ai/constants.ts` / `system/tanticoPrompt.ts`** — the agent system prompt and constants (e.g. `UNSUPPORTED_INTENT_REPLY`). User-facing fallback strings are constants and are asserted verbatim in tests — don't reword them casually.
- **`system/gemini.ts`** — Google Gemini for media/document understanding.

### Request flow engine (`convex/system/requestFlow.ts`)

A service can run in one of two `workflowMode`s, stored on the `services` row:

- **`legacy`** — older free-form flow.
- **`deterministic`** — declarative `workflowConfig` (branches with `rules[].fieldId`, `fieldIds[]`, payment methods, address strategy). `resolveRequestFlow()` computes the current `FlowStage` (`service → branch → address → fields → payment → receipt → admin_review → complete`), pending fields, and payment/admin-validation status. Branch rules reference **fieldId, not code**, which is why seed uses a two-pass insert (insert fields → capture IDs → patch service with `workflowConfig`). Toggled globally by `ENABLE_DETERMINISTIC_REQUESTS` (default on; `"false"`/`"0"` disables). Mirrored client-side in `src/lib/deterministic-requests.ts`.

### Seeding & admin

`seed.ts` (large) builds full demo data including deterministic service definitions; `seedAdmin.ts` creates the admin user from env. `migrate_services.ts`, `fixAdmin.ts`, `findAccount.ts`, `debug.ts` are operational/maintenance scripts run via `npx convex run`.

### Environment variables (Convex deployment)

Set in the Convex dashboard, not `.env`. Referenced in code: `WEBHOOK_SECRET`, `WEBHOOK_TOLERANCE_SECONDS`, `YCLOUD_API_KEY`, `YCLOUD_PHONE_NUMBER`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`/`ADMIN_NAME`/`ADMIN_PASSWORD`, `ENABLE_DETERMINISTIC_REQUESTS`, `CONVEX_SITE_URL`.

## Frontend architecture (`src/`)

- **`main.tsx`** → `BrowserRouter` → `ConvexClientProvider` (`ConvexAuthProvider`) → `App`. `App.tsx` defines all routes inside `QueryClientProvider`.
- **Feature-folder structure** under `src/features/<feature>/` with `pages/`, `components/`, `hooks/`, `utils/`, `types/`. Features: `auth`, `home` (dashboard, largest), `client`, `config`, `costs`, `distributors`, `inbox` (WhatsApp conversation UI), `reports`, `users`.
- **Routing/guards**: `PublicGuard` + `AuthLayout` for `/iniciar-sesion`, `/restablecer-contraseña`, `/nueva-contraseña`; `PrivateRoutes` + `DashboardLayout` for the app; `RoleGuard excludedRoles={["distributor","Repartidor"]}` wraps admin-only pages. Route paths are Spanish.
- **Shared**: `src/components/ui/` (shadcn primitives — generated, prefer editing via the pattern not by hand), `src/components/{common,layout,navigation}`, `src/lib/utils.ts` (`cn`), `src/hooks/use-mobile.ts`, `src/constants/`, `src/types/`. Add shadcn components per `components.json` (aliases: `@/components/ui`, `@/lib/utils`).
- Data is fetched with Convex React hooks (`useQuery`/`useMutation` from generated `@convex/_generated/api`); TanStack Query is also present (5-min `staleTime`, no refetch on focus).

## Testing

Tests live in `tests/` and run under Vitest in Node — they exercise **pure logic** extracted from Convex functions (helpers in `*.helpers.ts`, `requestFlow.ts`, tool input/output shapes), not a live backend.

- `tests/unit/` — helper-level units (`conversationState.helpers`, `whatsappBotState.helpers`, `requestFlow`, `requestFlowAdapter`).
- `tests/tools/` — agent tool behavior (`validateServiceField`, `createRequest`).
- `tests/integration/` — bot turn behavior and deterministic flow.
- `tests/conversation/` — scenario-style chat tests with a fixture-driven harness (`tests/conversation/harness.ts`, `fixtures.ts`).
- `tests/harness/` — shared `toolRunner` / `scenarioLogger` used to simulate agent runs.

**Chat behavior is contract-tested via TDD.** Per `docs/chat-filters-tdd.md`: when fixing a bot/chat bug, first add a regression test (`reproduces and protects: <bug>`) with the real chat text (scrubbed of sensitive data), then make the minimal logic change. Off-topic guarding, progress-question handling, service shorthand selection, and `validateServiceField` strictness are all locked down by tests and depend on exact constant reply strings.

## Conventions & gotchas

- **`bun` is the package manager** (`bun.lock`), but the npm scripts above run fine with `npm`. Don't introduce `package-lock.json`/`yarn.lock`.
- **`dist/` is build output** and currently tracked-as-deleted in git — don't commit build artifacts.
- Webhook handlers must stay **idempotent** (dedup by `eventId`) and fast — real work is deferred to the queue/scheduler.
- The `convex/_generated/` directory is generated by `convex dev`; never edit it.
- `openspec/` holds design docs for in-flight changes (e.g. the deterministic service-field configuration); consult them for the "why" behind workflow/seed decisions.
