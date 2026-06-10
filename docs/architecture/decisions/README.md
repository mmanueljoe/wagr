# Architecture Decision Records (ADRs)

This folder holds short write-ups explaining *why* we made specific technical
choices on Wagr. Each ADR captures the context at the time, the decision,
and the trade-offs we accepted.

## When to write a new ADR

Write an ADR when:

- We pick one tool, library, or pattern over a credible alternative.
- We make a call that future-you (or a new teammate) might ask "why did we do that?"
- We override a default that comes from a framework or external doc.

Don't write an ADR for:

- Style preferences captured in [CLAUDE.md](../../../CLAUDE.md).
- Decisions documented elsewhere (e.g. branching strategy is in
  [.github/CONTRIBUTING.md](../../../.github/CONTRIBUTING.md), Moolre details
  are in [moolre-api-reference.md](../moolre-api-reference.md)).

## Format

```
NNN-short-title.md
```

`NNN` is a zero-padded sequence number. Each ADR has the same structure:

```
# NNN. Title

Date: YYYY-MM-DD
Status: Accepted | Superseded by NNN | Deprecated

## Context
Why this decision came up. What problem we were solving.

## Decision
What we chose.

## Consequences
What we accept by choosing this. Good and bad.

## Alternatives considered
What else we looked at and why we passed.
```

## Index

| Number | Title |
|---|---|
| [001](001-slug-first-story-identification.md) | Slug-first story identification |
| [002](002-github-flow-no-develop-branch.md) | GitHub Flow with no `develop` branch |
| [003](003-pnpm-over-npm.md) | pnpm over npm and yarn |
| [004](004-biome-over-eslint-prettier.md) | Biome over ESLint + Prettier |
| [005](005-no-provider-abstraction-over-moolre.md) | No provider abstraction over Moolre |
| [006](006-tailwind-v4-css-first.md) | Tailwind v4 CSS-first configuration |
| [007](007-bff-pattern-for-auth.md) | Backend-for-Frontend pattern for authentication |
| [008](008-money-as-integer-minor-units.md) | Money as integer minor-units (pesewas) |
| [009](009-idempotency-on-money-operations.md) | Idempotency keys on every money-moving request |
| [010](010-audit-log-mandatory.md) | Append-only audit log on every state change |
| [011](011-layered-architecture-not-mvc.md) | Layered architecture, not MVC |
| [012](012-tanstack-query-for-client-data.md) | TanStack Query for client-side data fetching |
