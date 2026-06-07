# Spec: Employee Management

**Epic:** WAGR-E2 Employer Onboarding
**Stories:** [csv-employee-upload], [single-employee-add], [employee-deactivate], [funding-model-select]
**Sprint:** Week 2
**Status:** Not started

---

## Overview

After an employer registers, they onboard their workforce. Employees can be added in bulk via CSV upload or individually via a form. Employees can be deactivated when they leave the company. The employer also selects their funding model during onboarding, which determines how advances are financed.

---

## User Stories

**[csv-employee-upload]** — As an employer, I want to upload my employee list via CSV so that I can onboard my entire workforce at once.

**[single-employee-add]** — As an employer, I want to add a single employee manually so that I can onboard new hires without re-uploading the full list.

**[employee-deactivate]** — As an employer, I want to deactivate an employee so that former staff cannot request advances.

**[funding-model-select]** — As an employer, I want to select my funding model during onboarding so that Wagr knows how to finance advances.

---

## Acceptance Criteria

### CSV Upload ([csv-employee-upload])
- [ ] Upload accepts .csv and .xlsx files only
- [ ] Required columns: full_name, momo_number, network, monthly_salary, start_date
- [ ] network column accepts: MTN, Telecel, AirtelTigo (case-insensitive)
- [ ] monthly_salary must be a positive number
- [ ] start_date must be a valid date in YYYY-MM-DD or DD/MM/YYYY format
- [ ] Duplicate momo_number within the same employer is rejected with a row-level error
- [ ] Invalid rows are flagged individually — valid rows are still inserted
- [ ] Upload summary shows: X employees added, Y rows failed with reasons
- [ ] Maximum 500 rows per upload
- [ ] Uploaded employees are immediately visible in the employee list

### Single Employee Add ([single-employee-add])
- [ ] Form collects: full_name, momo_number, network, monthly_salary, start_date
- [ ] All fields required
- [ ] momo_number validated as a valid Ghanaian phone number format
- [ ] Duplicate momo_number within the same employer returns inline error
- [ ] Employee appears in the list immediately on success
- [ ] Form resets after successful submission

### Employee Deactivation ([employee-deactivate])
- [ ] Deactivate button visible on each employee row
- [ ] Confirmation dialog shown before deactivation: "Deactivate [Name]? They will no longer be able to request advances."
- [ ] Sets employee is_active to false
- [ ] Deactivated employees are excluded from USSD lookups
- [ ] Deactivated employees are shown in the list with a Deactivated badge — they are not deleted
- [ ] Action written to audit_log with actor: employer
- [ ] Reactivation button available on deactivated employees

### Funding Model Selection ([funding-model-select])
- [ ] Shown as a step in the post-registration onboarding flow
- [ ] Two options presented with plain-English descriptions:
  - Model 1: "I will deposit funds upfront. Advances are paid from my float."
  - Model 2: "Wagr fronts the advances. I repay on payday."
- [ ] Selection saved to employer.funding_model
- [ ] Model 1 employers are taken to the Float Funding step immediately after selection
- [ ] Model 2 employers proceed directly to the dashboard

---

## Technical Notes

### CSV Parsing

Use the `papaparse` library for CSV parsing on the frontend. Validate each row before sending to the API. Send only valid rows to the API — do not send invalid rows.

```typescript
// apps/web/src/lib/csv-parser.ts
import Papa from 'papaparse'

interface EmployeeRow {
  full_name: string
  momo_number: string
  network: string
  monthly_salary: string
  start_date: string
}

interface ParseResult {
  valid: EmployeeRow[]
  invalid: { row: number; reason: string }[]
}

export function parseEmployeeCSV(file: File): Promise<ParseResult>
```

### Bulk Insert API

The API receives the validated rows and inserts them in a single transaction. If any row fails at the database level (e.g. a duplicate that was missed client-side), the entire batch does not roll back — failed rows are returned as errors.

```typescript
// POST /employees/bulk
// Body: { employees: EmployeeRow[] }
// Response: { inserted: number, failed: { index: number, reason: string }[] }
```

### MoMo Number Validation

Ghanaian MoMo numbers follow these formats:
- MTN: 024, 054, 055, 059 prefixes
- Telecel: 020, 050 prefixes
- AirtelTigo: 026, 056, 027, 057 prefixes

```typescript
// apps/api/src/lib/validators.ts
export function validateGhanaianMoMo(number: string, network: string): boolean {
  const cleaned = number.replace(/\s+/g, '').replace(/^0/, '233')
  const prefixMap = {
    MTN: ['23324', '23354', '23355', '23359'],
    Telecel: ['23320', '23350'],
    AirtelTigo: ['23326', '23356', '23327', '23357'],
  }
  return prefixMap[network]?.some(prefix => cleaned.startsWith(prefix)) ?? false
}
```

---

## UI Notes

### Employee List Table

Columns: Name, MoMo Number, Network, Monthly Salary, Status, Advances This Period, Actions

Status badge:
- Active — green badge
- Deactivated — gray badge

Actions column:
- Active employee: View history, Deactivate
- Deactivated employee: View history, Reactivate

### CSV Upload Component

```
┌─────────────────────────────────────────────┐
│  Upload employee list                        │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │   Drag and drop your CSV here        │   │
│  │   or click to browse                 │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Required columns: full_name, momo_number,   │
│  network, monthly_salary, start_date         │
│                                              │
│  Download template CSV                       │
└─────────────────────────────────────────────┘
```

Provide a downloadable CSV template with the correct column headers and one example row.

---

## Dependencies

- [employer-register], [employer-login] (employer auth) must be complete before employee management is accessible
- [db-schema] (database schema) must be deployed

---

## Files to Create

```
apps/web/src/app/dashboard/employees/
├── page.tsx                        # Employee list with add button and CSV upload
└── [id]/
    └── page.tsx                    # Individual employee detail and advance history

apps/web/src/components/dashboard/
├── employee-table.tsx
├── employee-form.tsx               # Single employee add form
└── csv-upload.tsx                  # CSV drag-and-drop upload component

apps/web/src/lib/
└── csv-parser.ts

apps/api/src/routes/
└── employees.ts                    # GET, POST, PATCH /employees and POST /employees/bulk

apps/api/src/lib/
└── validators.ts                   # MoMo number and input validation helpers
```
