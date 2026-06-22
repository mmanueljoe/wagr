# Wagr Design System — Developer Reference

This document is the single source of truth for visual decisions in the Wagr codebase.
Both developers reference this before writing any UI code.

---

## Tailwind Configuration

Tailwind v4 is CSS-first — there is no `tailwind.config.ts`. All design tokens are declared
in a `@theme` block inside `globals.css`. Content paths are auto-detected.

Add the Wagr tokens to `apps/web/src/app/globals.css` before writing any UI code.
Both developers must use these token names — no hardcoded hex values anywhere in component files.

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";
@plugin "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Wagr brand colours — use these names everywhere.
     Declaring them as --color-* tokens generates the bg-*, text-*, border-* utilities. */
  --color-wagr-navy:        #0D1B40;   /* Primary — navigation, headings, primary buttons */
  --color-wagr-gold:        #F5A623;   /* Accent — CTAs, highlights, active states */
  --color-wagr-white:       #FAFAF7;   /* Background — page backgrounds, card backgrounds */
  --color-wagr-black:       #1A1A2E;   /* Text — all body text */

  /* Semantic shades — for states and feedback */
  --color-wagr-navy-light:  #1a2d5a;   /* Hover state on navy buttons */
  --color-wagr-gold-light:  #fbb845;   /* Hover state on gold buttons */
  --color-wagr-gray:        #888780;   /* Muted text, placeholders, disabled states */
  --color-wagr-gray-light:  #F1EFE8;   /* Subtle backgrounds, dividers */

  /* USSD screen — scoped exception, landing page only.
     Renders the authentic green-on-black of Ghanaian feature-phone USSD
     overlays inside the <UssdScreen /> component. Not for general UI. */
  --color-ussd-green:       #00ff41;
  --color-ussd-bg:          #000000;

  /* Font families — wired to the next/font CSS variables set in layout.tsx */
  --font-heading: var(--font-heading), "Space Grotesk", sans-serif;
  --font-body:    var(--font-body),    "Inter",         sans-serif;

  /* Custom border radii — generates rounded-wagr, rounded-wagr-lg, rounded-wagr-xl */
  --radius-wagr:    8px;    /* Standard component radius */
  --radius-wagr-lg: 12px;   /* Card radius */
  --radius-wagr-xl: 16px;   /* Large card, modal radius */
}
```

Notes for migrators coming from v3:
- `tailwind.config.ts` and `postcss.config.js` are no longer needed for token declarations.
- The `tailwindcss-animate` plugin is replaced by `tw-animate-css` for v4.
- Token-name to utility mapping is automatic: `--color-wagr-navy` → `bg-wagr-navy`, `text-wagr-navy`, `border-wagr-navy`; `--radius-wagr-lg` → `rounded-wagr-lg`; `--font-heading` → `font-heading`.

---

## Google Fonts Setup

Add to apps/web/src/app/layout.tsx:

```tsx
import { Space_Grotesk, Inter } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-heading',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="font-body bg-wagr-white text-wagr-black">
        {children}
      </body>
    </html>
  )
}
```

---

## shadcn/ui Theme Override

After running `npx shadcn@latest init` (which detects Tailwind v4 and writes its variables
in the v4 format), override shadcn's semantic tokens to point at the Wagr palette.
Both blocks live in the same `globals.css` as the `@theme` block above.

```css
/* apps/web/src/app/globals.css — continued */

:root {
  --background: var(--color-wagr-white);
  --foreground: var(--color-wagr-black);
  --primary: var(--color-wagr-navy);
  --primary-foreground: #ffffff;
  --accent: var(--color-wagr-gold);
  --accent-foreground: var(--color-wagr-navy);
  --muted: var(--color-wagr-gray-light);
  --muted-foreground: var(--color-wagr-gray);
  --border: var(--color-wagr-gray-light);
  --radius: 0.5rem;
}

/* Expose shadcn's semantic tokens to Tailwind so utilities like bg-primary work.
   In v4, shadcn ships this block by default — included here for clarity. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
}
```

v4 uses raw colour values (hex, oklch) — not the space-separated HSL triplets v3 required.

---

## Typography Rules

| Element | Font | Weight | Size | Tailwind Class |
|---|---|---|---|---|
| Page title (h1) | Space Grotesk | 600 | 36px / 48px | `font-heading text-4xl lg:text-5xl font-semibold` |
| Section heading (h2) | Space Grotesk | 600 | 28px | `font-heading text-3xl font-semibold` |
| Card heading (h3) | Space Grotesk | 500 | 20px | `font-heading text-xl font-medium` |
| Body text | Inter | 400 | 16px | `font-body text-base` |
| Small / caption | Inter | 400 | 14px | `font-body text-sm text-wagr-gray` |
| Navigation label | Space Grotesk | 500 | 14px | `font-heading text-sm font-medium` |
| Button label | Space Grotesk | 500 | 14px | `font-heading text-sm font-medium` |

---

## Colour Usage Rules

These rules prevent visual inconsistency. Both developers follow them.

| Colour | Use for | Never use for |
|---|---|---|
| wagr-navy | Primary buttons, navigation background, dark section backgrounds, headings | Body text on white backgrounds (use wagr-black instead) |
| wagr-gold | One CTA per page, active nav indicator, progress bars, warning badges | Large background areas (too bright at scale) |
| wagr-white | Page background, card backgrounds, input backgrounds | Text |
| wagr-black | All body text, table cell text, form labels | Backgrounds |
| wagr-gray | Placeholder text, disabled states, timestamps, meta text | Primary actions |
| wagr-gray-light | Dividers, subtle card borders, alternate table rows | Anything that needs to communicate meaning |

**The gold rule:** Warm Gold (#F5A623) appears once per visible screen section. It is the accent. When it appears everywhere it stops being an accent.

---

## Component Patterns

### Primary Button

```tsx
// Use for the main CTA on a screen
<Button className="bg-wagr-navy text-white hover:bg-wagr-navy-light font-heading font-medium">
  Register your company
</Button>
```

### Accent Button (one per page)

```tsx
// Use for the single most important action on a dark background
<Button className="bg-wagr-gold text-wagr-navy hover:bg-wagr-gold-light font-heading font-medium">
  Get started
</Button>
```

### Status Badges

Advance request statuses appear throughout the dashboard. Use these classes consistently:

```tsx
// Pending
<Badge className="bg-yellow-50 text-yellow-800 border-yellow-200">Pending</Badge>

// Disbursed
<Badge className="bg-green-50 text-green-800 border-green-200">Disbursed</Badge>

// Repaid
<Badge className="bg-blue-50 text-blue-800 border-blue-200">Repaid</Badge>

// Failed
<Badge className="bg-red-50 text-red-800 border-red-200">Failed</Badge>
```

### Stat Card (dashboard)

```tsx
<Card className="bg-white border border-wagr-gray-light rounded-wagr-lg p-6">
  <p className="text-sm font-body text-wagr-gray">Float Balance</p>
  <p className="text-3xl font-heading font-semibold text-wagr-navy mt-1">
    GHS 1,240
  </p>
  <p className="text-sm font-body text-wagr-gray mt-1">
    Updated just now
  </p>
</Card>
```

### Data Table

Use shadcn/ui Table component. Header row uses wagr-gray-light background.
Alternate rows use wagr-white and a slightly darker shade.

```tsx
<TableHead className="bg-wagr-gray-light text-wagr-black font-heading font-medium text-sm">
  Employee
</TableHead>
```

---

## Spacing Scale

Tailwind's default spacing scale is used. The following values are the only ones used
in Wagr components. Do not use values outside this set.

| Token | Pixels | Use |
|---|---|---|
| p-2 | 8px | Tight padding — badges, small buttons |
| p-4 | 16px | Standard padding — inputs, table cells |
| p-6 | 24px | Card padding |
| p-8 | 32px | Section padding on mobile |
| p-12 | 48px | Section padding on desktop |
| p-16 | 64px | Large section padding |
| gap-2 | 8px | Tight spacing between inline elements |
| gap-4 | 16px | Standard spacing between elements |
| gap-6 | 24px | Card grid gap |
| gap-8 | 32px | Section element gap |

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  Sidebar (240px, wagr-navy background)          │
│  ┌───────────────────────────────────────────┐  │
│  │ Wagr logo                                 │  │
│  │ ─────────────────                         │  │
│  │ Dashboard (active — gold left border)     │  │
│  │ Employees                                 │  │
│  │ Advances                                  │  │
│  │ Payroll                                   │  │
│  │ Settings                                  │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  Main content area (wagr-white background)       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │Stat │ │Stat │ │Stat │ │Stat │  ← Stat cards │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                  │
│  Recent advance requests table                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

The sidebar uses wagr-navy as the background. All sidebar navigation text is white.
The active page indicator is a wagr-gold left border on the nav item.

---

## Icons

All icons use Tabler Icons (outline style). Already loaded via CDN in the base layout.

```tsx
// Install
npm install @tabler/icons-react

// Usage
import { IconBolt, IconDashboard, IconUsers } from '@tabler/icons-react'

<IconBolt size={20} stroke={1.5} className="text-wagr-gold" />
```

Common icons used in Wagr:

| Icon | Where |
|---|---|
| IconDashboard | Dashboard nav item |
| IconUsers | Employees nav item |
| IconCreditCard | Advances nav item |
| IconCalendar | Payroll nav item |
| IconSettings | Settings nav item |
| IconBolt | Instant disbursement feature |
| IconDeviceMobile | USSD feature |
| IconBrandWhatsapp | WhatsApp payslip feature |
| IconBrain | AI credit scoring feature |
| IconRefresh | Payday recovery feature |
| IconAlertTriangle | Credit flag badge |
| IconCheck | Success state |
| IconX | Error state |

---

## Mobile Responsiveness Rules

The employer dashboard is primarily used on desktop but must function on mobile.
The landing page is frequently viewed on mobile — treat it as mobile-first.

**Dashboard:** Sidebar collapses to a bottom tab bar on screens below 768px.
**Landing page:** All sections stack vertically on screens below 768px.
**Tables:** Scroll horizontally on mobile — never truncate data.
**Buttons:** Minimum touch target 44px height on mobile.
**Font sizes:** Headings reduce by one step on mobile (e.g. text-5xl desktop → text-3xl mobile).
