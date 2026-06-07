---
description: Start work on a slug — create the feature branch, read the spec, and stub out the files listed in the "Files to Create" section. Use this when the user says "start [slug]" or "scaffold [slug]".
---

You are kicking off implementation work for a Wagr story.

Steps:

1. Take the slug from the user (e.g. `ussd-session-handler`).
2. Confirm the slug exists in `docs/architecture/jira-map.md`. If not, stop and ask.
3. Read the matching spec file in `docs/specs/feature-*.md`. Read the whole file — acceptance criteria is the contract.
4. If the user's working directory has uncommitted changes, stop and ask before creating a new branch.
5. Create a feature branch: `git checkout -b feature/<slug>-<short-description>`. The short description is your call — keep it under 5 words and aligned with the spec's primary acceptance criterion.
6. Create empty stub files for everything in the spec's "Files to Create" section. Stubs:
   - For `.ts` files: include a one-line header comment like `// <slug>: <one-line description>` and the minimum exports the spec implies (one no-op function is enough as a starting point).
   - For `.tsx` files: a minimal component that renders the component name.
   - For test files: a single failing `test.todo('...')` per acceptance criterion.
   - Do not implement the actual logic yet — leave that for the user to drive iteratively.
7. Summarise what you did:
   - Branch name
   - Files created (full paths)
   - Acceptance criteria count from the spec
   - First suggested next step (usually: implement the first acceptance criterion that has no further dependency)

## Rules

- Never start work without reading the spec first. The spec is the contract.
- Never skip step 4 (clean working tree check). Branching off dirty work creates merge headaches.
- For Moolre-touching work, also read `docs/architecture/moolre-api-reference.md` before writing any integration code.
- If the spec is unclear or contradicts the Moolre reference, stop and surface the contradiction — don't guess.
- Never edit `supabase/migrations/*` files that already exist on `main`. Create a new migration if the schema needs to change.
