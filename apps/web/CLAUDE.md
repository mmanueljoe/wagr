@AGENTS.md

# Working in apps/web

Read [the root CLAUDE.md](../../CLAUDE.md) first. This file is the web-specific addendum.

## Stack

- Next.js 16 (App Router, React 19, Turbopack)
- Tailwind CSS v4 (CSS-first, `@theme` in `globals.css`)
- shadcn/ui (Wagr brand tokens override the defaults)
- TypeScript 5 strict
- Workspace dep `@wagr/types` for shared schemas

## Web-specific rules

### Routing and pages
- All routes live under `src/app/`. Use the App Router conventions —
  `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Auth pages live under `src/app/(auth)/`. Dashboard pages live under
  `src/app/dashboard/` and inherit the sidebar layout.
- Use route groups (`(auth)`, `(dashboard)`) to share layouts without
  affecting the URL.

### Data fetching
- **No direct `fetch` calls in components.** Use a hook in `src/hooks/`.
- **No direct Supabase calls from the web.** All data goes through the api.
  The api is the only thing that talks to Supabase or Moolre.
- Server Components are allowed to call api endpoints directly (server-to-server).

### Styling
- **All design tokens come from `globals.css`.** Don’t hardcode hex values
  in components — use the `bg-wagr-navy`, `text-wagr-gray` utilities.
- If you need a new token, add it to the `@theme` block in `globals.css`
  AND to [docs/brand/design-system.md](../../docs/brand/design-system.md).
- shadcn/ui components are added via `npx shadcn@latest add <component>`.
  They land in `src/components/ui/` and pick up the Wagr semantic tokens
  automatically.

### Components
- Reusable components live in `src/components/`. Subfolders:
  - `ui/` — shadcn primitives (auto-generated, don’t hand-edit logic).
  - `landing/` — landing page sections.
  - `dashboard/` — dashboard-specific (sidebar, stat cards, etc.).
  - `shared/` — used in both landing and dashboard.
- One component per file. File name = component name in kebab-case
  (e.g. `stat-card.tsx` exporting `StatCard`).

### Env vars
- Public vars (exposed to the browser) start with `NEXT_PUBLIC_`.
- Add new vars to `.env.example` when you introduce them — never commit
  real `.env.local`.

### Don’t do
- Don’t copy-paste boilerplate from Next 14 or earlier — Next 16 has
  breaking changes (see AGENTS.md above).
- Don’t use `pages/` — App Router only.
- Don’t add a CSS-in-JS library. Tailwind + plain CSS in `globals.css`
  covers our needs.
- Don’t introduce a state management library without a real shared-state
  need. React hooks + URL state should cover the dashboard.
