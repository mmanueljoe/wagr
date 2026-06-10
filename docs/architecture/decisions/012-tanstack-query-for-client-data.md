# 012. TanStack Query for all client-side data fetching

Date: 2026-06-09
Status: Accepted

## Context

The web app currently uses raw `fetch` in three trivial mutation hooks
(`use-register`, `use-login`, `use-logout`). That works because the flows
are fire-and-forget. The dashboard work in Sprint 4 will introduce:

- Lists with pagination, sorting, filters (employees, advance requests).
- Status polling (advance request state changes).
- Optimistic UI on actions (approve, deactivate).
- Cache invalidation across views (an action in one place updates another).

Building this with raw `fetch + useState + useEffect` is how teams
accidentally ship a half-working cache.

## Decision

Adopt **TanStack Query** as the single client-side data layer:

- All client-side data calls — queries and mutations — go through TanStack
  Query.
- Existing hooks (`use-register`, `use-login`, `use-logout`) migrate at the
  same time, for consistency.
- Server Components continue to use plain `fetch` + `await`. That's a
  different runtime, not a library choice.

## Consequences

**Accepted:**
- One real client-side dependency. Devtools available.
- New devs learn TanStack Query concepts (query keys, mutations,
  invalidation). Well-documented; broad community adoption.

**Gained:**
- Caching, stale-while-revalidate, retry-on-window-focus, optimistic
  updates, query invalidation — all built in.
- One mental model for "how data flows" instead of bespoke hooks.
- Loading and error states standardised.

## Alternatives considered

- **SWR.** Smaller API, similar feature set. TanStack Query has stronger
  mutation primitives and the dominant ecosystem.
- **RTK Query.** Tied to Redux Toolkit, which we don't use.
- **Roll our own.** This is the path to a half-working cache. Don't.