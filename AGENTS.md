# AGENTS.md

## Project

Build a REST backend for automated garden management.

Chosen stack:

- NestJS 12 with TypeScript and ES Modules.
- Drizzle ORM with PostgreSQL.
- `@nestjs/config` for application configuration.
- Swagger/OpenAPI for API documentation.
- Vitest and Supertest for testing.
- Oxlint for linting and Prettier for formatting.
- npm as the package manager.

Read `README.md` for implementation status, setup instructions, and architectural decisions. Do not describe planned features as already implemented.

## Documentation and agent tools

- Use Context7 MCP for current library, framework, SDK, API, and CLI documentation.
- Start with `resolve-library-id`, unless an exact library ID is provided, then use `query-docs` with a focused question.
- Prefer documentation matching the installed package versions.
- If Context7 is unavailable or insufficient, consult official documentation directly and disclose the fallback.
- Official NestJS documentation is indexed at https://docs.nestjs.com/llms.txt.
- Official Drizzle documentation is available at https://orm.drizzle.team/docs/overview.
- Use the project-local Drizzle skill in `.agents/skills/drizzle/` when working on schemas, queries, database configuration, or migrations.
- Drizzle MCP is not used. Do not install or configure it unless explicitly requested.
- Verify documentation against installed package versions and project configuration.
- Check documented first-party integrations before adding another library, while preserving the chosen stack.
- If documentation and installed behavior differ, inspect the package types or source and report unresolved uncertainty.

## Implementation conventions

- Organize code by feature using NestJS modules.
- Keep Drizzle table definitions alongside their feature in `*.schema.ts` files.
- Keep controllers focused on HTTP handling and business logic in services.
- Follow existing ESM import conventions.
- Use Vitest APIs such as `vi.fn()` rather than Jest APIs.
- Use the Node.js version declared in `.nvmrc`.
- Add dependencies only when required by the requested functionality.
- Keep setup instructions and significant architectural decisions in `README.md`.
- Implement application bootstrap configuration directly in `src/main.ts`, following the structure of official NestJS documentation examples. This includes the global prefix, Swagger, pipes, CORS, and startup logging when required.
- Do not create separate bootstrap configuration files, setup functions, wrappers, or helpers unless explicitly requested.
- Register Nest modules through the appropriate module imports. Keep Drizzle Kit configuration in the root `drizzle.config.ts`.
- Adapt documentation examples only as needed for installed versions, project requirements, and existing conventions.
- Preserve unrelated changes made by the user.
- **Response serialization:** hide internal fields with a global `ClassSerializerInterceptor` (registered in `src/main.ts`) plus `@Exclude()`/`@Expose()` response DTOs, and convert rows in services with `plainToInstance(ResponseDto, row)`. Do NOT enable `excludeExtraneousValues: true`, which would strip plain-object responses such as health, verify, and OIDC redirects. `userId` is deliberately excluded from garden and plant responses (OWASP); it is exposed on the user's own profile.
- **Ownership scoping:** every repository query filters by the authenticated user. Direct lookups use `and(eq(...userId), eq(...id))`; lookups through a parent use a subquery (`inArray(col, select(...).from(gardens).where(eq(userId)))`) or a relational query. The user id comes from `@CurrentUser()`, never from the request body.
- **One-to-many routes:** use nested routes for parent-scoped operations and flat routes for item operations (e.g. `POST/GET /gardens/:gardenId/plants` alongside `GET/PATCH/DELETE /plants/:id`). Put both controllers in the same feature module, sharing one service.
- **DTOs stay in the HTTP layer.** Controllers and validation use DTOs; repositories are typed only from the schema (`$inferSelect`/`$inferInsert`, `Pick`/`Omit`). Do not import request DTOs into repositories.
- **Relations:** declare table relations once in `src/database/database.ts` with Drizzle v1's `defineRelations()` and pass them to `DrizzleModule.forRootAsync()`; inject the typed `Database` alias instead of `NodePgDatabase`. Relations enable `db.query.*` but do not express aggregates — keep `leftJoin … groupBy` for sums.
- **Timestamps:** store `timestamp with time zone` in UTC and serialize as ISO 8601 UTC. Convert to local time at the presentation layer only; never set a container `TZ` to "fix" offsets.

## Authentication (`@nestjs/authentication`, v0.1.6)

Learned from this package while wiring Google OIDC, sessions, and email verification:

- `globalGuard` is enabled by default: every route returns 401 unless marked `@Public()`.
- A feature only works once its handler/provider is registered from its constructor: `OidcAccountResolver` (`registry.registerHandler('oidc', this)`), `SessionCookieProvider` (`registry.registerProvider(this)`), and `EmailVerificationHandler` (`registry.registerHandler('emailVerification', this)`). Sessions are unrecognized without a `SessionCookieProvider`.
- **Session store:** the default is in-memory. To persist across restarts, implement `SessionStore` and register it with `AuthenticationStorage.registerSource({ sessions: this })` from a provider constructor. Contract rules: `id` is the SHA-256 of the cookie token (the raw token is never stored); `touchSession` is a forward-only conditional update (`WHERE last_active_at < ?`); `deleteSession` returns whether the row was deleted; `createSession` should sweep expired rows.
- **Email verification:** the library generates a 256-bit token, stores only its hash, and passes the token to `handler.send()` inside `link.url`. Its `verify()` rejects anything that is not one of its tokens, so a 6-digit code is delivered by mapping `code → token` in the handler (in-memory), then resolving the code to the token before calling `verify()`. The default link TTL is `24h`; this project sets `ttl: '10m'` because a 6-digit code is guessable. A `1m` resend cooldown (429 with remaining wait) complements the throttler's `5/hour` cap; the latest code replaces previous ones.
- `authenticationStoreContract()` from `@nestjs/authentication/testing` is the contract suite for store implementations; it needs a real database and belongs in the integration tier.

## Database and migrations

- Use `DATABASE_URL` for the database connection. Do not hardcode credentials.
- Keep `.env` ignored and maintain `.env.example` without real secrets.
- Generate migrations through the installed Drizzle Kit and review their SQL.
- Commit schema changes and corresponding migrations together.
- Do not rewrite migrations that have already been applied or shared.
- Do not use schema push as a replacement for the established migration workflow.
- Do not reset databases, delete volumes, or execute destructive migrations without explicit authorization.
- Do not manually modify bundled Drizzle skill files. Refresh them through the installer when needed.
- The user runs `npm run db:generate` and `npm run db:migrate` themselves and reviews the SQL. Generate or apply migrations only when explicitly asked, and never apply them without the user having reviewed the generated SQL.

## Commands and approvals

- Execute commands needed to inspect, implement, and verify changes.
- Use the normal approval mechanism when required, and wait for approval before proceeding with the restricted action.
- If approval is denied or a command cannot run, report it accurately.
- Do not claim that unexecuted checks passed.
- Do not execute destructive operations without explicit authorization.
- Node is installed via nvm. In shells where `node` is not found, prefix commands with the Node path from `.nvmrc` (e.g. `export PATH="/Users/sunnyasin/.nvm/versions/node/v24.22.3/bin:$PATH"`) before running `npm`/`node`.
- The development PostgreSQL container is `automated-garden-postgres-1`; inspect it with `docker exec … psql -U test_user -d automated_garden` rather than assuming schema state.

## Testing and verification

For every feature or bug fix, add unit, integration, and E2E tests where applicable. All three levels are not required for every change; select them based on the behavior and risks involved.

- **Unit tests:** cover business rules, calculations, branches, and failure cases in isolation.
- **Integration tests:** verify interactions between components, including database queries, constraints, and transactions where relevant.
- **E2E tests:** verify HTTP behavior, including validation, authentication, authorization, status codes, and persistence where relevant.

Use multiple levels when each covers a distinct risk. Do not duplicate assertions merely to increase coverage.

Keep unit tests independent of PostgreSQL and external services. Tests that exercise database behavior must use real PostgreSQL in an isolated test environment, never development or production databases.

Repository unit tests are chain-mocked: pass a fake `db` object whose `select`/`insert`/`update`/`delete`/`query` methods return stubbed chains (as in `drizzle-session.store.spec.ts`), and assert the payloads (`.set(...)`, `.values(...)`, `where` args) and the return semantics (row/`undefined`/boolean/throw). These verify query shape, not real SQL; constraints, `ON CONFLICT`, cascades, and concurrency belong in the integration tier.

DTO validation specs mirror the `ValidationPipe` (`transform: true`): run `plainToInstance(Dto, payload)` first, then `validate(instance)`, so the `@Type`/`@Transform` coercion callbacks (number coercion, email normalization) are actually exercised and asserted. Import `'reflect-metadata'` first, and store the `validate()` result in a variable before asserting.

The garden-capacity check is enforced atomically in [plant.repository.ts](src/plant/plant.repository.ts): `createWithCapacity` and `updateWithCapacity` run the check and the write in one transaction and lock the garden row with `SELECT … FOR UPDATE`, so concurrent writes to the same garden serialize and the committed total can never exceed `totalSurfaceArea`.

Integration tests are colocated as `*.integration-spec.ts` and run with `npm run test:integration` against the isolated `automated_garden_test` database (`TEST_DATABASE_URL`). The setup applies migrations on startup and truncates tables between tests; they cover the garden-capacity concurrency case, schema check constraints, and `ON DELETE CASCADE` behaviour.

For garden capacity changes, include a database concurrency test. For irrigation timing, use a controllable clock instead of real-time waits.

Configuration-only changes generally need verification rather than new automated tests. Prefer observable behavior checks over tests that mirror configuration code.

Tests that recreate bootstrap configuration do not verify `src/main.ts` itself. Clearly report this limitation when relevant.

Run checks relevant to each change:

- `npm run lint`
- `npm run format:check`
- `npm run build`
- `npm test`
- `npm run test:e2e` for changes affecting HTTP behavior.

Report checks that passed, checks that could not run, and briefly explain any test level that is not applicable.

## Git

- Read-only Git commands are allowed for inspecting changes.
- Use Conventional Commit messages.
- Include lockfile changes when dependencies change.
- Do not bypass failing Git hooks.
- Create commits only when explicitly requested.
- When asked for commit commands, propose one commit per coherent feature (code, then tests as `test(...)`, then docs as `docs(...)`), and give explicit `git add` paths; use `git add -p` only when a file spans two commits, with clear per-hunk instructions.
