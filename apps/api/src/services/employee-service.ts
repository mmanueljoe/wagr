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
