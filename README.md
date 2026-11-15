# Automated Garden Management System

A backend project for managing gardens, plants, humidity levels, and automated irrigation.

## Project status

The NestJS application scaffold, Swagger API documentation, and development tooling are configured. Domain features and PostgreSQL persistence are planned.

## Technology stack

| Area               | Technology                         |
| ------------------ | ---------------------------------- |
| Framework          | NestJS 12                          |
| Language           | TypeScript with ES Modules         |
| Database — planned | PostgreSQL                         |
| ORM — planned      | Drizzle ORM                        |
| Testing            | Vitest and Supertest               |
| Linting            | Oxlint with type-aware checks      |
| Formatting         | Prettier                           |
| Git hooks          | Husky, lint-staged, and commitlint |

## Requirements

- Node.js **24.22.3**
- npm

The intended Node.js version is declared in `.nvmrc`.

With nvm:

```bash
nvm install
nvm use
```

Docker and Docker Compose will be required once the containerized environment is added.

## Getting started

Install the dependencies from the committed lockfile:

```bash
npm ci
```

The installation initializes Husky through the `prepare` script.

Start the application in watch mode:

```bash
npm run start:dev
```

The generated application listens on port `3000` by default.

## API documentation

Start the application:

```bash
npm run start:dev
```

Documentation is available at:

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

## Development workflow

Oxlint checks code quality, and Prettier applies consistent formatting. Their configuration files are committed to the repository.

Before a commit, lint-staged runs configured checks and fixes on staged files. Additional test commands are defined in `.husky/pre-commit`.

The `commit-msg` hook validates Conventional Commit messages:

```text
feat(gardens): add garden creation
fix(plants): prevent garden overcrowding
test(irrigation): cover watering thresholds
docs: document local development
chore(tooling): configure git hooks
```

VS Code settings and extension recommendations are provided in `.vscode/`.

AI coding guidance is maintained in `AGENTS.md`.

## Testing approach

Current application E2E tests cover the `/api` prefix, Swagger UI, and the generated OpenAPI document. These tests do not require a database.

As features are implemented:

- Unit tests will cover business rules such as humidity calculations and irrigation decisions.
- Integration tests will verify PostgreSQL queries, constraints, transactions, and concurrent capacity checks.
- E2E tests will verify HTTP behavior, authentication, ownership, and complete application flows.

Tests that exercise persistence will use an isolated PostgreSQL test database, separate from development and production data.

## Planned functionality

- Garden and plant management.
- Validation of available garden surface area.
- User authentication and resource ownership.
- Humidity simulation and mocked irrigation commands.
- Watering history and reporting.
- Docker Compose for local execution.
- Measured optimization of frequently used endpoints.

Implementation decisions, environment variables, database commands, and API usage will be documented as these features are added.
