# 002. GitHub Flow with no `develop` branch

Date: 2026-06-06
Status: Accepted

## Context

We needed to pick a branching strategy before writing code. Common options:

- **GitFlow** — `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`.
  Made for shipping versioned software with multiple environments.
- **GitHub Flow** — one protected branch (`main`) plus short-lived feature
  branches merged via PR.

Wagr is two engineers, ~5 active weeks, one hosted environment, deploying
continuously to Vercel and Railway from `main`. We have a hard submission
deadline on July 13, 2026.

## Decision

Use **GitHub Flow**. One long-lived branch (`main`) plus short-lived feature
branches named `feature/<slug>-short-description`. PRs squash-merge.

- `main` is protected: PRs required, CI green required, no force-push.
- Linear history via squash-merge. One PR equals one commit on `main`.
- No `develop` branch.
- Tag known-good commits (`demo-ready-v1`, `submission`) for rollback safety
  during the final week.

## Consequences

**Accepted:**
- No "did this merge to develop yet?" coordination overhead.
- No second hosted environment to maintain.
- Commit history on `main` is clean (one commit per story).

**Risks:**
- An incomplete or buggy commit on `main` ships to production immediately.
  Mitigated by: required CI checks, mandatory PR review for non-trivial work,
  and the tagged rollback points for demo-week safety.

## Alternatives considered

- **GitFlow.** Too heavyweight for a 2-engineer team without versioned
  releases. The `develop` branch would sit in sync with `main` 95% of the
  time, adding ceremony for no benefit.
- **Trunk-based with no PRs.** Rejected because we want CI checks and at
  least one reviewer on non-trivial changes.
