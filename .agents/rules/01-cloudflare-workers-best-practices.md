# Cloudflare Workers Best Practices

Source:
https://developers.cloudflare.com/workers/best-practices/workers-best-practices/

Last reviewed: 2026-05-30

Use these rules when writing or reviewing Cloudflare Workers code in this
repository.

## Configuration

- Keep `compatibility_date` current. New Workers should use a recent date, and
  existing Workers should update it intentionally so runtime fixes and APIs are
  adopted under review.
- Enable `nodejs_compat` when application or dependency code relies on Node.js
  built-ins such as `node:crypto`, `node:buffer`, or streams.
- Do not hand-write binding types. Generate them with `wrangler types` after
  adding, renaming, or removing bindings, then use the generated `Env` type.
- Store secrets with `wrangler secret` or an appropriate Cloudflare secret
  binding. Do not commit secrets in source, README files, or Wrangler config.
- Define environments deliberately in `wrangler.jsonc`. Keep staging and
  production names, bindings, variables, and routes explicit.
- Configure custom domains and routes intentionally. Use custom domains when
  the Worker is the origin; use routes when the Worker fronts an existing
  proxied origin.

## Request and Response Handling

- Stream large or unknown-size request and response bodies instead of buffering
  them with `response.text()`, `request.arrayBuffer()`, or similar APIs.
- If a request body must be fully consumed, validate or enforce a maximum size
  before reading it.
- Use `TransformStream` or response body piping to pass through large upstream
  responses without holding the full payload in memory.
- Use `ctx.waitUntil()` for work that can continue after the response is
  returned, such as analytics, notifications, or cache writes.

## Architecture

- Use Cloudflare bindings for Cloudflare services such as D1, KV, R2, Queues,
  Workflows, Durable Objects, and service bindings. Avoid calling the Cloudflare
  REST API from inside a Worker for resources already available as bindings.
- Move async and background work off the request path with Queues or Workflows.
  Use Queues for buffered single-step work and Workflows for durable multi-step
  processes.
- Use service bindings for Worker-to-Worker communication instead of public HTTP
  URLs. Prefer typed RPC when the called Worker exposes RPC methods.
- Use Hyperdrive for external PostgreSQL or MySQL connections so connection
  pooling and latency are handled by Cloudflare.
- Use Durable Objects for WebSockets, especially when connection coordination,
  rooms, or hibernation support is required.
- For new static or full-stack applications on Cloudflare, prefer Workers Static
  Assets over Pages unless the project has a specific reason to use Pages.

## Observability

- Enable Workers Logs and Traces before production deployment. Intermittent
  runtime errors are difficult to diagnose if collection starts only after an
  incident.
- Control log and trace volume with `head_sampling_rate` in Wrangler config.
- Use structured JSON logs for important events and errors. Include stable
  fields such as message, path, operation, request ID, and sanitized error
  details.

## Code Patterns

- Do not store request-scoped state in module-level mutable variables. Workers
  isolates may serve multiple requests over time, so global mutable state can
  leak stale data across requests.
- Pass request-specific values through function arguments or local variables.
- Every Promise must be `await`ed, `return`ed, intentionally `void`ed, or passed
  to `ctx.waitUntil()`. Floating promises can lose errors or be terminated
  before completion.
- Keep `ctx.waitUntil()` calls on the `ctx` object. Avoid patterns that lose the
  method binding, such as destructuring `waitUntil` and calling it separately.

## Security

- Use Web Crypto APIs for secure random values and tokens, such as
  `crypto.randomUUID()` or `crypto.getRandomValues()`. Do not use `Math.random()`
  for security-sensitive IDs, tokens, or secrets.
- Do not use `ctx.passThroughOnException()` as normal error handling. Use
  explicit `try` / `catch`, log sanitized structured errors, and return a
  controlled response.
- Avoid leaking secrets, upstream responses, stack traces, or internal binding
  names in user-facing error responses.

## Development and Testing

- Test Worker behavior in the Workers runtime with
  `@cloudflare/vitest-pool-workers` when tests are added.
- Confirm `wrangler.jsonc` includes every compatibility flag the application
  depends on. The Vitest pool can make tests pass by injecting compatibility
  behavior that production config may not have.
- For this repository, run the narrowest relevant workspace checks first, then
  broader checks when changes affect shared behavior:
  - `pnpm --filter @riskatlas/cron typecheck`
  - `pnpm --filter @riskatlas/web typecheck`
  - `pnpm typecheck`
  - `pnpm check`
