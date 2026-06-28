# Repository Guidelines

## Project Structure & Module Organization

This repository uses pnpm workspaces. Applications live under `apps/`.

- `apps/web/`: future TanStack Start web application deployed to Cloudflare Workers.
- `apps/cron/`: Cloudflare Workers scheduled job.
- `apps/cron/src/main.ts`: Worker entrypoint deployed by Cloudflare.
- `apps/cron/src/handler.ts`: reusable scheduled-fetch function called by both Worker and local entrypoints.
- `apps/cron/src/local.ts`: local execution entrypoint.
- `packages/d1/`: Cloudflare D1 database adapter package consumed by apps.
- `pnpm-workspace.yaml`: workspace and catalog version definitions.

Generated output such as `apps/cron/dist/` should not be treated as source.

## Build, Test, and Development Commands

Run commands from the repository root unless noted.

- `pnpm install`: install workspace dependencies.
- `pnpm build`: run each workspace package build script.
- `pnpm typecheck`: run TypeScript checks across workspaces.
- `pnpm lint`: run each workspace lint script.
- `pnpm format`: run each workspace format script.
- `pnpm check`: run each workspace Biome check script.
- `pnpm local`: run the cron app locally via `@riskatlas/cron`.

For cron-only work, use `pnpm --filter @riskatlas/cron <script>`.

When an agent starts a development server only for verification, it should stop
that server after the task is complete and before handing off the final result.

## Agent Rules & Skills

This repository provides local agent instructions under `.agents/`. Agents should
read and apply these files before making relevant implementation changes.

Rules:

- `.agents/rules/00-basic-rules.md`: project scope, quality gates, dependency
  management, environment variable handling, and module responsibilities.
- `.agents/rules/01-cloudflare-workers-best-practices.md`: Cloudflare Workers
  configuration, request handling, architecture, observability, security, and
  testing practices.

Skills:

- `.agents/skills/modern-web-guidance/SKILL.md`: use before implementing
  frontend, HTML, CSS, or client-side JavaScript features. Prefer the local
  guides under `.agents/skills/modern-web-guidance/guides/` when available.
- `.agents/skills/cloudflare/SKILL.md`: use for Cloudflare platform work,
  including Workers, D1, storage, routing, bindings, security, and deployment
  architecture.
- `.agents/skills/wrangler/SKILL.md`: use before running or changing Wrangler
  commands, `wrangler.jsonc`, bindings, generated types, or deployment scripts.
- `.agents/skills/manage-task/SKILL.md`: use for tone ticket creation,
  status updates, taskId-based work intake, and ticket closure coordination.

When a task matches one of these rules or skills, use the repository-local
instruction first and reflect its guidance in the implementation and
verification steps.

## Coding Style & Naming Conventions

Use TypeScript for application code. The repository uses Biome for linting and formatting, with tab indentation, double quotes, semicolons, and trailing commas disabled. Keep exported functions explicit and prefer small modules with clear responsibility.

Use descriptive file names such as `handler.ts`, `local.ts`, and `types.ts`. Workspace packages should use scoped names like `@riskatlas/cron`.

Dependency versions for shared tooling should be pinned through `pnpm-workspace.yaml` catalogs, then referenced with `catalog:` in package manifests. Third-party modules used by only one workspace package should not be added to the catalog; keep them in that package's own `dependencies` or `devDependencies`.

## Testing Guidelines

No test framework is configured yet. Until one is added, validate changes with:

- `pnpm typecheck`
- `pnpm check`
- `pnpm local` for cron behavior

When tests are introduced, place them near the code they cover and use a consistent `*.test.ts` naming pattern.

## Commit & Pull Request Guidelines

This project is still early and has no established commit convention. Use short, imperative commit messages, for example `Initialize cron worker` or `Add workspace catalog versions`.

Pull requests should include a concise summary, verification commands run, linked issues when relevant, and screenshots for future UI changes in `apps/web`.

## Security & Configuration Tips

Do not commit secrets or Cloudflare credentials. Add runtime bindings and environment variables to Worker configuration intentionally, and reflect their types in `apps/cron/src/types.ts`.
