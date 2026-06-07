# Wagr

> Don't wait for payday.

Wagr is an Earned Wage Access platform for Ghanaian SME workers. It enables salaried employees to access wages they have already earned before the official payday, via USSD on any phone.

Built for the Moolre Startup Cup 2026.

---

## Repository Structure

```
wagr/
├── apps/
│   ├── web/                  # Next.js employer dashboard + landing page
│   └── api/                  # Express backend
├── docs/
│   ├── specs/                # Feature specification files
│   ├── architecture/         # Architecture decision records
│   └── brand/                # Brand and design system reference
├── .github/
│   └── CONTRIBUTING.md
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, React 19), Tailwind CSS v4, shadcn/ui |
| Backend | Node.js 22 LTS, Express 5, TypeScript 5 |
| Database | PostgreSQL via Supabase |
| Cache | Redis via Upstash |
| AI | OpenAI GPT-4o |
| Deployment | Vercel (web), Railway (api) |
| Payments | Moolre APIs |

## Getting Started

See [docs/architecture/setup.md](docs/architecture/setup.md) for local development setup.

## Feature Specs

All feature specifications live in [docs/specs/](docs/specs/). Each spec maps to one or more Jira stories.

## Build Order

See [docs/architecture/build-order.md](docs/architecture/build-order.md) for the sprint-by-sprint build sequence and dependency map.

## Brand

See [docs/brand/design-system.md](docs/brand/design-system.md) for colours, typography, and component usage guidelines.

---

**Competition deadline:** July 13, 2026
**Team:** 2 engineers
