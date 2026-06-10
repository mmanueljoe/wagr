# 011. Layered architecture, not MVC

Date: 2026-06-09
Status: Accepted

## Context

A common instinct when designing a backend is "MVC." For a Rails or Django
app that renders server-side HTML, MVC fits — the C builds the V. For a
JSON API consumed by a separate frontend, there's no V on the server. The
api returns data; the web renders it. MVC's three-letter framing doesn't
quite map.

## Decision

Use **layered architecture** in `apps/api`:

- **Route** — wires a URL to a controller. Knows nothing else.
- **Controller** — reads req, calls a service, sends res. No business logic.
- **Service** — pure business logic. Throws AppError. Knows nothing about HTTP.
- **Lib/client** — wraps an external system (Supabase, Redis, Moolre, OpenAI).
- **Domain** — types and Zod schemas. Shared via packages/types.

Direction of imports: route → controller → service → lib. Never the reverse.

## Consequences

**Accepted:**
- One more layer than the simplest "fat route" Express style.
- A new contributor needs to learn which layer their code belongs in.

**Gained:**
- Services are unit-testable without Express. The wage-engine pattern we
  already use generalises to all business logic.
- Controllers are 5-10 lines each; routes are trivial wiring.
- Mocking is concentrated at lib/ (the only place we touch external systems).
- Refactoring an endpoint's business logic doesn't touch the route or the
  middleware.

## Alternatives considered

- **MVC.** Doesn't quite map (no view layer on the server).
- **Clean Architecture / Hexagonal.** Overkill for an MVP. Adds 2-3 more
  layers of indirection (ports, adapters, use-cases) without clear gain
  at our scale.
- **Fat routes (current state).** Fine for 3 endpoints, ugly at 20.