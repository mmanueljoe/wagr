# 003. pnpm over npm and yarn

Date: 2026-06-06
Status: Accepted

## Context

Wagr is a monorepo with two apps (`apps/web`, `apps/api`) and shared
packages (`packages/types`, `packages/tsconfig`). We need a package manager
that handles workspaces well.

The three real options for Node.js in 2026:

- **npm** — bundled with Node, mature workspaces support.
- **yarn** — older alternative; Yarn 4 has good workspace support but a
  divisive plug'n'play model.
- **pnpm** — content-addressable store, fast, strict node_modules layout,
  excellent workspaces support.

## Decision

Use **pnpm**. The lockfile is `pnpm-lock.yaml`. Root scripts use
`pnpm --filter <workspace>` to target individual apps.

## Consequences

**Accepted:**
- All engineers need pnpm installed (`npm install -g pnpm` or via Corepack).
- CI runners need pnpm too — handled by `pnpm/action-setup` in GitHub Actions.

**Gained:**
- Workspace-wide installs are faster and use less disk than npm.
- Strict module resolution catches phantom dependencies that npm would let
  pass.
- The `pnpm --filter` syntax is concise for monorepo scripts.

## Alternatives considered

- **npm workspaces.** Works fine for the workspace shape but slower installs
  and weaker hoisting controls.
- **Yarn 4.** Capable but the plug'n'play decision splits the community and
  some tools still don't support it cleanly.
- **Bun.** Promising but its monorepo workspace support was still maturing
  when we made this call. Worth reconsidering on the next project.
