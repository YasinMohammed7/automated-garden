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

## Verification

Run checks relevant to each change:

- `npm run lint`
- `npm run format:check`
- `npm run build`
- `npm test`
- `npm run test:e2e` for changes affecting API behavior.

Add meaningful tests for business rules and bug fixes. Configuration-only changes generally need verification rather than new test files.

Database integration and E2E tests must use an isolated test database, never development or production data.

Report checks that could not be completed.

## Git

- Use Conventional Commit messages.
- Include lockfile changes when dependencies change.
- Do not bypass failing Git hooks.
- Create commits only when explicitly requested.
