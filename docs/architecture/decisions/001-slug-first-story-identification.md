# 001. Slug-first story identification

Date: 2026-06-06
Status: Accepted

## Context

Wagr's stories live in Jira on the free tier. We learned that Jira numeric
IDs drift when stories are recreated, deleted, or imported — the WAGR-15 in
the docs might be WAGR-7 in Jira after a board reset. If we embed Jira IDs
in code, commits, branch names, and spec files, every drift breaks
traceability across the codebase.

The only thing reliably stable across Jira changes is the **epic name**.
Story-level IDs are too volatile to act as the canonical identifier.

## Decision

Inside the repo, we use a **slug** (e.g. `ussd-session-handler`) as the
canonical identifier for every story. Jira numeric IDs appear in exactly
one file: [`docs/architecture/jira-map.md`](../jira-map.md).

- Branch names, commit messages, and PR titles use the slug.
- Spec files, dependency graphs, and cross-references in docs use `[slug]`.
- When a Jira ID drifts, we update one cell in `jira-map.md`. Nothing else
  changes.

We also prefix Jira story titles with the slug in square brackets (e.g.
`[ussd-session-handler] USSD callback handler...`) so the slug is greppable
from the Jira side too.

## Consequences

**Accepted:**
- One file becomes the bridge between Jira and the repo. It must stay current.
- New engineers need to learn the slug → Jira ID lookup step.
- Doc cross-references look slightly busier (`[ussd-session-handler]` vs
  `WAGR-15`) but read more meaningfully.

**Avoided:**
- Mass find-replaces across 13+ files every time Jira renumbers.
- Confusing situations where a spec, branch, and Jira ticket all carry
  different numbers for the same story.

## Alternatives considered

- **Use Jira IDs directly.** Rejected because Jira IDs drift in this project.
- **Use story titles as identifiers.** Rejected because titles get edited
  for clarity, breaking cross-references.
- **Maintain Jira-to-doc sync via Jira API.** Rejected as overkill for a
  6-week, 2-engineer build.
