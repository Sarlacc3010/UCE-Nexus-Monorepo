# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

UCE-Nexus is a Smart-Campus integrated university information system (SIIU) built as a **polyglot microservices + micro-frontends monorepo**, orchestrated with **Turborepo** and npm workspaces (`apps/*`, `services/*`, `packages/*`). Services are deliberately implemented in different languages/stacks per team ownership (Node/TS, Go, Python, Rust), and are stitched together at the edge by a single API Gateway and at the UI layer by Webpack/Vite Module Federation.

## Common Commands

Run from the repo root unless noted:

```bash
npm install                 # install all workspaces
npm run dev                 # hybrid mode: docker-compose for backends+infra, turbo for frontends (see scripts/dev.js)
npx turbo run dev:local     # run everything locally without Docker (each app/service also has a dev:local script)
npm run build               # turbo run build (respects dependency graph, caches dist/**, build/**, target/**)
npm run lint                # turbo run lint
npm run test                # turbo run test (fans out to every workspace's own test runner)
```

`npm run dev` (see [scripts/dev.js](scripts/dev.js)) starts `infra/docker/docker-compose.local.yml` for backend services + databases/brokers, and in parallel runs `turbo run dev --filter=web-host --filter=web-academic --filter=web-campus --filter=web-chatbot --filter=web-payments` for the frontends on the host machine — this avoids gRPC/DB race conditions from an all-Docker start.

### Per-service commands

Because of the polyglot stack, `npm run test`/`build` shell out to different toolchains per workspace:

- **Node/TS services** (`ms-01-gateway`, `ms-02-identity`, `ms-03-enrollment`, `ms-04-payment-write`, `ms-05-payment-read`, `ms-10-audit`): `ts-node-dev --respawn src/index.ts` for dev, `tsc` for build.
  - `ms-01-gateway` has real Jest tests: `cd services/ms-01-gateway && npx jest --forceExit`, or a single file with `npx jest tests/gateway.test.ts`. Other Node services currently have no or placeholder tests.
- **`ms-06-booking`** (Go/gRPC): `go run main.go`, `go build -o target/booking main.go`, `go test ./...`.
- **`ms-09-geocampus`** / **`ms-11-catalog`** (Rust): `cargo run`, `cargo build --release`, `cargo test`. `ms-11-catalog` requires `protoc` on PATH to compile locally (falls back to a warning + no-op outside Docker if missing).
- **`ms-07-notifications`** / **`ms-08-ai-agent`** (Python/FastAPI): `uvicorn main:app --reload --port <port>`. `ms-08-ai-agent` tests: `pytest test_main.py -v` (run inside its `venv`).

### Frontend apps (Vite + Module Federation)

Each app under `apps/*` has: `dev` (`vite build && vite preview` — federation remotes need a built `remoteEntry.js`, so plain `vite` HMR won't expose them), `dev:local` (plain `vite`, faster for isolated UI work but remotes may not resolve), `build` (`tsc -b && vite build`), `lint` (`eslint .`).

## Architecture

### Micro-frontends (Module Federation, ports 5000–5004)

- `web-host` (**5000**) — shell app: layout, sidebar, routing, and JWT/session state. Declares itself the federation *host* and consumes remotes from the other four apps (`academic`, `gateway`→web-campus, `chatbot`, `payments`) via `remotes` in [apps/web-host/vite.config.ts](apps/web-host/vite.config.ts).
- `web-academic` (**5001**) — student dashboard: schedule, grades, lab booking. Exposes `BookingApp`, `DashboardApp`, `AcademicApp` as federation remotes.
- `web-campus` (**5002**) — service health/JWT inspector + Mapbox-based interactive campus map (talks to `ms-09-geocampus`).
- `web-chatbot` (**5003**) — AI assistant UI (talks to `ms-08-ai-agent` via the gateway).
- `web-payments` (**5004**) — payments/tuition UI (talks to `ms-04`/`ms-05`).
- `apps/desktop-app` — placeholder, not yet implemented.

In dev, `web-host`'s Vite server proxies `/academic-mf`, `/campus-mf`, `/chatbot-mf`, `/payments-mf` to the other apps' ports, and `/api`+`/ws` to the gateway on `:3000`. Every remote federation config shares a singleton `react`/`react-dom` (must stay on matching major version — currently pinned to 19.2.6 via root `package.json` `overrides`).

### Backend: API Gateway as BFF (ms-01-gateway, port 3000)

[services/ms-01-gateway/src/index.ts](services/ms-01-gateway/src/index.ts) is the single edge for the frontends: custom JWT auth/RBAC middleware (`authenticateJWT`, `requireRole`), an in-memory feature-toggle gate per module, and route-based proxying to every downstream service:

- `/api/identity` → ms-02-identity (proxied *before* `express.json()` so the body stream isn't consumed)
- `/api/login`, `/api/refresh` → BFF-style proxy to ms-02-identity, avoiding browser CORS issues
- `/api/reservas` → gRPC client call to ms-06-booking (loads `booking.proto` directly)
- `/api/academic` → ms-03-enrollment (manual fetch-based proxy, emits Kafka audit events on GET)
- `/api/payments` → routes writes (`/intent`, `/confirm`) to ms-04-payment-write, everything else to ms-05-payment-read (CQRS split)
- `/api/chat` (public) and `/api/chat/secure` (JWT-required) → ms-08-ai-agent
- `/api/geocampus`, `/ws/geocampus` → ms-09-geocampus (HTTP + WS upgrade proxy)
- `/api/audit` → ms-10-audit, forwarding decoded roles via `x-user-roles` header
- `/api/telemetry/dashboard`, `/api/system/config` → superAdmin-only aggregation/config endpoints

Downstream services generally trust the gateway and don't re-verify JWTs themselves except where explicitly needed — the gateway is the security boundary. All gateway audit-relevant actions are emitted onto the Kafka `audit_events` topic, consumed by `ms-10-audit`.

### Services map

| Service | Stack | Port | Role |
|---|---|---|---|
| ms-01-gateway | Node/Express | 3000 | Edge gateway / BFF / JWT auth / gRPC+REST proxy |
| ms-02-identity | Node/Express | 4002 | Custom auth (bcrypt + JWT), Keycloak-adjacent IAM |
| ms-03-enrollment | Node/Express | 3001 | Academic structure & enrollment (Postgres, Kafka consumer) |
| ms-04-payment-write | Node/Express | 4004 | Payment commands (CQRS write side, Stripe, PDF receipts) |
| ms-05-payment-read | Node/Express | 4005 | Payment queries (CQRS read side, Redis cache) |
| ms-06-booking | Go/gRPC | 50051 | Lab/resource booking engine (Redis, RabbitMQ, Postgres) |
| ms-07-notifications | Python/FastAPI | 8000 | Async email/alerts via RabbitMQ consumer |
| ms-08-ai-agent | Python/FastAPI | 8001 | Multi-LLM chatbot orchestrator: RAG + tool calling (see below) |
| ms-09-geocampus | Rust | 8009 | Campus maps/coordinates, MQTT indoor telemetry |
| ms-10-audit | Node/Express | 4010 | Security/audit log sink (MongoDB, Kafka consumer) |
| ms-11-catalog | Rust/gRPC | 50052 | Course/resource catalog (Postgres) |

Each business domain that needs its own datastore gets a dedicated Postgres instance (`postgres-app`, `postgres-catalog`, `postgres-enrollment`, `postgres-geocampus`, `postgres-booking`, `postgres-iam`) rather than a shared schema — see [infra/docker/docker-compose.local.yml](infra/docker/docker-compose.local.yml) for the full topology (Kafka+Zookeeper, RabbitMQ, Redis, MQTT broker, MongoDB, pgAdmin all included for local dev).

### ms-08-ai-agent internals

Structured as `agent/` (orchestrator, intent classifier, RAG, role-scoped tool sets: `tools_admin.py`/`tools_student.py`/`tools_public.py`, B2 sync), `llm/` (multi-provider router), `middleware/` (auth, rate limiting), and `knowledge_base/` (markdown + PDF source docs embedded for RAG). Chroma is used as the local vector store (`chroma_db/`).

### Infrastructure & deployment

- IaC lives in `infra/terraform` (`modules/vpc`, `modules/compute`, per-env `environments/{qa,prod}`, plus one-time `bootstrap_qa`/`bootstrap_prod` stacks). AWS ASGs + ALBs across two public subnets, Blue/Green via `create_before_destroy`.
- No Ansible: EC2 `user_data.sh` (via Terraform) preps the Docker environment; GitHub Actions deploys straight over SSH through a Bastion host (`infra/docker/docker-compose.db.yml` on the DB server, `docker-compose.prod.yml` on the app server).
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)): TruffleHog secret scan → path-filtered per-service Docker builds (only rebuilds what changed, or everything on `main`/`QA`/`workflow_dispatch`) → `npm run test` (turbo) + `cargo test` (Rust services) → k6 load test (allowed to fail in CI) → deploy job (only on push to `QA` or a `v*` tag), which discovers the QA app server's private IP via boto3/ASG tag lookup and deploys through the bastion.
- Branches: `Dev` (default working branch) → `QA` (auto-deploys to QA env) → tag `v*` (deploys to Production). PRs target `main`/`Dev`/`QA`.

## Conventions to know

- Gateway source comments and log/error messages are written in **Spanish**; follow that convention when touching `ms-01-gateway`.
- Services default to `NODE_ENV`/`ENV` reads with hardcoded `localhost` fallbacks for every downstream URL — when adding a new inter-service call, follow the same `process.env.X_SERVICE_URL || 'http://localhost:PORT'` pattern so the service still runs standalone outside Docker.
- New downstream integrations in the gateway should also emit a Kafka `audit_events` message (see `emitAuditEvent`) if the action is admin-facing or security-relevant.
- Payment writes vs. reads are intentionally split (CQRS) — don't add read endpoints to `ms-04-payment-write` or write endpoints to `ms-05-payment-read`; route through the gateway's `/api/payments` split instead.
