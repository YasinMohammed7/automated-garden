# Automated Garden Management System

A REST backend for managing gardens, plants, humidity levels, and automated irrigation.

## Project status

The NestJS application scaffold, Swagger documentation, development tooling, PostgreSQL development container, Drizzle configuration, and Google sign-in are in place.

Garden management, irrigation, and reporting are planned. The users CRUD endpoints remain scaffolds to be implemented.

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
```

This is the intended structure as those features are implemented.

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

The `users` and `oidc_identities` tables are in place; remaining domain tables will be introduced through migrations as features are implemented.

## Authentication

Google sign-in is implemented with `@nestjs/authentication` (OpenID Connect) and server-side sessions. Configuration lives in `src/app.module.ts` through `AuthenticationModule.forRootAsync`; the auth code is organized in `src/auth/`.

### Google sign-in (OIDC)

- `GET /api/auth/oidc/google/login` starts the flow and redirects to Google. Optional query parameters: `redirectTo` (a relative path to land on after sign-in) and `link=true` (connect Google to the signed-in user instead of signing in).
- `GET /api/auth/oidc/google/callback` is the redirect URI registered with Google. The configured callback URL is `${APP_URL}/api/auth/oidc/:provider/callback` — the `/api` prefix is required so it matches the application's global prefix and the registered redirect URI.
- On first sign-in, [google-oidc-account-resolver.ts](src/auth/google-oidc-account-resolver.ts) creates a `users` row with `email_verified = true` (Google asserted the address) and records the link in `oidc_identities` (primary key `provider, subject`).
- A returning Google account is matched by identity. An existing user with the same _verified_ email is linked; linking by email to an unverified account is refused with `403` to prevent account pre-hijacking.

### Sessions

After sign-in the browser receives an `HttpOnly`, `SameSite=Lax` cookie (`__Host-sid`). Session state lives server-side:

- absolute TTL (default `7d`) — the hard cap from creation;
- idle TTL (default `1d`) — expires after a day of inactivity;
- `touchInterval` (default `1m`) — how often activity is written back.

[SessionAuth](src/auth/session/session-auth.ts) validates the cookie and loads the user on every request. The `AuthenticationGuard` is registered globally, so every route requires a signed-in user unless it is marked `@Public()`. `POST /api/auth/logout` ends the current session.

The session store is in-memory by default: restarting the API signs everyone out. Production needs a persistent `SessionStore` (Postgres/Redis).

### Email verification

- `POST /api/auth/email-verification/send` (authenticated) issues a single-use token and delivers it through the registered `EmailVerificationHandler`, which logs the link in development.
- `POST /api/auth/email-verification/verify` (public) consumes the token and marks the address verified with a conditional update (`user_id` and `email_address` must both match).

This flow is the foundation for future email/password registration; users created through Google are already verified at creation.

### Rate limiting

`@nestjs/throttler` applies a global default (60 requests/minute) and tighter limits on auth routes: OIDC login (10/min), verification `send` (5/hour), and `verify` (10/15 min).

## API documentation

With the application running:

- [Swagger UI](http://localhost:3000/docs)
- [OpenAPI JSON](http://localhost:3000/docs-json)

Application endpoints use the `/api` prefix. Documentation routes remain outside that prefix.

Swagger is configured directly in `src/main.ts` using `@nestjs/swagger`.

## Available commands

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run start:dev`    | Start development mode with automatic restarts      |
| `npm run start:debug`  | Start development mode with debugging               |
| `npm run build`        | Build the application                               |
| `npm run start:prod`   | Run the built application                           |
| `npm run lint`         | Run type-aware lint checks                          |
| `npm run format`       | Apply formatting                                    |
| `npm run format:check` | Check formatting without modifying files            |
| `npm test`             | Run tests selected by the main Vitest configuration |
| `npm run test:watch`   | Run tests in watch mode                             |
| `npm run test:cov`     | Run tests with coverage                             |
| `npm run test:e2e`     | Run tests selected by the E2E configuration         |
| `npm run db:generate`  | Generate migrations from schema changes             |
| `npm run db:migrate`   | Apply pending migrations                            |

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

Authentication logic (the OIDC resolver, session validation, email verification, and their controllers) is covered by unit tests in the `*.spec.ts` files, run with `npm test`.

As domain features are implemented:

- Unit tests will cover business rules such as humidity calculations and irrigation decisions.
- Integration tests will verify PostgreSQL queries, constraints, transactions, and concurrent capacity checks.
- E2E tests will verify HTTP behavior, authentication, ownership, and complete application flows.

Unit tests should remain independent of PostgreSQL and external services. Tests that exercise persistence will use an isolated PostgreSQL test database, separate from development and production data.

## AI development assistance

Project instructions are maintained in `AGENTS.md`.

- The project-local Drizzle skill is stored in `.agents/skills/drizzle/`, with installation metadata in `skills-lock.json`.
- Context7 MCP is used to retrieve current library documentation.
- Drizzle MCP is not used.

The Drizzle skill provides development guidance; it does not establish a database connection. These agent tools are not required to run the API.

## Planned functionality

- Garden and plant management with ownership checks.
- Validation of available garden surface area.
- Humidity simulation and mocked irrigation commands.
- Watering history and reporting.
- Account deletion and removal of account-owned data.
- API containerization.
- Measured optimization of frequently used endpoints.

Architectural assumptions, environment variables, and usage instructions will be updated as features are implemented.
