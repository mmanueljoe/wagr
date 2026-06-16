import type { CreateEmployeeInput, Employee, EmployeeNetwork } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'

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
export interface EmployeeForUssd {
  id: string
  employer_id: string
  full_name: string
  is_active: boolean
  ussd_pin_hash: string | null
}

export async function findEmployeeByMomoNumber(
  momoNumber: string,
): Promise<EmployeeForUssd | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employer_id, full_name, is_active, ussd_pin_hash')
    .eq('momo_number', momoNumber)
    .maybeSingle()

  if (error) {
    logger.error({ err: error }, 'failed to look up employee by momo number')
    throw new AppError('EMPLOYEE_LOOKUP_FAILED', 500, 'Could not look up worker')
  }

  return data
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
