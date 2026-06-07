# 006. Tailwind v4 CSS-first configuration

Date: 2026-06-06
Status: Accepted

## Context

Tailwind v4 (released January 2025) is a significant rewrite. The headline
change for project setup: **there is no `tailwind.config.ts`**. All design
tokens are declared in CSS inside a `@theme` block in `globals.css`.
Content paths are auto-detected.

Wagr's design system originally documented tokens as a v3-style
`tailwind.config.ts`. When we updated to Tailwind v4, we had to choose
whether to use the new CSS-first config or stay on v3 conventions.

## Decision

Adopt Tailwind v4 CSS-first configuration.

- All brand tokens (`--color-wagr-navy`, `--radius-wagr-lg`, etc.) live in
  the `@theme` block of `apps/web/src/app/globals.css`.
- shadcn/ui semantic tokens (`--background`, `--primary`, etc.) live in the
  same file as `:root` CSS variables that reference the brand tokens.
- No `tailwind.config.ts` exists in the repo.
- The PostCSS config uses `@tailwindcss/postcss`.
- For animations, we use `tw-animate-css` instead of `tailwindcss-animate`
  (v4-compatible fork).

## Consequences

**Accepted:**
- All Tailwind-related setup happens in one CSS file, not split across
  JS config and CSS.
- Engineers new to Tailwind v4 need to learn the `@theme` syntax.
- Some older shadcn/ui copy-paste snippets still use HSL-triplet variables;
  we use raw hex/oklch values instead.

**Gained:**
- One source of truth for design tokens (a single CSS file).
- Faster builds (the new Oxide engine in Tailwind v4 is ~5× faster than v3).
- No JS-config-vs-CSS-tokens drift.

## Alternatives considered

- **Stay on Tailwind v3 with `tailwind.config.ts`.** Rejected because v3 is
  in maintenance mode and v4 ships substantial perf and DX improvements.
- **Use Tailwind v4 but keep a `tailwind.config.ts` for tokens.** Tailwind
  v4 still allows a config file as a fallback, but mixing CSS-first tokens
  with JS-defined tokens creates confusion about which is authoritative.
