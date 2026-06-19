import type {
  BulkCreateResult,
  CreateEmployeeInput,
  Employee,
  EmployeeNetwork,
  MoneyPesewas,
} from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { validateMoMoNetwork } from '../lib/validators'

// Marshalling boundary for money: pesewas (integer) in our code, numeric cedis
// in Postgres. Convert here so the rest of the codebase never sees raw cedis.
// See ADR 008.
const PESEWAS_PER_CEDI = 100

export async function createEmployee(
  employerId: string,
  input: CreateEmployeeInput,
): Promise<Employee> {
  const salaryCedis = input.monthly_salary_pesewas / PESEWAS_PER_CEDI

  const { data, error } = await supabase
    .from('employees')
    .insert({
      employer_id: employerId,
      full_name: input.full_name,
      momo_number: input.momo_number,
      network: input.network,
      monthly_salary: salaryCedis,
      start_date: input.start_date,
    })
    .select(
      'id, full_name, momo_number, network, monthly_salary, start_date, is_active, credit_flag, created_at',
    )
    .single()

  if (error || !data) {
    // The unique (employer_id, momo_number) constraint fires when this MoMo
    // number is already on the workforce. Friendly message; Postgres code 23505.
    if (error?.code === '23505') {
      throw new AppError(
        'MOMO_TAKEN',
        409,
        'A worker with this MoMo number is already on your list',
      )
    }
    logger.error({ err: error, employerId }, 'failed to insert employee')
    throw new AppError('EMPLOYEE_CREATE_FAILED', 500, 'Could not add worker')
  }

  await audit({
    action: 'employee_added',
    actor: 'employer',
    employerId,
    employeeId: data.id,
    metadata: { network: data.network },
  })

  return rowToEmployee(data)
}

// Inserts each row independently so failures are collected per-index rather
// than rolling back the whole batch. allSettled gives us parallelism without
// losing the per-row error detail.
export async function bulkCreateEmployees(
  employerId: string,
  employees: CreateEmployeeInput[],
): Promise<BulkCreateResult> {
  const results = await Promise.allSettled(
    employees.map((emp) => {
      if (!validateMoMoNetwork(emp.momo_number, emp.network)) {
        return Promise.reject(
          new AppError(
            'MOMO_NETWORK_MISMATCH',
            422,
            `MoMo number ${emp.momo_number} does not match network ${emp.network}`,
          ),
        )
      }
      return createEmployee(employerId, emp)
    }),
  )

  let inserted = 0
  const failed: BulkCreateResult['failed'] = []

  for (const [i, r] of results.entries()) {
    if (r.status === 'fulfilled') {
      inserted++
    } else {
      const err = r.reason
      failed.push({
        index: i,
        reason: err instanceof AppError ? err.message : 'Failed to insert row',
      })
    }
  }

  return { inserted, failed }
}

export async function setEmployeeActive(
  employerId: string,
  employeeId: string,
  isActive: boolean,
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', employeeId)
    .eq('employer_id', employerId)
    .select(
      'id, full_name, momo_number, network, monthly_salary, start_date, is_active, credit_flag, created_at',
    )
    .maybeSingle()

  if (error) {
    logger.error({ err: error, employerId, employeeId }, 'failed to update employee status')
    throw new AppError('EMPLOYEE_UPDATE_FAILED', 500, 'Could not update worker')
  }

  // No row matched — either the id is wrong or it belongs to another employer.
  // Same response either way so we don't leak which one.
  if (!data) {
    throw new AppError('EMPLOYEE_NOT_FOUND', 404, 'Worker not found')
  }

  await audit({
    action: isActive ? 'employee_reactivated' : 'employee_deactivated',
    actor: 'employer',
    employerId,
    employeeId: data.id,
  })

  return rowToEmployee(data)
}

// Minimal employee shape needed by the USSD flow. Kept separate from the
// public `Employee` type because `ussd_pin_hash` must never cross the
// network — it's hash material that only the api ever reads.
//
// monthly_salary_pesewas + start_date + employer_pay_date feed the wage
// engine at session init. They live on the employee record (and the joined
// employers row) but a single query saves a round trip.
export interface EmployeeForUssd {
  id: string
  employer_id: string
  full_name: string
  momo_number: string
  is_active: boolean
  ussd_pin_hash: string | null
  monthly_salary_pesewas: MoneyPesewas
  start_date: string
  employer_pay_date: number
}

interface EmployeeForUssdRow {
  id: string
  employer_id: string
  full_name: string
  momo_number: string
  is_active: boolean
  ussd_pin_hash: string | null
  monthly_salary: number
  start_date: string
  employers: { pay_date: number } | { pay_date: number }[] | null
}

export async function findEmployeeByMomoNumber(
  momoNumber: string,
): Promise<EmployeeForUssd | null> {
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, employer_id, full_name, momo_number, is_active, ussd_pin_hash, monthly_salary, start_date, employers!inner(pay_date)',
    )
    .eq('momo_number', momoNumber)
    .maybeSingle<EmployeeForUssdRow>()

  if (error) {
    logger.error({ err: error }, 'failed to look up employee by momo number')
    throw new AppError('EMPLOYEE_LOOKUP_FAILED', 500, 'Could not look up worker')
  }

  return data ? rowToEmployeeForUssd(data) : null
}

function rowToEmployeeForUssd(row: EmployeeForUssdRow): EmployeeForUssd {
  // Supabase types the nested employers relation as `T | T[] | null` even
  // though `!inner` guarantees exactly one row. Narrow defensively.
  const employer = Array.isArray(row.employers) ? row.employers[0] : row.employers
  if (!employer) {
    throw new AppError('EMPLOYER_NOT_FOUND', 500, 'Employer row missing for employee')
  }
  return {
    id: row.id,
    employer_id: row.employer_id,
    full_name: row.full_name,
    momo_number: row.momo_number,
    is_active: row.is_active,
    ussd_pin_hash: row.ussd_pin_hash,
    monthly_salary_pesewas: Math.round(row.monthly_salary * PESEWAS_PER_CEDI) as MoneyPesewas,
    start_date: row.start_date,
    employer_pay_date: employer.pay_date,
  }
}

// Minimal shape needed by the disbursement flow — network is the only
// extra field beyond what the USSD shape already carries. Kept separate
// from EmployeeForUssd because the network code never needs to enter the
// USSD session state.
export interface EmployeeForDisbursement {
  id: string
  employer_id: string
  momo_number: string
  network: 'mtn' | 'telecel' | 'at'
}

export async function findEmployeeForDisbursement(
  employeeId: string,
): Promise<EmployeeForDisbursement | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employer_id, momo_number, network')
    .eq('id', employeeId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, employeeId }, 'failed to look up employee for disbursement')
    throw new AppError('EMPLOYEE_LOOKUP_FAILED', 500, 'Could not look up worker')
  }
  if (!data) return null

  return {
    id: data.id,
    employer_id: data.employer_id,
    momo_number: data.momo_number,
    network: data.network as 'mtn' | 'telecel' | 'at',
  }
}

export async function setEmployeePinHash(employeeId: string, pinHash: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ ussd_pin_hash: pinHash })
    .eq('id', employeeId)

  if (error) {
    logger.error({ err: error, employeeId }, 'failed to save ussd pin hash')
    throw new AppError('PIN_SAVE_FAILED', 500, 'Could not save PIN')
  }

  await audit({
    action: 'employee_pin_set',
    actor: 'worker',
    employeeId,
  })
}

export async function listEmployees(employerId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, full_name, momo_number, network, monthly_salary, start_date, is_active, credit_flag, created_at',
    )
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ err: error, employerId }, 'failed to list employees')
    throw new AppError('EMPLOYEE_LIST_FAILED', 500, 'Could not load workers')
  }

  return data.map(rowToEmployee)
}

interface EmployeeRow {
  id: string
  full_name: string
  momo_number: string
  network: string
  monthly_salary: number
  start_date: string
  is_active: boolean
  credit_flag: boolean
  created_at: string
}

function rowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    full_name: row.full_name,
    momo_number: row.momo_number,
    network: row.network as EmployeeNetwork,
    // Round defensively: 3000 * 100 should be 300000 exactly, but with float
    // arithmetic on arbitrary numeric values we want to defend against drift.
    monthly_salary_pesewas: Math.round(row.monthly_salary * PESEWAS_PER_CEDI),
    start_date: row.start_date,
    is_active: row.is_active,
    credit_flag: row.credit_flag,
    created_at: row.created_at,
  }
}
