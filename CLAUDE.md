# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start:dev          # dev server via nodemon + ts-node (NODE_ENV=development, watches src/)
pnpm build              # tsc -p tsconfig.build.json -> dist/ (excludes *.test.ts)
pnpm test               # node:test via ts-node, runs src/**/*.test.ts
pnpm start              # run compiled server (node dist/bin/www.js)
pnpm lint               # eslint .
pnpm lint:fix           # eslint . --fix

pnpm migrate:create <name>   # scaffold a new migration in src/migrations
pnpm migrate:up               # apply pending migrations
pnpm migrate:down             # roll back last migration
pnpm migrate:status           # show applied/pending migrations
pnpm migrate:reset            # revert all migrations
```

Tests use the built-in `node:test` runner (no extra deps) and live next to the code as `src/**/*.test.ts` (see `src/__tests__/`). Run one file with `node --require ts-node/register/transpile-only --test src/__tests__/auth.test.ts`. Tests set their own env vars and import modules dynamically afterwards (`db.ts` reads `DB_*` at import time); nothing connects to a real DB.

Package manager is pnpm only; Node >= 22 (`engines`, Dockerfile and CI all use 22). Husky's pre-commit hook runs `pnpm lint`.

CI (`.github/workflows/build.yml`): every push/PR runs lint + test; a push to `main` then builds `docker/Dockerfile` (the `tsc` build happens inside it) and pushes `ghcr.io/<owner>/<repo>:latest` and `:sha-<short>` to GHCR. CI does not build the app outside Docker.

## Architecture

Layered Express app: **routes → dispatcher → controller → service**, versioned under `/v1`.

- `src/bin/www.ts` is the real entry point (not `app.ts`): it loads env vars first (must happen before any other import touches `process.env`), then the primary process runs `initializeEnvironment()` (`src/init/init.ts`: DB connect → Redis reachability check → startup migrations) and **only after it succeeds** forks workers. Worker count is `getWorkerCount()`: 1 in development, otherwise `os.availableParallelism()`. `PORT` goes through `normalizePort()` (blank → 3000, invalid → throws at startup). Each worker calls `listen`.
- `src/app.ts` wires `trust proxy`, `helmet`, JSON/urlencoded parsing (limit `BODY_LIMIT`, default `100kb`; uploads go through multer instead), `loggerMiddleware`, `validator`; mounts `/health` and `/ready`, then `/v1` (behind `apiLimiter`), `/files/:key`, and `globalErrorHandler` last. There is **no catch-all 404 handler**, so unknown routes get Express's default HTML 404.
- Routes (`src/routes/v1/<feature>/`) never call controllers directly — every route handler wraps the controller in `dispatcher(req, res, next, fn)` (`src/middleware/dispatcher.ts`), which awaits the controller, runs the return value through `camelize`, and sends it as JSON with `statusCodes.SUCCESS`. Controllers therefore just `return` data (not `res.json(...)`); rejections are forwarded to `next(error)` by `dispatcher`, so controllers need no try/catch.
- Controllers (`src/controllers/v1/<feature>/`) are thin: extract from `req`, delegate to a service class, return its result.
- Services (`src/services/<feature>/`) hold business logic as classes (e.g. `General`) and are where errors get normalized into `AppError` (`src/utils/errorHandler.ts`) with a status code from `src/utils/status-codes.ts`.
- Each layer directory (`controllers/`, `services/`, `routes/`, and their `v1/` and per-feature subfolders) re-exports through an `index.ts` barrel — import from the nearest barrel (e.g. `../../../services`), not the concrete file, matching the existing `general` feature.

### Adding a new feature (e.g. `foo`)

1. `src/services/foo/foo.ts` — class with methods, throws `AppError`; export via `src/services/foo/index.ts` and re-export from `src/services/index.ts`.
2. `src/controllers/v1/foo/foo.ts` — thin async functions calling the service; barrel through `index.ts` files up to `src/controllers/index.ts`.
3. `src/routes/v1/foo/foo.ts` — `Router()` with each handler wrapped via `dispatcher`; mount it in `src/routes/v1/index.ts` with `app.use("/foo", fooRoute)`. Add `authenticate` before the handler to protect a route.

### Config & environment

- `src/config/load-env.ts` loads, in order, `.env.<NODE_ENV>` (default `development`), `.env.worktree`, `.env.local` (later files override earlier ones via `dotenv`'s `override: true`); this must run before `src/config/db.ts` (which reads `DB_*` via `getOrThrow`, throwing if unset) or anything else that reads env vars. All `.env*` files are gitignored.
- `src/config/db.ts` builds the Sequelize instance (pool `max: 5` per worker, hardcoded). In `NODE_ENV=production` SSL is required and the server cert is verified: set `DB_SSL_CA` (PEM, literal `\n` allowed) if the provider's CA isn't in the system store, `DB_SSL_REJECT_UNAUTHORIZED=false` to skip verification, or `DB_SSL=false` to disable SSL entirely (for a Postgres without TLS).
- `src/config/migrator.ts` configures Umzug with a glob resolved **relative to the file** (`../migrations/*<ext>`, where `<ext>` is `.ts` under ts-node and `.js` from `dist/`), so the compiled build runs `dist/migrations/*.js` without needing `src/`. Migration names are always recorded as `<base>.ts` so DBs migrated under either runtime share history. Migrations run automatically on startup in addition to the `migrate:*` scripts (`src/scripts/run-migration.ts`).
- Migration files export `up`/`down` taking `{ context }` where `context` is `{ _sequelize, _queryInterface }` — see `src/migrations/0001-create-user.ts`. `src/scripts/new-migration.ts`'s generated template types the context as `{ sequelize, queryInterface }` but destructures the underscore names, so fix the type when using a scaffolded file.

### Cross-cutting pieces

- **Auth**: `authenticate` (`src/middleware/auth.ts`) requires `Authorization: Bearer <jwt>` signed HS256 with `JWT_SECRET` and a `sub` claim; it sets `req.user` (`AuthUser`: `id` = `sub` plus the other claims) and responds 401 for missing/invalid/expired tokens (algorithm is pinned to HS256). A missing `JWT_SECRET` throws (500) on first use rather than at boot. It is not applied to any existing route, and there is no login/token-issuing flow or role check yet. The request logger includes `userId` once `req.user` is set.
- **Validation**: `src/middleware/validator.ts` looks up a Joi schema in the exported `schemas` map by key `<path after /v1, "/" and "-" → "_">_<method>` (e.g. `POST /v1/upload/single` → `upload_single_post`); register schemas there from the owning route file. No schema = passthrough.
- **Rate limiting**: `src/middleware/rateLimiter.ts` lazily uses a Redis store if `REDIS_URL` is set and reachable, else in-memory (per worker — the limit is effectively multiplied by the worker count). In production, startup fails if `REDIS_URL` is set but unreachable. `authLimiter` (5/15min) exists but isn't applied anywhere yet; `apiLimiter` (100/15min) covers `/v1`. Set `TRUST_PROXY` (`true`, a hop count, or subnets) behind a load balancer or every client shares one bucket.
- **Uploads**: `src/utils/upload.ts` talks to S3; the client is built lazily, so `AWS_*` env vars are only required once an upload/file route is hit.
- **Logging**: `src/utils/logger.ts` is a console-only pino logger (`LOG_LEVEL` to tune); prefer it over `console.log` in new code (`www.ts`/`init.ts` still use `console.*` in places). Request/response bodies are logged, with password/token-style keys redacted (extend `SENSITIVE_KEYS`; wildcards cover at most two nesting levels).
- **Error handler**: `globalErrorHandler` logs every error with its stack via pino, handles `AppError`/`CastError`/`ValidationError`, replaces 5xx messages with a generic one unless `NODE_ENV=development`, and only includes `stack` in development.
- **Probes**: `/health` (liveness) and `/ready` (DB + Redis if in use; 503 otherwise) are mounted in `app.ts` _outside_ `/v1` so the API rate limiter never throttles them.
- **Process safety**: `unhandledRejection`/`uncaughtException` are logged and the process exits (workers drain via the graceful-shutdown path first; the primary restarts crashed workers).

### Docker

`docker/Dockerfile` is a two-stage build (Node 22 alpine) that runs as the non-root `node` user with a `HEALTHCHECK` on `/health`; it does not set `NODE_ENV`, so the deployment must set it. `.dockerignore` keeps `.env*` and `node_modules` out of the build context. `docker/docker-compose.yml` pulls the GHCR image (`APP_IMAGE` overrides it) and runs it with Redis, reading `../.env.production`; Postgres is external (set `DB_HOST` there). `docker/docker-compose-dev.yml` is only a local Postgres. Inside the container `DB_HOST=localhost` is the container itself, so set `DB_HOST` to the database's real host (`host.docker.internal` for a Postgres on the Docker host).

Env vars the app reads: `DB_HOST`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD` (required at import), `PORT`, `NODE_ENV`, `LOG_LEVEL`, `BODY_LIMIT`, `TRUST_PROXY`, `REDIS_URL`, `JWT_SECRET`, `AWS_S3_BUCKET`/`AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (lazy), `DB_SSL`/`DB_SSL_CA`/`DB_SSL_REJECT_UNAUTHORIZED` (production DB TLS). Compose-only: `APP_IMAGE`, `APP_PORT`.

### Style

Prettier enforces tabs, 4-width, semicolons, trailing commas (`.prettierrc`). ESLint (`eslint.config.mts`) is flat-config, TS-aware, with `no-unused-vars` and `no-explicit-any` as warnings (not errors) — existing code uses `any` liberally in error handling.
