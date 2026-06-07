---
description: Scaffold a new feature spec file for a slug in docs/specs/, using Wagr's spec template (user story, acceptance criteria, technical notes, dependencies, files to create).
---

You are creating a new feature spec file in `docs/specs/` for a Wagr story.

Steps:

1. Ask the user for: the slug (e.g. `payslip-pdf-export`), a one-sentence story description, and which epic it belongs to (see `docs/architecture/jira-map.md` for the epic list).
2. Add the slug to `docs/architecture/jira-map.md` under the correct epic, with the Jira ID column left blank.
3. Create a new spec file at `docs/specs/feature-<short-name>.md` following the template below.
4. Update `docs/architecture/build-order.md` with the new slug under the appropriate sprint, including a dependency graph entry.
5. Tell the user what was added and remind them to fill in the Jira ID once the ticket is created.

## Template

```markdown
# Spec: <Feature title>

**Epic:** WAGR-E? <Epic name>
**Stories:** [<slug>]
**Sprint:** Week N
**Status:** Not started

---

## Overview

One paragraph explaining what this feature does and why it exists.

---

## User Stories

**[<slug>]** — As a <role>, I want to <action> so that <outcome>.

---

## Acceptance Criteria

### <Story name> ([<slug>])
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Technical Notes

Implementation guidance. Code samples only when the shape isn't obvious from the criteria.

---

## Dependencies

| Story | Depends On |
|---|---|
| [<slug>] | [<other-slug>], [<other-slug>] |

---

## Files to Create

\`\`\`
apps/api/src/lib/<file>.ts
apps/web/src/components/<file>.tsx
\`\`\`
```

## Rules

- Never invent a slug — confirm with the user.
- Never invent dependencies — derive them from the spec content.
- Don't fill in a Jira ID. That column stays blank until the user creates the Jira ticket.
- Cross-reference relevant docs: [CLAUDE.md](../../CLAUDE.md), [moolre-api-reference.md](../../docs/architecture/moolre-api-reference.md), other spec files.
