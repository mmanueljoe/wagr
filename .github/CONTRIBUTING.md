# Contributing to Wagr

This guide covers the day-to-day workflow: how to start a branch, how to
write a commit, what your PR should look like before you ask for review.

Before you read this, read [CLAUDE.md](../CLAUDE.md) at the repo root. The
coding standards and slug-first workflow live there.

---

## Branching

We use **GitHub Flow**. One protected branch (`main`) and short-lived feature
branches off it. We do not use a `develop` branch.

### Rules for `main`

- All changes land via pull request. No direct commits.
- CI must pass (lint, typecheck, test) before a PR can merge.
- Merges are squashed. One PR equals one commit on `main`.
- No force-push. No history rewriting.
- `main` is what gets deployed to production on every push.

### Creating a feature branch

Every story has a slug (see [docs/architecture/jira-map.md](../docs/architecture/jira-map.md)).
Use the slug in your branch name.

```
feature/<slug>-short-description
```

Examples:
- `feature/ussd-session-handler-redis-ttl`
- `feature/payslip-gpt-fallback-template`
- `feature/dashboard-home-stat-cards`

If your branch is not tied to one slug (a chore, a small fix), use:
- `chore/<short-description>` — tooling, dependency bumps, cleanups
- `fix/<short-description>` — bug fixes outside a planned story
- `docs/<short-description>` — doc-only changes

### Short-lived means short-lived

Aim to merge feature branches within 1 to 3 days. If a branch is open for more
than a week, something has gone wrong — either the story is too big and should
be split, or it is blocked and should be paused.

Rebase or merge `main` into your branch daily to keep conflicts small.

---

## Commit messages

We follow Conventional Commits with the slug as the scope.

```
<type>(<slug>): <subject>
```

### Types

| Type | Use for |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `chore` | Tooling, build, config, deps — no production code change |
| `docs` | Documentation only |
| `test` | Adding or fixing tests, no production code change |
| `refactor` | Restructuring code without changing behaviour |
| `perf` | Performance improvement |

### Examples

```
feat(ussd-session-handler): store session state in Redis with 120s TTL
fix(payslip-gpt): fall back to static template on 5s timeout
docs(jira-map): renumber stories after Jira board reset
chore: bump pnpm to 9.4
refactor(wage-engine): extract pay-period helper
test(fee-calc): add edge cases for sub-GHS amounts
```

### Subject line rules

- Use the imperative mood: "add", "fix", "remove" — not "added", "fixed".
- No trailing period.
- Keep it under 72 characters.
- The subject describes what the commit does, not what was wrong before.

### When to add a body

Skip the body for small, obvious changes. Add a body when:

- The change has non-obvious reasoning (link to the Moolre quirk, etc.).
- You touched more than one slug's territory and want to explain why.
- You're closing a story partially and want to flag what's left.

---

## Pull requests

### Opening a PR

1. Push your branch.
2. Open a PR against `main` using the GitHub PR template.
3. The PR title follows the same format as a commit: `<type>(<slug>): <subject>`.
   When the PR squash-merges, this becomes the commit on `main`.
4. Fill in every section of the template. Don't delete sections — write
   "n/a" if a section doesn't apply.

### What CI will check

Every PR runs:

- `pnpm lint` — Biome (or ESLint + Prettier) clean
- `pnpm typecheck` — TypeScript compiles with no errors
- `pnpm test` — all unit and integration tests pass
- `pnpm build` — both apps build for production

If any check fails, fix it before asking for review. Don't push broken commits
expecting your reviewer to flag them.

### Review

With two engineers, one person opens the PR and the other reviews. Self-merging
is allowed only for:

- Documentation changes
- Dependency bumps from Dependabot
- Trivial fixes (typo, formatting)

Everything else needs the other engineer to approve.

### Merging

- Squash and merge. The PR title becomes the commit message.
- Delete the branch after merging (GitHub does this automatically when
  configured).

---

## Hotfixes

We don't have a separate hotfix branch. A bug in production goes through
the same flow as any other change: branch from `main`, fix, PR, squash-merge.
The only difference is urgency.

If a fix must skip CI (e.g. CI itself is broken), tag both engineers and an
admin must temporarily disable the required check, merge, then re-enable.
This should happen at most once per quarter.

---

## Tags and releases

We don't cut formal versioned releases during the build. We do tag known-good
points before the competition demo:

```
demo-ready-v1     # Sprint 4 done, full loop working
demo-ready-v2     # Sprint 5 done, landing page live
submission        # tagged on the commit submitted to startup.moolre.com
```

To roll back during the demo, check out the most recent `demo-ready-*` tag.

---

## Files Claude must not touch

This list also applies to humans. Some are immutable on purpose, some are
generated.

- `supabase/migrations/*` files already merged to `main`. Write a new
  migration instead.
- `packages/types/supabase.ts` — generated by `pnpm db:types`.
- `.env`, `.env.local`, `.env.development` — never commit secrets.
  Update `.env.example` when you add a variable.
- `pnpm-lock.yaml` — don't hand-edit. Run `pnpm install` to update it.
- Anything under `node_modules/`, `dist/`, `.next/`, `.turbo/`.

---

## When in doubt

- Read [CLAUDE.md](../CLAUDE.md) for coding standards.
- Read [docs/architecture/setup.md](../docs/architecture/setup.md) for local
  environment setup.
- Read the spec file in `docs/specs/` for the slug you're working on. The
  acceptance criteria there is the contract.
- Ask the other engineer on WhatsApp before doing something destructive.
