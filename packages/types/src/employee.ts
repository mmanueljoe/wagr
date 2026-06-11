import { z } from 'zod'
import type { MoneyPesewas } from './money'

// Networks match Moolre's canonical Ghana set. The integer codes Moolre wants
// at the API boundary are translated only inside apps/api/src/lib/moolre.ts.
export const EMPLOYEE_NETWORKS = ['mtn', 'telecel', 'at'] as const
export type EmployeeNetwork = (typeof EMPLOYEE_NETWORKS)[number]

// MoMo numbers are stored in 10-digit local format (e.g. 0244123456) to match
// the DB CHECK constraint AND Moolre's USSD/Transfers API expectations. The
// employer's contact phone (in `employers.phone`) is E.164 — different shape
// because that's a contact-us number, not a wallet identifier.
export const GH_MOMO_REGEX = /^0\d{9}$/

export const createEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  momo_number: z.string().regex(GH_MOMO_REGEX, 'Enter a valid 10-digit Ghana MoMo number'),
  network: z.enum(EMPLOYEE_NETWORKS),
  monthly_salary_pesewas: z.number().int().positive('Salary must be positive'),
  // ISO date string (yyyy-mm-dd). Comes from <input type="date">.
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid start date'),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const setEmployeeActiveSchema = z.object({
  is_active: z.boolean(),
})

export type SetEmployeeActiveInput = z.infer<typeof setEmployeeActiveSchema>

// Public shape returned from /employees endpoints. All money in pesewas.
export interface Employee {
  id: string
  full_name: string
  momo_number: string
  network: EmployeeNetwork
  monthly_salary_pesewas: MoneyPesewas
  start_date: string
  is_active: boolean
  credit_flag: boolean
  created_at: string
}
