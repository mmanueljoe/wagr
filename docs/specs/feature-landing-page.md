# Spec: Landing Page and Marketing Site

**Epic:** WAGR-E10 Landing Page
**Stories:** [landing-structure], [landing-demo-video], [landing-features-bento], [landing-social-proof]
**Sprint:** Week 5
**Status:** Not started

---

## Overview

The Wagr landing page is the public face of the product. It is what voters see when the voting campaign link is shared. It is what potential employers see before signing up. It must communicate the problem, the solution, and the call to action clearly — and it must feel like a real, modern product.

The landing page uses Aceternity UI components for the hero and feature sections. No custom design work is required beyond applying the Wagr brand tokens to the component defaults.

---

## User Stories

**[landing-structure]** — As a potential employer, I want to land on a page that clearly explains what Wagr does.
**[landing-demo-video]** — As a visitor, I want to see a demo or animated flow showing how the product works.
**[landing-features-bento]** — As a visitor, I want to see a Features section explaining the platform's capabilities.
**[landing-social-proof]** — As a visitor, I want to see social proof with real-feeling quotes.

---

## Page Structure

Six sections in this order:

```
1. Navigation bar
2. Hero section
3. Problem section
4. How it works section
5. Features section (Bento grid)
6. Social proof section
7. CTA section
8. Footer
```

---

## Section Specifications

### 1. Navigation Bar

- Wagr logo (wordmark: "Wagr" in Space Grotesk 600)
- Links: Features, How it works, For Employers
- CTA button: "Register your company" — Deep Midnight Blue background, white text
- Sticky on scroll
- Mobile: hamburger menu collapses links

Component: Build with shadcn/ui NavigationMenu

---

### 2. Hero Section

**Component:** Aceternity UI — Background Beams or Spotlight

**Headline:** Don't wait for payday.

**Subheadline:** Wagr lets Ghanaian workers access wages they have already earned — before payday — on any phone, in under 60 seconds.

**CTA:** Register your company (primary button) + See how it works (secondary, scrolls to section 4)

**Visual:** Looping video or animated mockup showing the USSD flow. Worker dials, balance appears, advance confirmed, MoMo notification. Positioned to the right of the headline on desktop, below on mobile.

**Background:** Dark — Deep Midnight Blue (#0D1B40). Text is white. Gold accent on the word "already earned" in the subheadline.

```tsx
// Reference component
import { BackgroundBeams } from '@/components/ui/background-beams'

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-[#0D1B40] flex items-center">
      <BackgroundBeams />
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h1 className="text-5xl lg:text-7xl font-semibold text-white leading-tight">
            Don&apos;t wait for<br />
            <span className="text-[#F5A623]">payday.</span>
          </h1>
          <p className="mt-6 text-xl text-white/70 max-w-lg">
            Wagr lets Ghanaian workers access wages they have already earned —
            before payday — on any phone, in under 60 seconds.
          </p>
          <div className="mt-10 flex gap-4">
            <Button size="lg" className="bg-[#F5A623] text-[#0D1B40] hover:bg-[#F5A623]/90">
              Register your company
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white/30">
              See how it works
            </Button>
          </div>
        </div>
        <div>
          {/* USSD demo video or animated mockup */}
        </div>
      </div>
    </section>
  )
}
```

---

### 3. Problem Section

**Background:** White (#FAFAF7)

**Headline:** Workers earn it. The calendar decides when they get it.

**Three problem cards** side by side:

| Card 1 | Card 2 | Card 3 |
|---|---|---|
| The loan shark | The bank wall | The awkward ask |
| "Informal lenders charge 20–31% to let you borrow your own earned wages." | "Banks require collateral most SME workers don't have." | "Asking family for money before payday damages relationships." |

Each card has a subtle red-tinted background and an icon from Tabler Icons (ti-alert-triangle or similar). Cards animate in on scroll.

**Component:** shadcn/ui Card with Framer Motion scroll animation or Aceternity UI Card Hover Effect

---

### 4. How It Works Section

**Background:** Light grey (#F1F1EF)

**Headline:** Three steps. Any phone. Under 60 seconds.

**Three steps** with numbered indicators:

**Step 1 — Dial**
Worker dials the Wagr USSD code on any phone. No internet required. No app needed.

**Step 2 — Request**
Worker checks their earned balance and requests an advance. Confirms with a 4-digit PIN.

**Step 3 — Receive**
Advance arrives on the worker's MoMo wallet within 60 seconds. A payslip is sent on WhatsApp on payday.

**Visual:** Consider an animated step-through showing each screen of the USSD menu as a simple phone mockup. Animate on scroll or on button click.

---

### 5. Features Section (Bento Grid)

**Component:** Aceternity UI — Bento Grid

**Headline:** Built on Moolre. Designed for Ghana.

Six feature cards in a bento layout (2 large, 4 small):

**Large card 1 — USSD Access**
Works on any phone, any network. No smartphone. No internet. Just dial.
Icon: ti-device-mobile

**Large card 2 — Instant MoMo**
Advances hit the worker's wallet in under 60 seconds across MTN, Telecel, and AirtelTigo.
Icon: ti-bolt

**Small card 3 — Employer Dashboard**
One dashboard. Every employee. Every advance. Every payday. In one place.
Icon: ti-layout-dashboard

**Small card 4 — WhatsApp Payslips**
Workers receive a personalised payslip on WhatsApp every payday. Generated by AI.
Icon: ti-brand-whatsapp

**Small card 5 — AI Credit Scoring**
Pattern-based flags on risky advance behaviour. Plain-English explanations for employers.
Icon: ti-brain

**Small card 6 — Payday Recovery**
Advance repayments collected automatically on payday. No manual reconciliation.
Icon: ti-refresh

---

### 6. Social Proof Section

**Background:** Deep Midnight Blue (#0D1B40)

**Headline:** Built for the people who keep Ghana running.

**Two testimonial cards:**

**Worker card**
Quote: "I used to borrow from a lender every month to pay my child's school fees before my salary came in. I did not realise there was a better way until Wagr."
Name: Abena Mensah
Role: Nurse, Accra
Note: Representative persona for the competition. Replace with real testimonial post-launch.

**Employer card**
Quote: "My staff used to come to me personally asking for advances. It was uncomfortable and hard to track. Wagr handles it automatically and my workers are less stressed."
Name: Kweku Asante
Role: Director, Accra Wellness Clinic
Note: Representative persona for the competition. Replace with real testimonial post-launch.

**Component:** shadcn/ui Card with a subtle border and gold accent line on the left

---

### 7. CTA Section

**Background:** Warm Gold (#F5A623)

**Headline:** Give your workers access to what they have already earned.

**Subtext:** Join the growing number of Ghanaian SMEs using Wagr to eliminate informal advance requests and improve financial wellbeing for their teams.

**Button:** Register your company — Deep Midnight Blue background, white text

---

### 8. Footer

- Wagr wordmark
- Tagline: Don't wait for payday.
- Links: Privacy Policy, Terms of Service (pages can be placeholder for competition)
- Built on Moolre logo/badge
- Copyright 2026 Wagr

---

## UI Reference Sites

Look at these before building each section:

| Section | Reference |
|---|---|
| Hero dark with pattern | linear.app |
| Feature bento grid | vercel.com |
| Problem cards | stripe.com/payments |
| How it works steps | paystack.com |
| Social proof | wave.com |
| CTA section | chipper.cash |

---

## Aceternity UI Setup

```bash
# Install Aceternity UI
npx shadcn@latest add "https://ui.aceternity.com/registry/background-beams.json"
npx shadcn@latest add "https://ui.aceternity.com/registry/bento-grid.json"
npx shadcn@latest add "https://ui.aceternity.com/registry/card-hover-effect.json"
```

---

## Acceptance Criteria

- [ ] All six sections render correctly on desktop (1280px+) and mobile (375px)
- [ ] Page loads in under 3 seconds on a standard mobile connection
- [ ] Hero CTA button links to /register
- [ ] How it works CTA scrolls to the correct section
- [ ] All Tabler icons render correctly
- [ ] Wagr brand colours applied correctly — no default Aceternity colours visible
- [ ] Meta title: "Wagr — Don't wait for payday."
- [ ] Meta description: "Earned Wage Access for Ghanaian workers. Access your wages before payday, on any phone, in under 60 seconds."

---

## Dependencies

- [next-scaffold] (Next.js scaffold with Tailwind and shadcn/ui)
- Brand tokens must be configured in the `@theme` block of globals.css before building this page

---

## Files to Create

```
apps/web/src/app/
└── page.tsx                    # Landing page (replaces default Next.js page)

apps/web/src/components/landing/
├── nav.tsx
├── hero-section.tsx
├── problem-section.tsx
├── how-it-works-section.tsx
├── features-section.tsx
├── social-proof-section.tsx
├── cta-section.tsx
└── footer.tsx
```
