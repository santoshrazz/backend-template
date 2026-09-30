# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start:dev          # dev server via nodemon + ts-node (NODE_ENV=development, watches src/)
pnpm build              # tsc compile to dist/
pnpm start              # run compiled server (node dist/bin/www.js)
pnpm lint               # eslint .
pnpm lint:fix           # eslint . --fix

pnpm migrate:create <name>   # scaffold a new migration in src/migrations
pnpm migrate:up               # apply pending migrations
pnpm migrate:down             # roll back last migration
pnpm migrate:status           # show applied/pending migrations
pnpm migrate:reset            # revert all migrations
```

There is no test suite configured (`pnpm test` is a stub that exits 1) and no single-test command.

Package manager is pnpm (per README); a `package-lock.json` also exists but CI (`.github/workflows/build.yml`) runs `npm ci --ignore-scripts` + `npm run build`. Husky's pre-commit hook runs `npm run lint`.

## Architecture

Layered Express app: **routes → dispatcher → controller → service**, versioned under `/v1`.

- `src/bin/www.ts` is the real entry point (not `app.ts`): it loads env vars first (must happen before any other import touches `process.env`), then calls `initializeEnvironment()` (DB connect + run startup migrations, from `src/init/init.ts`), then forks one cluster worker per CPU (`cluster.fork()`) — except in development, where it runs single-process. Each worker calls `app.listen`.
- `src/app.ts` wires global middleware (JSON body parsing, `loggerMiddleware`, urlencoded) and mounts `src/routes` at `/v1`, then `globalErrorHandler` last.
- Routes (`src/routes/v1/<feature>/`) never call controllers directly — every route handler wraps the controller in `dispatcher(req, res, next, fn)` (`src/middleware/dispatcher.ts`), which awaits the controller, runs the return value through `camelize`, and sends it as JSON with `statusCodes.SUCCESS`. Controllers therefore just `return` data (not `res.json(...)`) and `catch`+`next(error)` on failure.
- Controllers (`src/controllers/v1/<feature>/`) are thin: validate/extract from `req`, delegate to a service class, return its result.
- Services (`src/services/<feature>/`) hold business logic as classes (e.g. `General`) and are where errors get normalized into `AppError` (`src/utils/errorHandler.ts`) with a status code from `src/utils/status-codes.ts`.
- Errors thrown anywhere in the chain land in `globalErrorHandler` (`src/middleware/globalErrorHandler.ts`), which unwraps `AppError`, special-cases `CastError`/`ValidationError`, and only includes `stack` when `NODE_ENV === "development"`.
- Each layer directory (`controllers/`, `services/`, `routes/`, and their `v1/` and per-feature subfolders) re-exports through an `index.ts` barrel — import from the nearest barrel (e.g. `../../../services`), not the concrete file, matching the existing `general` feature.

### Adding a new feature (e.g. `foo`)

1. `src/services/foo/foo.ts` — class with methods, throws `AppError`; export via `src/services/foo/index.ts` and re-export from `src/services/index.ts`.
2. `src/controllers/v1/foo/foo.ts` — thin async functions calling the service; barrel through `index.ts` files up to `src/controllers/index.ts`.
3. `src/routes/v1/foo/foo.ts` — `Router()` with each handler wrapped via `dispatcher`; mount it in `src/routes/v1/index.ts` with `app.use("/foo", fooRoute)`.

### Config & environment

- `src/config/load-env.ts` loads, in order, `.env.<NODE_ENV>`, `.env.worktree`, `.env.local` (later files override earlier ones via `dotenv`'s `override: true`); this must run before `src/config/db.ts` (which reads `DB_*` via `getOrThrow`, throwing if unset) or anything else that reads env vars.
- `src/config/db.ts` builds the Sequelize instance; SSL dialect options are applied except when `NODE_ENV === "production"`.
- `src/config/migrator.ts` configures Umzug against `src/migrations/*.ts` glob, using `SequelizeStorage` for the migrations table. Migrations run automatically on startup (`src/init/init.ts`) in addition to being runnable via the `migrate:*` scripts (`src/scripts/run-migration.ts`).
- Migration files export `up`/`down` taking `{ context }` where `context` is `{ _sequelize, _queryInterface }` (see `src/config/migrator.ts`) — see `src/migrations/0001-create-user.ts` for the pattern. `src/scripts/new-migration.ts`'s generated template types the context as `{ sequelize, queryInterface }` but destructures the underscore names, so fix the type when using a scaffolded file.
- Migrations glob is `process.cwd()/src/migrations/*.ts`, so they only load where `src/` exists and ts files are loadable (dev / `migrate:*`); the compiled `pnpm start` build runs startup migrations the same way, so it needs `src/` and a ts loader at runtime.

### Cross-cutting pieces

- **Validation**: `src/middleware/validator.ts` looks up a Joi schema in the exported `schemas` map by key `<path after /v1, "/" and "-" → "_">_<method>` (e.g. `POST /v1/upload/single` → `upload_single_post`); register schemas there from the owning route file. No schema = passthrough.
- **Rate limiting**: `src/middleware/rateLimiter.ts` lazily uses a Redis store if `REDIS_URL` is set and reachable, else in-memory.
- **Uploads**: `src/utils/upload.ts` talks to S3; the client is built lazily, so `AWS_*` env vars are only required once an upload/file route is hit.
- **Logging**: `src/utils/logger.ts` is a console-only pino logger (`LOG_LEVEL` to tune); prefer it over `console.log` in new code.
- **Probes**: `/health` (liveness) and `/ready` (DB + Redis if in use, 503 otherwise) are mounted in `app.ts` *outside* `/v1` so the API rate limiter never throttles them.
- **Error handler**: logs every error with stack via pino; 5xx messages are replaced with a generic one unless `NODE_ENV=development`. Unmatched routes hit a catch-all 404 `AppError`. Logger redacts password/token-style keys in request/response bodies (extend `SENSITIVE_KEYS` in `utils/logger.ts`).
- **Process safety**: `unhandledRejection`/`uncaughtException` log and exit (workers drain first). In production, startup fails if `REDIS_URL` is set but unreachable.
- **Deploy env vars**: `TRUST_PROXY` (`true`/hop count/subnets; required behind a LB or every client shares one rate-limit bucket), `DB_SSL_CA` (PEM, for production DB cert verification), `DB_SSL_REJECT_UNAUTHORIZED=false` (explicit opt-out).
- Docker files live in `docker/` (`Dockerfile`, `Docker-compose.yml`, `docker-compose-dev.yml`).

### Style

Prettier enforces tabs, 4-width, semicolons, trailing commas (`.prettierrc`). ESLint (`eslint.config.mts`) is flat-config, TS-aware, with `no-unused-vars` and `no-explicit-any` as warnings (not errors) — existing code uses `any` liberally in error handling.
