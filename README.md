# Automated Garden Management System

A REST backend for managing gardens, plants, humidity levels, and automated irrigation.

## Project status

The NestJS application scaffold, Swagger documentation, development tooling, PostgreSQL development container, and Drizzle configuration are in place.

Domain schemas, authentication, garden management, irrigation, and reporting are planned.

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

| Variable            | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `PORT`              | HTTP port for the API                                    |
| `POSTGRES_USER`     | User created during database initialization              |
| `POSTGRES_PASSWORD` | Password used during database initialization             |
| `POSTGRES_DB`       | Database created during initialization                   |
| `DATABASE_URL`      | PostgreSQL connection URL used by NestJS and Drizzle Kit |

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

Domain tables will be introduced through migrations as features are implemented.

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

- User authentication through Google sign-in.
- Garden and plant management with ownership checks.
- Validation of available garden surface area.
- Humidity simulation and mocked irrigation commands.
- Watering history and reporting.
- Account deletion and removal of account-owned data.
- API containerization.
- Measured optimization of frequently used endpoints.

Architectural assumptions, environment variables, and usage instructions will be updated as features are implemented.
