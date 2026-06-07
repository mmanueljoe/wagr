---
description: Draft a pull request description for the current feature branch by reading the diff, the slug's spec, and the PR template — then optionally open the PR with gh. Use when the user says "open a PR", "draft the PR", or "/pr".
---

You are drafting a pull request for the current Wagr branch. You will produce a PR body that's grounded in what's actually in the diff — no invented criteria, no invented test coverage.

Steps:

1. Run `git branch --show-current` to read the current branch name.
   - If the branch name does not start with `feature/`, `fix/`, `chore/`, or `docs/`, stop and tell the user the branch doesn't fit Wagr's naming convention (see [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)).
2. If the branch starts with `feature/`, extract the slug. The slug is the longest leading match against the slugs in `docs/architecture/jira-map.md` — e.g. `feature/ussd-session-handler-redis-ttl` → slug `ussd-session-handler`, descriptor `redis-ttl`.
   - Confirm the slug exists in `docs/architecture/jira-map.md`. If it doesn't, stop and ask the user to add it before continuing.
   - For `fix/`, `chore/`, `docs/` branches, there's no slug — skip steps 4 and 5's spec-lookup parts and use "n/a" for the Slug section of the template.
3. Run `git diff main...HEAD` and `git log main..HEAD --oneline` to see what actually changed and what got committed.
4. Read the matching spec file in `docs/specs/feature-*.md` for the slug (only when there is a slug). The spec's Acceptance Criteria section is the source of truth.
5. Fill the [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md) template:
   - **Slug** — the extracted slug, or `n/a` for non-feature branches.
   - **What changed** — 1-2 sentences derived from the diff and the commit messages. Don't make up motivations the diff doesn't support.
   - **Acceptance criteria** — copy each criterion from the spec verbatim. Tick a checkbox **only** when the diff contains code that visibly satisfies the criterion (a new file, a new function, a new test, a config entry). Leave it unticked otherwise, and add a one-line note after the criterion like `<!-- not in this PR -->`.
   - **Tests** — list new or modified test files found in the diff (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, files under `__tests__/`). If no test files changed, write `No new tests in this PR.` and let the user explain why in their own words if needed.
   - **Manual verification** — write the placeholder `<describe what you clicked/dialed here, or write n/a for backend-only>`. The user fills this in.
   - **Environment variables** — scan the diff for new keys added to any `.env.example` file. If found, list them. If none, write `no new env vars`.
   - **Checklist** — leave every box unticked. The user runs the commands locally and ticks them before review.
6. Derive the PR title: `<type>(<slug>): <subject>`.
   - **type**: the dominant Conventional Commit type from `git log main..HEAD --oneline`. If the commits are a clear mix of types, stop and ask the user which type to use for the squashed commit.
   - **slug**: from step 2. For non-feature branches, use the branch prefix's natural scope (e.g. `chore: ...` with no scope).
   - **subject**: one short line derived from the first commit's subject line, or the dominant commit subject if there are many. Imperative mood, under 72 chars, no trailing period.
7. Write the filled template to `.pr-draft.md` at the repo root. **Do not paste the rendered body back into chat** — the user reads it from the file. Just confirm in one short line that the draft was written and report the proposed PR title.
8. Ask: "Open the PR now with `gh pr create --title \"<title>\" --body-file .pr-draft.md`, or leave the draft for you to edit?"
   - If the user says yes, run the `gh pr create` command.
   - If the user says no or wants to edit, leave `.pr-draft.md` in place. The file is gitignored, so it's safe to keep at the repo root for as long as the user needs.

## Rules

- Never tick an acceptance criterion you cannot verify from the diff. When in doubt, leave it unticked.
- Never invent test coverage. Only list test files that are actually in the diff.
- Never call `gh pr create` without showing the body to the user first.
- Never add a `Co-Authored-By` trailer or any other generated marker. The user manages attribution.
- Never push the branch in this skill — `gh pr create` already pushes if needed.
- If `git diff main...HEAD` returns empty, stop and tell the user there's nothing to PR.
- If the user is not on a tracking branch yet, `gh pr create` will set the upstream automatically — let it.
- If the slug exists in jira-map.md but has no spec file in `docs/specs/`, write the PR body anyway with an empty Acceptance Criteria section and a note: `<!-- spec file not yet authored — see jira-map.md -->`.
