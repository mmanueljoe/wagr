# Tech debt — Wagr

A running list of things we know are missing or wrong, that we haven't done
yet because we were focused on shipping a feature. Drained in dedicated
"foundations" PRs at the start of each sprint, or whenever someone has spare
cycles.

**The discipline:** the moment something is flagged in chat, in a PR review,
or in your head — write it here. Don't trust your memory across two PRs.
Every PR description should end with a "Debt closed" list referencing the
items it removed.

---

## How to use this file

- New debt → append to the **Open** section. One bullet per item with a
  one-line description, where it lives, and rough effort.
- Drained debt → move the bullet to **Closed**, reference the PR.
- The file is *not* a backlog of features. Features live in spec docs and
  Jira. This file is *only* for foundations we cut corners on.

---

## Open

- [ ] **Web hook tests.** Hooks are pure-ish wrappers around `api.ts` calls;
      worth a small Vitest suite to lock in their contracts.
      Effort: 2 hours when the dashboard work expands them.
- [ ] **Failed-login audit row.** Currently only successful logins are
      audited. Rate-limiting + intrusion detection later will want them.
      Effort: 30 min.
- [ ] **Container/presentational split discipline.** Pages currently mix
      data-fetching hooks and rendering. Not urgent until a page balloons —
      e.g. the dashboard home in Sprint 4.
- [ ] **Web build env vars in CI.** We added SKIP_ENV_VALIDATION as a
      patch; long-term, CI should run `next build` with actual stub values
      so the build path is exercised end-to-end.
- [ ] **Web Sentry / error reporting.** `error.tsx` shows the user a
      friendly fallback, but we don't log the error anywhere a developer
      sees. Add Sentry (or similar) when we hit beta.
- [ ] **Accessibility audit.** Forms have labels and aria attributes from
      shadcn primitives, but no end-to-end pass with a screen reader.
      Effort: half a day before beta.

## Closed

- [x] Money-units refactor (integer pesewas) → PR #19
- [x] Audit logging on auth/employer routes → PR #19
- [x] Stale `apps/api/CLAUDE.md` → PR #19
- [x] AbortSignal pass-through in `api.ts` → PR #20
- [x] Sonner toasts + `not-found.tsx` + `error.tsx` + `loading.tsx`
      + shared `<EmptyState>` + `EmployeesPage` file split → PR coming
