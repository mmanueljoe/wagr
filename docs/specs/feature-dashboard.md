# Spec: Employer Dashboard

**Epic:** WAGR-E6 Employer Dashboard
**Stories:** [dashboard-home], [dashboard-employees], [dashboard-advances], [payroll-flow], [dashboard-credit-flags]
**Sprint:** Week 4
**Status:** Not started

---

## Overview

The employer dashboard is the primary web interface for Wagr. Employers use it to monitor advance activity, manage their workforce, process payroll, and review AI credit flags. It is a Next.js application with a persistent sidebar navigation and a main content area.

---

## User Stories

**[dashboard-home]** — As an employer, I want a dashboard home screen showing my float balance and recent activity.

**[dashboard-employees]** — As an employer, I want to view my full employee list with their advance history.

**[dashboard-advances]** — As an employer, I want to see all advance requests with their current status.

**[payroll-flow]** — As an employer, I want to process payroll from the dashboard.

**[dashboard-credit-flags]** — As an employer, I want to see AI credit scoring flags on my employee list.

---

## Acceptance Criteria

### Dashboard Home ([dashboard-home])
- [ ] Four stat cards: Float Balance, Advances This Period, Pending Requests, Repayment Rate
- [ ] Float balance shows current amount with a Fund Float button
- [ ] Recent advance requests table shows last 10 requests with employee name, amount, status, and time
- [ ] Status badges use the correct colours (see design system)
- [ ] Data refreshes on page load
- [ ] Empty state shown when no advances have been made yet

### Employee List ([dashboard-employees])
- [ ] Table columns: Name, MoMo Number, Network, Monthly Salary, Advances This Period, Status, Actions
- [ ] Search by employee name
- [ ] Sort by name (A-Z, Z-A) and advances this period (high to low)
- [ ] Credit flag warning icon shown next to names with active flags
- [ ] Clicking an employee row opens their advance history
- [ ] Add Employee button opens the single employee form ([single-employee-add])
- [ ] Upload CSV button opens the CSV upload modal ([csv-employee-upload])
- [ ] Pagination — 25 employees per page

### Advance Request List ([dashboard-advances])
- [ ] Table columns: Employee, Requested Amount, Fee, Net Disbursed, Status, Requested At, Disbursed At
- [ ] Filter by status: All, Pending, Disbursed, Repaid, Failed
- [ ] Date range filter for the requested_at column
- [ ] Export to CSV button downloads the filtered view
- [ ] Failed advances show a Retry button (triggers [moolre-disbursement] disbursement retry)
- [ ] Pagination — 50 rows per page

### Close Pay Period ([payroll-flow])
*(Slug name retained for branch continuity. The actual flow is "close pay period" — recover outstanding advances + send worker advance summaries. Wagr does NOT disburse worker salaries; see [feature-disbursements.md](feature-disbursements.md) "Wagr's product scope".)*

- [ ] Pay-period page shows the current period summary
- [ ] Table columns: Worker, Advances Taken This Period, Date of Last Advance
- [ ] Summary row at the bottom: Total Advances to Recover (this is the amount that will be pulled from the employer's MoMo)
- [ ] **Close Pay Period** button opens a confirmation modal
- [ ] Confirmation modal shows: amount to be collected from the employer's MoMo, number of workers who took advances this period (who will receive a WhatsApp summary)
- [ ] Confirmation modal explicitly states: *"Wagr will pull GHS X from your MoMo to recover advances. Your regular payroll process is unchanged — you still pay each worker their normal salary minus the advance amount they took."*
- [ ] Processing state shown during the operation — button disabled, spinner visible
- [ ] Success state: green banner, recovery summary shown, WhatsApp advance summaries sent
- [ ] Failure state: red banner with error, no partial processing

### Advance Pattern Flags ([dashboard-credit-flags])
*(Reframed from "AI Credit Flags". Wagr does not score creditworthiness or make lending decisions; the flag is informational. See [feature-ai.md](feature-ai.md) "Advance Pattern Flag" for the scope rationale.)*

- [ ] Warning icon on employee row when an active advance-pattern flag exists
- [ ] Clicking the icon opens a side panel or modal
- [ ] Panel shows: flag reason (plain English, LLM-generated), date flagged, advance history for the past 30 days
- [ ] Employer can dismiss a flag — sets flag to acknowledged, icon changes to gray
- [ ] Dismissed flags reappear if the pattern continues on the next evaluation
- [ ] Flags list accessible from a dedicated Flags tab in the employee detail view
- [ ] UI labels say "advance pattern" / "frequent advances" — **never** "credit risk" or "credit score" (those would overclaim what Wagr is measuring)

---

## Technical Notes

### Dashboard Layout

```tsx
// apps/web/src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-wagr-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
```

### Sidebar Navigation

```tsx
// apps/web/src/components/dashboard/sidebar.tsx
const navItems = [
  { href: '/dashboard',           label: 'Dashboard',  icon: IconDashboard },
  { href: '/dashboard/employees', label: 'Employees',  icon: IconUsers },
  { href: '/dashboard/advances',  label: 'Advances',   icon: IconCreditCard },
  { href: '/dashboard/period-close', label: 'Close Period', icon: IconCalendar },
  { href: '/dashboard/settings',  label: 'Settings',   icon: IconSettings },
]
```

Active nav item: wagr-gold left border, wagr-navy-light background.
Sidebar background: wagr-navy. All text white.

### Data Fetching Pattern

Use React hooks that call the Wagr API. Do not call Supabase directly from the frontend.

```typescript
// apps/web/src/hooks/use-advances.ts
export function useAdvances(filters?: AdvanceFilters) {
  const [advances, setAdvances] = useState<AdvanceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/advances', { params: filters })
      .then(data => setAdvances(data))
      .finally(() => setLoading(false))
  }, [filters])

  return { advances, loading }
}
```

### Close Pay Period Flow (frontend)

```
Employer clicks "Close Pay Period"
    │
    ▼
GET /period-close/preview → shows advances to recover + workers to notify
    │
Employer reviews and clicks "Confirm"
    │
    ▼
POST /period-close/run → returns immediately with { jobId }
    │
    ▼
Poll GET /payroll/status/{jobId} every 3 seconds
    │
    ├─ status: processing → show spinner
    ├─ status: complete   → show success banner, stop polling
    └─ status: failed     → show error banner, stop polling
```

Payroll processing is a long-running operation. It must not block the UI. The frontend polls for status updates rather than waiting for a single slow response.

---

## UI Notes

### Stat Cards Layout

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Float Balance│  │Advances This │  │   Pending    │  │  Repayment   │
│              │  │   Period     │  │  Requests    │  │    Rate      │
│  GHS 1,240   │  │     12       │  │      2       │  │    95%       │
│              │  │              │  │              │  │              │
│ [Fund Float] │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

Float Balance card shows the Fund Float button. Repayment Rate shows the percentage of advances that were successfully repaid.

### Empty States

Every table and list must have an empty state. Do not show a blank table.

```tsx
// Example empty state for advances list
<div className="text-center py-16">
  <IconCreditCard size={48} className="text-wagr-gray mx-auto mb-4" />
  <h3 className="font-heading text-lg font-medium text-wagr-black">No advances yet</h3>
  <p className="text-wagr-gray mt-1">
    Advances will appear here once workers start requesting them via USSD.
  </p>
</div>
```

---

## Dependencies

| Story | Depends On |
|---|---|
| [dashboard-home] | [employer-register], [employer-login] (auth), [float-funding] (float balance exists) |
| [dashboard-employees] | [csv-employee-upload], [single-employee-add] (employees exist) |
| [dashboard-advances] | [moolre-disbursement] (advances exist) |
| [payroll-flow] | [payday-recovery] (recovery), [whatsapp-worker-payslip] (payslips) |
| [dashboard-credit-flags] | [credit-scoring-gpt] (credit scoring), [dashboard-employees] (employee list) |

---

## Files to Create

```
apps/web/src/app/dashboard/
├── layout.tsx
├── page.tsx                        # Home — stat cards + recent activity
├── employees/
│   ├── page.tsx                    # Employee list
│   └── [id]/
│       └── page.tsx                # Employee detail + advance history
├── advances/
│   └── page.tsx                    # All advances with filters
├── payroll/
│   └── page.tsx                    # Payroll summary and processing
└── settings/
    └── page.tsx                    # Company settings + float funding

apps/web/src/components/dashboard/
├── sidebar.tsx
├── stat-card.tsx
├── advance-table.tsx
├── employee-table.tsx
├── payroll-summary.tsx
├── payroll-confirm-modal.tsx
├── float-balance-card.tsx
├── credit-flag-badge.tsx
├── credit-flag-panel.tsx
└── empty-state.tsx

apps/web/src/hooks/
├── use-employer.ts
├── use-employees.ts
└── use-advances.ts

apps/api/src/routes/
├── advances.ts                     # GET /advances, GET /advances/:id
└── payroll.ts                      # GET /payroll/preview, POST /payroll/run, GET /payroll/status/:jobId
```
