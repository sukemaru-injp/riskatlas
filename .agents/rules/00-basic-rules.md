# Basic Rules

## Project Scope

Risk Atlas is a pnpm workspace project for collecting, storing, and displaying
overseas safety information published as MOFA open data.

Applications are placed under `apps/`. Shared modules are placed under
`packages/`.

## Quality Gate

Use the root workspace scripts to run static analysis and formatting across all
modules.

- `pnpm check`: run Biome checks with write fixes.
- `pnpm lint`: run Biome lint with write fixes.
- `pnpm format`: run Biome format with write fixes.
- `pnpm typecheck`: run TypeScript type checks where configured.
- `pnpm build`: run each module build.

Before finishing code changes, run the narrowest relevant command first, then
run the root command when the change can affect multiple modules.

## Module Build Rule

Packages that are consumed by other modules must be provided as bundled output
through `tsdown`.

Use `tsc` for type checking and `tsdown` for distributable bundles. The source
entrypoint should live under `src/`, and package exports should point to
generated files under `dist/`.

Applications may consume workspace packages through `workspace:*` dependencies.

## Dependency Rule

Shared tool versions such as TypeScript and Biome are managed through the pnpm
catalog in `pnpm-workspace.yaml`.

Third-party modules used only by one module should stay in that module's own
`dependencies` or `devDependencies` and should not be added to the catalog.

## Environment Variable Rule

Agents must not read `.envrc` or use it to inspect environment variable values.
Treat `.envrc` as a local secret-bearing file.

When checking which environment variables are expected to exist, refer to
`.env.example` instead. If `.env.example` is missing or incomplete, update the
example file with variable names only and do not include secret values.

## Module Responsibilities

### `apps/web`

TanStack Start based web application. It will be deployed to Cloudflare Workers
and is responsible for presenting collected overseas safety information.

Primary responsibilities:

- Display country lists and country-specific safety information history.
- Display safety information details.
- Show source attribution required by MOFA open data terms.

### `apps/cron`

Cloudflare Workers Scheduled Handler application. It periodically fetches MOFA
open data and prepares it for persistence.

Primary responsibilities:

- Run from `src/main.ts` as the Cloudflare Worker entrypoint.
- Execute reusable fetch and parse logic from `src/handler.ts`.
- Support local verification through `pnpm --filter @riskatlas/cron local`.
- Fetch `newarrivalA.xml`, parse it with `fast-xml-parser`, and convert entries
  into project types before logging or persisting them.

### `packages/d1`

Shared package for Cloudflare D1 access. It is intended to provide database
adapter functionality to applications.

Current responsibilities:

- Provide workspace-consumable exports from `src/index.ts`.
- Type check with `tsc`.
- Bundle ESM output and declarations with `tsdown` into `dist/`.
