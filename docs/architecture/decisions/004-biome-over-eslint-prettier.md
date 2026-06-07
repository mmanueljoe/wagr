# 004. Biome over ESLint + Prettier

Date: 2026-06-06
Status: Accepted

## Context

We need both a linter and a formatter. The conventional setup is
**ESLint + Prettier** — two tools, two configs, plugin ecosystems for each.

**Biome** is a newer single tool written in Rust that handles both linting
and formatting in one binary. It's roughly 10× faster than ESLint+Prettier
and ships with sensible defaults out of the box.

## Decision

Use **Biome** for both linting and formatting. Config lives in `biome.json`
at the repo root.

## Consequences

**Accepted:**
- Smaller plugin ecosystem than ESLint. If a rule we want doesn't exist in
  Biome, we either drop it or wait for upstream support.
- Less familiar to engineers who learned the ESLint world.

**Gained:**
- One config file, one binary, one mental model.
- Pre-commit (lint-staged) hooks are fast — important for hooks people
  actually keep enabled.
- No "Prettier and ESLint disagree about quotes" friction.

## Alternatives considered

- **ESLint + Prettier (the conventional stack).** More mature plugin
  ecosystem, but two configs to maintain and slower runs. The friction
  matters at the scale of a small team that benefits from instant feedback.
- **dprint / oxc / standard.** Less established at the time of this call.
  Worth re-evaluating in 6–12 months.

## Reconsidering this decision

If we hit a rule we genuinely need that Biome can't express, the cost to
switch back to ESLint+Prettier is one PR — Biome's formatting is close
enough to Prettier's that the diff would be small. Don't treat this as
locked-in for the lifetime of the project.
