# Working in the Wagr codebase

This file is the contract between Claude and the rest of the team.
Read it before doing anything in this repo.

---

## What Wagr is

Wagr is an earned-wage-access platform for Ghanaian SME workers. Salaried
employees dial a USSD code on any phone and receive a portion of wages they
have already earned, sent to their MoMo wallet within 60 seconds. Employers
manage their workforce on a web dashboard. The hard deadline is the Moolre
Startup Cup submission on July 13, 2026.

## About Moolre

Moolre is Wagr's only external integration. It provides five APIs under one
platform: **Payments** (collecting money in), **Transfers** (sending money out),
**USSD** (worker menus), **SMS** (notifications), and **WhatsApp** (payslips).
The APIs share a base URL but use **different auth keys per API** and
**different network codes (MTN, Telecel, AirtelTigo) per API**. These are
real footguns — full mapping in
[docs/architecture/moolre-api-reference.md](docs/architecture/moolre-api-reference.md).
Status delivery also differs: **Payments uses webhooks**, **Transfers uses
polling**. Don't mix these patterns up.

---

## How we identify work

We track stories on Jira, but **the Jira numeric IDs drift** when stories get
recreated. So inside this repo we never use IDs like `WAGR-15`. We use slugs.

- A slug is a stable, lowercase, hyphen-separated name, like `ussd-session-handler`.
- The full list of slugs lives in [docs/architecture/jira-map.md](docs/architecture/jira-map.md).
  That file is the only place that maps slugs to current Jira IDs.
- Every story has a spec file at `docs/specs/feature-*.md`.
- **Always read the spec for a slug before writing code for it.** The acceptance
  criteria there is the definition of done, not a vague feature description.

When you reference a story in code, commits, or PRs, write `[slug-name]` in
square brackets. Example: *"Depends on [ussd-session-handler]."*

---

## Repo layout

```
wagr/
├── apps/
│   ├── web/                      # Next.js 15 dashboard + landing page
│   └── api/                      # Express 5 backend
├── packages/
│   ├── types/                    # Shared TS types + Zod schemas (used by both apps)
│   ├── tsconfig/                 # Shared TypeScript config
│   └── eslint-config/            # Shared lint config (if not using Biome alone)
├── supabase/
│   └── migrations/               # Timestamped SQL migrations
├── docs/
│   ├── specs/                    # One file per feature; the spec is the contract
│   ├── architecture/             # Setup, build order, jira map, ADRs
│   └── brand/                    # Design system
└── .claude/                      # Skills, agents, settings
```

Both apps share the same TypeScript config and lint rules through the `packages/`
folders. Types that cross the network (request/response bodies) live in
`packages/types` so the web app and the api both import the exact same shape.

---

## Daily commands

```
pnpm install              # install everything in the monorepo
pnpm dev                  # run web + api together
pnpm --filter web dev     # web only
pnpm --filter api dev     # api only
pnpm lint                 # check formatting and lint rules
pnpm format               # apply fixes
pnpm typecheck            # run TypeScript on both apps
pnpm test                 # run all unit tests
pnpm test:e2e             # run Playwright end-to-end tests
pnpm db:migrate           # apply new migrations
pnpm db:types             # regenerate Supabase types after schema changes
pnpm db:seed              # load demo data
pnpm test:ussd-sim        # simulate Moolre USSD callbacks locally
```

Use `pnpm`, not `npm` or `yarn`. The lockfile is `pnpm-lock.yaml` and switching
package managers breaks the workspace setup.

---

## Standards (not negotiable)

These are widely-accepted production-grade rules. Follow them.

### TypeScript
- No `any`. If you don't know the shape, use `unknown` and narrow it.
- Strict mode is on. Don't disable it for a single file.
- Database columns and JSON fields are `snake_case`. TypeScript types are
  `PascalCase`. File names are `kebab-case`.

### Comments and naming
- Don't add comments that just describe what the code does. Code that needs a
  "what" comment should be renamed instead.
- Comments are for *why*: a non-obvious business rule, a workaround for a
  Moolre quirk, a link to a relevant ticket.
- Function names describe what they do. `getEarnedWage(employeeId)` not
  `processEmployee(employeeId)`.

### Error handling
- Don't wrap code in `try/catch` unless you can do something useful in the
  catch block. "Logging and rethrowing" is not useful — the route-level error
  handler already does that.
- Let errors bubble up to the system edge (the Express error middleware on
  the api, the React error boundary on the web). Catching too early hides
  bugs.
- Throw real `Error` objects with messages a human can read. Never `throw "..."`.

### API routes
- Every Express route validates its request body with a Zod schema from
  `packages/types`. No `req.body.amount` without a schema in front of it.
- Routes return JSON. Errors use the format `{ error: { code, message } }`.
- Long-running work (Moolre disbursement, GPT-4o calls) goes through a queue
  or runs after the response is sent. The HTTP handler returns within 1 second.

### Web data fetching
- Components never call `fetch` directly. All data fetching goes through a
  hook in `apps/web/src/hooks/`.
- Components never call Supabase directly. They call the api, which calls
  Supabase. This keeps the security boundary in one place.

### Tests
- Test names describe the behaviour being tested:
  `returns zero when employee has no earned wages this period` —
  not `test getEarnedWage`.
- Don't write tests that only exercise mocks. If everything in the test is
  mocked, the test proves nothing.
- Wage engine functions are pure and should have unit tests. Express routes
  should have integration tests that hit a real test database.

### Moolre integration
- All Moolre calls live in `apps/api/src/lib/moolre.ts`. No other file imports
  the Moolre SDK or hits a Moolre URL directly.
- Store canonical network values (`'mtn' | 'telecel' | 'at'`) in the database
  and in domain types. Translate to Moolre's integer codes **only** inside
  `moolre.ts`. Never pass raw Moolre integers (3, 13, 1, etc.) across function
  boundaries — they differ per API and are a common source of bugs.
- Cross-check every Moolre integration change against
  [docs/architecture/moolre-api-reference.md](docs/architecture/moolre-api-reference.md).
  If the reference is wrong, update the reference first, then write the code.
  Don't invent endpoint shapes from memory.

### Keep code simple
- Write the simplest code that meets the spec. Don't add interfaces, config
  knobs, factories, or abstractions for cases you don't have today.
- The first time you need a pattern, write it inline. The second time, copy it.
  The third time, extract a shared helper. Not before.
- New libraries need a real reason. If the standard library or an existing
  dependency can do the job, use it.

---

## Conventions for this build (open to revision)

These are choices we made for the Wagr build. They're defensible, but
they're not laws — if you have a real reason to deviate on a specific PR,
explain it in the PR description.

- **Files under ~300 lines, functions under ~50.** Hints, not hard limits.
  When a file grows past the hint, ask whether splitting helps the reader.
- **One default export per file at most.** Prefer named exports — they
  refactor and rename better.
- **No state management library by default.** React hooks + URL state cover
  the dashboard. Add Zustand or similar only if a real shared-state need
  appears.
- **Logging:** `pino` (structured JSON) on the api, `console` on the web
  client. Don't invent a third format.
- **Default to `pnpm`, not `npm` or `yarn`.** The lockfile is `pnpm-lock.yaml`
  and switching breaks the workspace.

---

## Branching and commits

We use **GitHub Flow**: one long-lived branch (`main`) and short-lived feature
branches off it.

- Branch from `main`. Name it `feature/<slug>-short-description`.
  Example: `feature/ussd-session-handler-initial-impl`.
- Commit messages follow Conventional Commits with the slug as the scope:
  ```
  feat(ussd-session-handler): add Redis TTL on session start
  fix(payslip-gpt): handle empty deductions array
  docs(jira-map): add new slug for hotfix story
  ```
  Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`.
- PRs go to `main` and squash-merge. One PR equals one commit on `main`.
- `main` is protected: PR required, CI green required, no force-push, no
  direct commits.

For details, see [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## Pull request checklist

When you open a PR, the body should answer these:

- Which slug does this PR close?
- Are the spec's acceptance criteria met? List which ones, or mark partial.
- Have you added or updated tests?
- Did `pnpm lint && pnpm typecheck && pnpm test` pass locally?
- Did you manually verify UI or USSD changes on the running app?
- Did you add any new env vars? If so, did you update the `.env.example` file?

The template at [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
covers all of this. Use it.

---

## Files Claude must not touch

- `supabase/migrations/*` that are already on `main`. Migrations are immutable
  once merged. To change a schema, write a new migration.
- `packages/types/supabase.ts`. This file is generated by `pnpm db:types`.
  Editing it by hand will be overwritten and your changes will be lost.
- Any `.env`, `.env.local`, `.env.development`. These hold secrets and never
  go in git. Update `.env.example` instead when adding a new variable.
- `node_modules/`, `dist/`, `.next/`, `.turbo/`. Generated, gitignored.
- `pnpm-lock.yaml`. Don't edit this by hand. Run `pnpm install` to update it.

---

## When to stop and ask

Default to acting. But pause and ask first when:

- You're about to delete more than 50 lines of working code.
- You're writing a migration that drops a column or table.
- You want to add a new top-level dependency to `package.json`.
- The spec says to put files in a certain layout and you have a reason to
  diverge.
- You're about to do something that affects more than 5 files at once and it
  isn't a mechanical rename.

For everything else, proceed. Showing your work in a PR is easier than
discussing every step.

---

## Working efficiently in this repo

A few habits that save time:

- Use `Grep` to find things before reading whole files. Most files in `apps/`
  are over 100 lines.
- Use `Read` with `offset` and `limit` for large files instead of reading the
  whole thing.
- Prefer `Edit` over `Write` when changing an existing file. `Write` rewrites
  the whole file and is harder to review.
- When you need to find which file owns a feature, start with
  `docs/specs/feature-*.md` and follow the "Files to create" section there.
- Before running a Moolre integration test, make sure `ngrok` is exposing the
  api or the callback will never arrive.

---

## Anti-patterns we have decided against

- Wrapping Moolre calls in a generic provider interface "in case we swap
  later." Moolre handles payments, transfers, USSD, SMS, and WhatsApp through
  one platform — there is no single drop-in replacement. If Wagr ever moved
  off Moolre, each of the five APIs would be replaced by a different
  third-party with a different shape, so today's abstraction would be
  wrong-shaped anyway. Call Moolre directly from
  `apps/api/src/lib/moolre.ts`.
- Adding config knobs for values that aren't going to change. The advance fee
  is 3%. Write `const FEE_RATE = 0.03` in `fee-calc.ts`. Don't build a
  `feeStrategies` registry.
- Writing tests for getters and setters, or tests where everything is mocked.
  They prove nothing.
- Catching errors to "make the function safer." It hides bugs. Let them bubble
  to the route or component edge.
- Reaching for a new library when the standard library or an existing
  dependency does the job.

---

## Where to look for more detail

- [docs/architecture/setup.md](docs/architecture/setup.md) — local environment setup
- [docs/architecture/build-order.md](docs/architecture/build-order.md) — sprint sequence and dependencies
- [docs/architecture/jira-map.md](docs/architecture/jira-map.md) — slug to Jira ID mapping
- [docs/architecture/moolre-api-reference.md](docs/architecture/moolre-api-reference.md) — Moolre endpoints, auth keys, network codes, webhook vs polling rules
- [docs/architecture/decisions/](docs/architecture/decisions/) — why we made specific technical choices
- [docs/brand/design-system.md](docs/brand/design-system.md) — colours, fonts, components
- [docs/specs/](docs/specs/) — feature specifications (one per slug group)
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) — git workflow and PR conventions

When you write code in `apps/web/`, also read `apps/web/CLAUDE.md` for web-specific
rules. Same for `apps/api/`.
