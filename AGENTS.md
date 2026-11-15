# AGENTS.md

## Project

Build a REST backend for automated garden management.

Chosen stack:

- NestJS 12 with TypeScript and ES Modules.
- Drizzle ORM with PostgreSQL.
- Vitest and Supertest for testing.
- Oxlint for linting and Prettier for formatting.
- npm as the package manager.

Read `README.md` for the current implementation status, setup instructions, and architectural decisions. Do not describe planned features as already implemented.

## Documentation

- Before introducing or changing NestJS APIs, configuration, or integrations, consult the official documentation indexed at https://docs.nestjs.com/llms.txt.
- For Drizzle-specific behavior, consult https://orm.drizzle.team/docs/overview.
- Verify compatibility with the installed package versions and project configuration.
- Check documented first-party integrations before adding another library, while preserving the chosen stack.
- For routine changes, follow established project patterns without repeating documentation research.
- If documentation and installed package behavior differ, inspect the package types and report unresolved uncertainty.

## Implementation conventions

- Organize code by feature using NestJS modules.
- Keep Drizzle table definitions alongside their feature.
- Keep controllers focused on HTTP handling and business logic in services.
- Follow the existing ESM import conventions.
- Use Vitest APIs such as `vi.fn()` rather than Jest APIs.
- Use the Node.js version declared in `.nvmrc`.
- Add dependencies only when required by the requested functionality.
- Keep setup instructions and significant architectural decisions in `README.md`.
- Implement application bootstrap configuration directly in `src/main.ts`, following the structure of official NestJS documentation examples. This includes the global prefix, Swagger, pipes, CORS, and startup logging when required.
- Do not create separate bootstrap configuration files, setup functions, wrappers, or helpers unless explicitly requested.
- Adapt documentation examples only as needed for the installed versions, project requirements, and existing ESM conventions.
- Preserve unrelated changes made by the user.

## Commands and approvals

- Execute commands needed to inspect, implement, and verify changes.
- Use the normal approval mechanism when required, and wait for approval before proceeding with the restricted action.
- If approval is denied or a command cannot run, report it accurately.
- Do not claim that unexecuted checks passed.
- Do not execute destructive operations without explicit authorization.

## Testing and verification

For every feature or bug fix, add unit, integration, and E2E tests where applicable. All three levels are not required for every change; select them based on the behavior and risks involved.

- **Unit tests:** cover business rules, calculations, branches, and failure cases in isolation.
- **Integration tests:** verify interactions between components, including database queries, constraints, and transactions where relevant.
- **E2E tests:** verify HTTP behavior, including validation, authentication, authorization, status codes, and persistence where relevant.

Use multiple levels when each covers a distinct risk. Do not duplicate assertions merely to increase coverage.

Keep unit tests independent of PostgreSQL and external services. Tests that exercise database behavior must use real PostgreSQL in an isolated test environment, never development or production databases.

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
