# Automated Garden Management System

A REST backend for managing gardens, plants, humidity levels, and automated irrigation.

## Project status

The NestJS application scaffold, Swagger documentation, development tooling, PostgreSQL development container, Drizzle configuration, and Google sign-in are in place.

User profiles (view, update, and delete the signed-in user's account), garden management (create, view, update, and delete gardens with ownership scoping), and plant management (add plants to a garden, view, update, and delete them) are implemented. Irrigation and reporting are planned.

## Technology stack

| Area                 | Technology                                   |
| -------------------- | -------------------------------------------- |
| Framework            | NestJS 12                                    |
| Language             | TypeScript with ES Modules                   |
| Database             | PostgreSQL                                   |
| ORM and migrations   | Drizzle ORM and Drizzle Kit                  |
| Configuration        | `@nestjs/config`                             |
| API documentation    | Swagger/OpenAPI                              |
| Testing              | Vitest and Supertest                         |
| Linting              | Oxlint with type-aware checks                |
| Formatting           | Prettier                                     |
| Git hooks            | Husky, lint-staged, and commitlint           |
| AI development tools | Project-local Drizzle skill and Context7 MCP |

## Requirements

- Node.js **24.22.3**
- npm
- Docker with Docker Compose

The intended Node.js version is declared in `.nvmrc`.

With nvm:

```bash
nvm install
nvm use
```

## Getting started

Install dependencies from the committed lockfile:

```bash
npm ci
```

Installation initializes Husky through the `prepare` script.

Create your local environment file:

```bash
cp .env.example .env
```

Update its values as needed. Keep `.env` out of version control.

Start PostgreSQL:

```bash
docker compose up -d
```

Check startup:

```bash
docker compose ps
docker compose logs postgres
```

Start the API in watch mode:

```bash
npm run start:dev
```

The API listens on port `3000` by default.

## Environment variables

| Variable               | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `PORT`                 | HTTP port for the API                                           |
| `POSTGRES_USER`        | User created during database initialization                     |
| `POSTGRES_PASSWORD`    | Password used during database initialization                    |
| `POSTGRES_DB`          | Database created during initialization                          |
| `DATABASE_URL`         | PostgreSQL connection URL used by NestJS and Drizzle Kit        |
| `APP_URL`              | Public base URL of the API, used to build the OIDC callback URL |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 client ID                                      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret                                  |

For NestJS running locally, the database URL uses `127.0.0.1:5432`. Its username, password, and database must match the PostgreSQL initialization variables.

The API loads configuration through `ConfigModule`. Drizzle Kit runs separately and loads `.env` through `dotenv/config`.

## Database

PostgreSQL runs in Docker Compose and is exposed locally at `127.0.0.1:5432`.

A named volume preserves database data when the container is stopped or recreated.

Stop the container while retaining its data:

```bash
docker compose down
```

PostgreSQL initialization variables apply only when the database volume is empty. Changing `.env` does not update credentials in an existing database.

### Schema organization

Table definitions live alongside their feature:

```text
src/
  users/
    users.schema.ts
  auth/
    oidc-identities.schema.ts
  gardens/
    gardens.schema.ts
  plants/
    plants.schema.ts
  database/
    database.ts
```

Table relations (user → gardens, garden → plants) and the typed `Database` alias are declared once in [database.ts](src/database/database.ts) with Drizzle's `defineRelations()` and passed to `DrizzleModule.forRootAsync()` in `src/app.module.ts`, which enables the relational query API (`db.query.*`).

`drizzle.config.ts` discovers `src/**/*.schema.ts` and writes generated migrations to `drizzle/`.

### Migrations

After changing table definitions, generate a migration:

```bash
npm run db:generate
```

Review the generated SQL, then apply it to the configured database:

```bash
npm run db:migrate
```

Commit schema changes and their generated migrations together. Generating a migration does not apply it.

The `users`, `oidc_identities`, and `gardens` tables are in place; remaining domain tables (including `plants`) are introduced through migrations as features are implemented.

## Authentication

Google sign-in is implemented with `@nestjs/authentication` (OpenID Connect) and server-side sessions. Configuration lives in `src/app.module.ts` through `AuthenticationModule.forRootAsync`; the auth code is organized in `src/auth/`.

### Google sign-in (OIDC)

- `GET /api/auth/oidc/google/login` starts the flow and redirects to Google. Optional query parameters: `redirectTo` (a relative path to land on after sign-in) and `link=true` (connect Google to the signed-in user instead of signing in).
- `GET /api/auth/oidc/google/callback` is the redirect URI registered with Google. The configured callback URL is `${APP_URL}/api/auth/oidc/:provider/callback` — the `/api` prefix is required so it matches the application's global prefix and the registered redirect URI.
- On first sign-in, [google-oidc-account-resolver.ts](src/auth/google-oidc-account-resolver.ts) creates a `users` row with `email_verified = true` (Google asserted the address) and records the link in `oidc_identities` (primary key `provider, subject`).
- A returning Google account is matched by identity. An existing user with the same _verified_ email is linked; linking by email to an unverified account is refused with `403` to prevent account pre-hijacking.

#### Signing in through Swagger

The OpenID Connect flow is browser-based, so it cannot be triggered from Swagger's "Authorize" button (that button only sends API keys or bearer tokens — it does not manage cookies). Instead, sign in through the login endpoint's redirect:

1. Open the `auth` tag and expand `GET /api/auth/oidc/{provider}/login`.
2. Set `provider` to `google` and `redirectTo` to `/docs`, then click **Execute**.
3. Copy the `Location` URL from the response (Swagger shows a `302` and does not follow it).
4. Paste it into the same browser that has Swagger open and complete Google sign-in.

Google then redirects back to `/api/auth/oidc/google/callback`, the API sets the session cookie, and the browser lands on `/docs`. Because `/docs` and `/api` share an origin, every later "Execute" call from Swagger is automatically authenticated with that session.

#### Re-pressing login while signed in vs. `link=true`

The `link` query parameter selects between two different flows, both started from `GET /api/auth/oidc/google/login`:

| Flow                | Request                         | Resolver context            | Behaviour                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sign in**         | `?redirectTo=/docs` (no `link`) | `{}` — no `linkTo`          | Signs in the user the Google account is linked to and issues a fresh session (the previous session is rotated away). Pressing it while already signed in re-authenticates you as the same user with a new session — it never creates a duplicate user. |
| **Connect account** | `?link=true`                    | `{ linkTo: currentUserId }` | Requires an active session (`401` otherwise). Links the chosen Google account to the signed-in user, or throws `409` if that Google account already belongs to another user. The session is left as-is; it does not sign in.                           |

Two details worth knowing:

- Google is configured with `authorizationParams: { prompt: 'select_account' }` (see [app.module.ts](src/app.module.ts)), so the account picker appears on **every** login, even when a Google session already exists — re-login always asks which account to use.
- The `linkTo` branch in [google-oidc-account-resolver.ts](src/auth/google-oidc-account-resolver.ts) resolves the signed-in user, not the Google account: it returns `{ id: linkTo.id }` after linking, so `link=true` can never change which user the browser is signed in as.

### Sessions

After sign-in the browser receives an `HttpOnly`, `SameSite=Lax` cookie (`__Host-sid`). Session state lives server-side:

- absolute TTL (default `7d`) — the hard cap from creation;
- idle TTL (default `1d`) — expires after a day of inactivity;
- `touchInterval` (default `1m`) — how often activity is written back.

[SessionAuth](src/auth/session/session-auth.ts) validates the cookie and loads the user on every request. The `AuthenticationGuard` is registered globally, so every route requires a signed-in user unless it is marked `@Public()`. `POST /api/auth/logout` ends the current session.

The session store is persisted in PostgreSQL through [DrizzleSessionStore](src/auth/session/drizzle-session.store.ts), registered with `AuthenticationStorage.registerSource({ sessions: this })`. Sessions survive restarts; the `sessions` table (see [session.schema.ts](src/auth/session/session.schema.ts)) stores the SHA-256 of the cookie token, its user, and its expiry and last-activity timestamps. OIDC login states and email-verification tokens remain in-memory (losing them only requires retrying).

### Email verification

- `POST /api/auth/email-verification/send` (authenticated) issues a single-use 6-digit code and logs it to the console (no mailer is configured yet, so the code is printed instead of emailed). Calling it again resends a new code; the latest code replaces any previous one. A resend cooldown of `1m` applies between sends (returns `429` with the remaining wait), on top of the throttler's `5` per hour cap.
- `POST /api/auth/email-verification/verify` (public) consumes the code and marks the address verified with a conditional update (`user_id` and `email_address` must both match).

The library stores a 256-bit token (hashed) and drives verification; [email-verification-mailer.ts](src/auth/mail/email-verification-mailer.ts) maps each token to a 6-digit code for delivery and logging. Codes are held in memory, so restarting the API invalidates pending codes (the user simply asks for a new one). Codes expire after `10m` (the `emailVerification.ttl` configured in `src/app.module.ts`), because a 6-digit code is guessable and a short window limits the risk; the `verify` route is rate-limited to `10` attempts per `15m`.

This flow is the foundation for future email/password registration; users created through Google are already verified at creation.

### Rate limiting

`@nestjs/throttler` applies a global default (60 requests/minute) and tighter limits on auth routes: OIDC login (10/min), verification `send` (5/hour), and `verify` (10/15 min).

## Users

The users feature exposes self-service profile endpoints for the signed-in user, identified through the session (`@CurrentUser()`).

| Endpoint               | Behavior                                             |
| ---------------------- | ---------------------------------------------------- |
| `GET /api/users/me`    | Returns the current user's profile                   |
| `PATCH /api/users/me`  | Updates `firstName`, `lastName`, and `age`           |
| `DELETE /api/users/me` | Deletes the account and signs out everywhere (`204`) |

Details:

- `emailAddress` is immutable through the update endpoint: [update-user.dto.ts](src/users/dto/update-user.dto.ts) derives from `CreateUserDto` with `OmitType` dropping the email, so changing it requires a dedicated flow that also resets `email_verified`.
- `firstName` and `lastName` are nullable: users created through Google start with no name and fill it in later. `age` is optional and validated to `0–125`.
- Data access lives in [users.repository.ts](src/users/users.repository.ts) and [users.service.ts](src/users/users.service.ts); [users.controller.ts](src/users/users.controller.ts) keeps HTTP handling and delegates to them.
- `DELETE /users/me` removes the `users` row; `oidc_identities` is removed by its `ON DELETE CASCADE` foreign key, and the controller calls `SignInService.signOutEverywhere()` to end all of the user's sessions.
- `email_verified` is managed by the verification flow, never by client input, so it is not part of the update DTO.

## Gardens

The gardens feature exposes CRUD endpoints scoped to the signed-in user (`@CurrentUser()`).

| Endpoint                  | Behavior                                    |
| ------------------------- | ------------------------------------------- |
| `POST /api/gardens`       | Creates a garden for the current user       |
| `GET /api/gardens`        | Lists all gardens owned by the current user |
| `GET /api/gardens/:id`    | Returns one of the current user's gardens   |
| `PATCH /api/gardens/:id`  | Updates a garden owned by the current user  |
| `DELETE /api/gardens/:id` | Deletes a garden owned by the current user  |

Details:

- Ownership is enforced in every query: lookups filter by both `garden_id` and `user_id`, so a user cannot read or modify another user's garden.
- `gardenName` is required (`1–100` characters, non-blank), `totalSurfaceArea` is a non-negative `double precision` value, and `locationDescription` is optional text. See [create-garden.dto.ts](src/garden/dto/create-garden.dto.ts).
- Route `:id` parameters use `ParseUUIDPipe`, so invalid UUIDs are rejected with `400`.
- Responses are serialized through `GardenResponseDto` in [garden-response.dto.ts](src/garden/dto/garden-response.dto.ts), which intentionally does not expose `userId`.
- Data access lives in [garden.repository.ts](src/garden/garden.repository.ts); [garden.service.ts](src/garden/garden.service.ts) applies `plainToInstance` and throws `NotFoundException` for missing gardens.
- The `gardens` table in [garden.schema.ts](src/garden/garden.schema.ts) has `user_id` referencing `users` with `ON DELETE CASCADE`, so deleting an account removes its gardens.

## Plants

The plants feature adds plants to a garden and manages their data, scoped to the signed-in user.

| Endpoint                             | Behavior                                              |
| ------------------------------------ | ----------------------------------------------------- |
| `POST /api/gardens/:gardenId/plants` | Adds a plant to one of the current user's gardens     |
| `GET /api/gardens/:gardenId/plants`  | Lists the plants of one of the current user's gardens |
| `GET /api/plants`                    | Lists all plants of the current user                  |
| `GET /api/plants/:id`                | Returns one of the current user's plants              |
| `PATCH /api/plants/:id`              | Updates a plant owned by the current user             |
| `DELETE /api/plants/:id`             | Deletes a plant owned by the current user             |

Details:

- Creation uses a nested route because a plant belongs to a specific garden; `gardenId` is validated by `ParseUUIDPipe` and the service verifies the garden belongs to the user before inserting.
- `plantName` and `species` are required (`1–100` characters, non-blank), `plantType` is one of `vegetable`, `fruit`, or `flower`, `plantationDate` is an ISO date, `surfaceAreaRequired` is a non-negative `double precision` value, and `idealHumidityLevel` is an integer between `0` and `100`. See [create-plant.dto.ts](src/plant/dto/create-plant.dto.ts).
- `idealHumidityLevel` is the plant's target humidity level (`0–100`) used to drive irrigation decisions. It is configurable: set on create and editable through `PATCH /api/plants/:id`, validated at the DTO level and by a database `CHECK` constraint.
- Updates cannot move a plant to another garden: [update-plant.dto.ts](src/plant/dto/update-plant.dto.ts) derives from `CreatePlantDto` without the parent reference.
- Overcrowding is prevented: creating a plant, or updating a plant's `surfaceAreaRequired`, fails with `409` when the total surface area required by the garden's plants would exceed the garden's `totalSurfaceArea`. The error message reports the required and available area in square meters. The check and the write run atomically in a transaction that locks the garden row (`SELECT … FOR UPDATE`), so concurrent additions to the same garden cannot together exceed the limit.
- Ownership is enforced through the plant's garden, so a user cannot read or modify another user's plant: item lookups filter by the plant id against gardens owned by the user, and `findByGarden` uses the relational query API (`db.query.gardens.findFirst({ where: { gardenId, userId }, with: { plants: true } })`) to check ownership and fetch the plants in a single query.
- Responses are serialized through [plant-response.dto.ts](src/plant/dto/plant-response.dto.ts), exposing `gardenId` but never a user id.
- Data access lives in [plant.repository.ts](src/plant/plant.repository.ts); [plant.service.ts](src/plant/plant.service.ts) applies `plainToInstance` and throws `NotFoundException` for missing plants or gardens.
- The `plants` table in [plant.schema.ts](src/plant/plant.schema.ts) has `garden_id` referencing `gardens` with `ON DELETE CASCADE`, so deleting a garden removes its plants.

## Realtime plant metrics and irrigation

Each plant has one `realtime_plant_metrics` row holding its current state: `current_humidity_level` (0–100), `last_irrigation_start_time`, and `last_irrigation_end_time`. The `plant_id` is both primary key and foreign key to `plants` (`ON DELETE CASCADE`), so a plant has exactly one current-state record. See [plant-metric.schema.ts](src/plant-metric/plant-metric.schema.ts).

### Simulation behaviour (planned)

Since there are no real sensors, the system simulates humidity and irrigation locally:

- Every plant starts at `50%` `current_humidity_level`.
- Every minute the humidity drops by plant type: `1%` for vegetables, `3%` for fruits, `4%` for flowers.
- When a plant's humidity falls below its `idealHumidityLevel`, the simulator commands the irrigation system to water that plant.
- Watering takes `2` minutes and raises the humidity by `16%` (vegetables), `18%` (fruits), or `20%` (flowers).

The simulation runs on a scheduled one-minute tick and dispatches commands to a mocked irrigation system with an individually controllable irrigation line per plant.

### Theoretical production architecture (bonus)

For a real deployment, the same behaviour maps onto AWS with NestJS:

- **Ingestion** — sensors publish to **AWS IoT Core** over MQTT. A separate **NestJS microservice** (or Lambda/ECS worker) subscribed through an IoT Rule to SQS consumes the readings, so sensor traffic never slows the REST API.
- **Storage** — **Redis** holds hot state (latest humidity, irrigation status, cooldown locks) for sub-millisecond threshold checks; **TimescaleDB** (PostgreSQL extension) stores the cold time-series log with automatic partitioning and retention.
- **Watering** — a **command-and-acknowledge** pattern with hardware fail-safes. The consumer checks `humidity < idealHumidityLevel` and, if Redis shows no active cooldown lock, publishes `START_WATERING` (duration 120s) to the device topic. The valve controller (e.g. ESP32) opens the valve and runs its own hardware countdown, so it shuts off even if connectivity drops. The device publishes `WATERING_STARTED`/`WATERING_COMPLETED`, and the consumer updates `last_irrigation_start_time`/`last_irrigation_end_time` from those acknowledgements (not from the outgoing command).

### Reporting (bonus, theoretical)

A reporting system can answer, for a given period:

- **Number of watered plants** — plants that received at least one _completed_ irrigation during the period (an irrigation event ended within the window).
- **Number of unwatered plants** — the complement: plants with no completed irrigation during the same period.
- **Watering frequency per plant** — how many times each plant was watered during the period (a `COUNT` of irrigation events grouped by `plant_id`), e.g. _"Tomato — 3 waterings in the last hour"_.
- **Number of added or deleted plants since a date** — added plants use the existing `created_at` (`created_at >= date`); deleted plants require a soft-delete marker (see below).

Deletion tracking uses a **`deleted_at` timestamp (soft delete)** rather than an `active/inactive` boolean, because a boolean has no time and cannot answer "deleted since a specific date". A nullable `deleted_at` column supports `deleted_at >= date` directly. Soft delete means plant queries must filter `deleted_at IS NULL` and deleted plants must stop counting toward garden surface area. An alternative is hard delete plus a separate plant-audit table, which preserves cascade behaviour but adds a table and write discipline; `deleted_at` is the minimal solution for the report requirement.

Locally the report is served from the `realtime_plant_metrics` state plus an irrigation event log; in the production architecture it reads from TimescaleDB.

## API documentation

With the application running:

- [Swagger UI](http://localhost:3000/docs)
- [OpenAPI JSON](http://localhost:3000/docs-json)

Application endpoints use the `/api` prefix. Documentation routes remain outside that prefix.

Swagger is configured directly in `src/main.ts` using `@nestjs/swagger`.

## Available commands

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `npm run start:dev`        | Start development mode with automatic restarts      |
| `npm run start:debug`      | Start development mode with debugging               |
| `npm run build`            | Build the application                               |
| `npm run start:prod`       | Run the built application                           |
| `npm run lint`             | Run type-aware lint checks                          |
| `npm run format`           | Apply formatting                                    |
| `npm run format:check`     | Check formatting without modifying files            |
| `npm test`                 | Run tests selected by the main Vitest configuration |
| `npm run test:watch`       | Run tests in watch mode                             |
| `npm run test:cov`         | Run tests with coverage                             |
| `npm run test:e2e`         | Run tests selected by the E2E configuration         |
| `npm run test:integration` | Run integration tests against the test database     |
| `npm run db:generate`      | Generate migrations from schema changes             |
| `npm run db:migrate`       | Apply pending migrations                            |

### Git hooks with Husky

[Husky](https://typicode.github.io/husky/) manages local Git hooks that automatically run checks during the commit workflow. This helps catch code-quality issues and invalid commit messages before changes enter the repository.

Hooks are initialized during `npm ci` through the `"prepare": "husky"` script in `package.json`.

| Hook                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `.husky/pre-commit` | Runs lint-staged and the test commands configured in the hook |
| `.husky/commit-msg` | Validates the commit message using commitlint                 |

lint-staged runs Oxlint fixes and Prettier on staged files. Any remaining lint errors, failing tests, or invalid commit messages block the commit.

Commit messages follow Conventional Commits:

```text
feat(gardens): add garden creation
fix(plants): prevent garden overcrowding
test(irrigation): cover watering thresholds
docs: document local development
chore(tooling): configure git hooks
```

Git hooks provide local feedback; they do not replace CI checks.

VS Code settings and extension recommendations are provided in `.vscode/`.

For setup and troubleshooting, see the [official Husky documentation](https://typicode.github.io/husky/).

## Testing approach

Application E2E tests cover the `/api` prefix, Swagger UI, and the generated OpenAPI document.

Authentication logic (the OIDC resolver, session validation, email verification, and their controllers), the user profile service/controller, the garden and plant service/controllers, and the request DTO validation rules (garden, plant, user, and email-verification payloads) are covered by unit tests in the `*.spec.ts` files, run with `npm test`.

As domain features are implemented:

- Unit tests will cover business rules such as humidity calculations and irrigation decisions.
- Integration tests will verify PostgreSQL queries, constraints, transactions, and concurrent capacity checks.
- E2E tests will verify HTTP behavior, authentication, ownership, and complete application flows.

Unit tests should remain independent of PostgreSQL and external services. Integration tests run against an isolated PostgreSQL test database (`automated_garden_test`, configured through `TEST_DATABASE_URL`), never development or production data. The integration suite (`*.integration-spec.ts`, run with `npm run test:integration`) applies migrations on startup, truncates tables between tests, and currently covers garden-capacity concurrency (parallel adds cannot exceed `totalSurfaceArea`), schema check constraints, and `ON DELETE CASCADE` behaviour.

## AI development assistance

Project instructions are maintained in `AGENTS.md`.

- The project-local Drizzle skill is stored in `.agents/skills/drizzle/`, with installation metadata in `skills-lock.json`.
- Context7 MCP is used to retrieve current library documentation.
- Drizzle MCP is not used.

The Drizzle skill provides development guidance; it does not establish a database connection. These agent tools are not required to run the API.

## Planned functionality

- Realtime plant metric simulation and mocked irrigation commands (see [Realtime plant metrics and irrigation](#realtime-plant-metrics-and-irrigation)).
- Watering history and reporting.
- API containerization.
- Measured optimization of frequently used endpoints.

Architectural assumptions, environment variables, and usage instructions will be updated as features are implemented.
