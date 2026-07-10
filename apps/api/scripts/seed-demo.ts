import bcrypt from 'bcrypt'
import { env } from '../src/lib/env'
import { supabase } from '../src/lib/supabase'

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@wagr.dev'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'DemoWagr-2026!'
const DEMO_PIN = process.env.DEMO_WORKER_PIN ?? '4321'
const PESEWAS_PER_CEDI = 100

type SeedEmployeeRow = { id: string; full_name: string }
type SeedAdvanceRow = { id: string; fee_amount: number; status: string }

const employees = [
  {
    full_name: 'Abena Mensah',
    momo_number: process.env.DEMO_WORKER_MOMO ?? '0244123456',
    network: 'mtn',
    monthly_salary: 2200,
    start_date: '2025-11-03',
    credit_flag: false,
    credit_flag_reason: null,
  },
  {
    full_name: 'Kojo Asante',
    momo_number: '0270000003',
    network: 'at',
    monthly_salary: 1800,
    start_date: '2025-08-18',
    credit_flag: false,
    credit_flag_reason: null,
  },
  {
    full_name: 'Ama Boateng',
    momo_number: '0550000002',
    network: 'telecel',
    monthly_salary: 2600,
    start_date: '2024-09-09',
    credit_flag: true,
    credit_flag_reason: 'Three advances this period; consider checking in before payday.',
  },
  {
    full_name: 'Kwame Owusu',
    momo_number: '0240000004',
    network: 'mtn',
    monthly_salary: 1500,
    start_date: '2026-02-02',
    credit_flag: false,
    credit_flag_reason: null,
  },
  {
    full_name: 'Efua Sarpong',
    momo_number: '0200000005',
    network: 'mtn',
    monthly_salary: 3100,
    start_date: '2024-04-15',
    credit_flag: false,
    credit_flag_reason: null,
  },
  {
    full_name: 'Yaw Nkrumah',
    momo_number: '0260000006',
    network: 'at',
    monthly_salary: 1950,
    start_date: '2025-01-20',
    credit_flag: false,
    credit_flag_reason: null,
  },
] as const

async function main(): Promise<void> {
  log(`Seeding Wagr demo data into ${env.SUPABASE_URL}`)
  log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  log(`Worker USSD PIN: ${DEMO_PIN}`)

  await deleteExistingDemoUser()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(`could not create demo auth user: ${authError?.message ?? 'missing user'}`)
  }

  const employerId = authData.user.id
  const now = new Date()
  const pinHash = await bcrypt.hash(DEMO_PIN, 10)

  await must(
    supabase.from('employers').insert({
      id: employerId,
      company_name: 'Accra Wellness Clinic',
      email: DEMO_EMAIL,
      phone: '+233244125000',
      industry: 'healthcare',
      pay_date: 28,
      float_balance: 7500,
      momo_number: process.env.DEMO_EMPLOYER_MOMO ?? '0244000001',
      network: 'mtn',
    }),
    'insert employer',
  )

  const insertedEmployees = await mustData<SeedEmployeeRow[]>(
    supabase
      .from('employees')
      .insert(
        employees.map((employee) => ({
          employer_id: employerId,
          full_name: employee.full_name,
          momo_number: employee.momo_number,
          network: employee.network,
          monthly_salary: employee.monthly_salary,
          start_date: employee.start_date,
          ussd_pin_hash: pinHash,
          credit_flag: employee.credit_flag,
          credit_flag_reason: employee.credit_flag_reason,
          credit_flag_at: employee.credit_flag ? isoDaysAgo(now, 1) : null,
        })),
      )
      .select('id, full_name'),
    'insert employees',
  )

  const byName = new Map(insertedEmployees.map((employee) => [employee.full_name, employee.id]))
  const abenaId = required(byName.get('Abena Mensah'), 'Abena Mensah id')
  const amaId = required(byName.get('Ama Boateng'), 'Ama Boateng id')
  const kojoId = required(byName.get('Kojo Asante'), 'Kojo Asante id')

  const advances = await mustData<SeedAdvanceRow[]>(
    supabase
      .from('advance_requests')
      .insert([
        {
          employee_id: abenaId,
          employer_id: employerId,
          requested_amount: 300,
          fee_amount: 10,
          net_disbursed: 290,
          status: 'disbursed',
          moolre_external_ref: `demo-adv-abena-${Date.now()}`,
          moolre_transaction_id: `demo-tx-abena-${Date.now()}`,
          requested_at: isoDaysAgo(now, 3),
          disbursed_at: isoDaysAgo(now, 3),
        },
        {
          employee_id: amaId,
          employer_id: employerId,
          requested_amount: 250,
          fee_amount: 10,
          net_disbursed: 240,
          status: 'disbursed',
          moolre_external_ref: `demo-adv-ama-1-${Date.now()}`,
          moolre_transaction_id: `demo-tx-ama-1-${Date.now()}`,
          requested_at: isoDaysAgo(now, 8),
          disbursed_at: isoDaysAgo(now, 8),
        },
        {
          employee_id: amaId,
          employer_id: employerId,
          requested_amount: 150,
          fee_amount: 10,
          net_disbursed: 140,
          status: 'repaid',
          moolre_external_ref: `demo-adv-ama-2-${Date.now()}`,
          moolre_transaction_id: `demo-tx-ama-2-${Date.now()}`,
          requested_at: isoDaysAgo(now, 33),
          disbursed_at: isoDaysAgo(now, 33),
          repaid_at: isoDaysAgo(now, 5),
        },
        {
          employee_id: kojoId,
          employer_id: employerId,
          requested_amount: 200,
          fee_amount: 10,
          net_disbursed: 190,
          status: 'failed',
          moolre_external_ref: `demo-adv-kojo-${Date.now()}`,
          failure_reason: 'Sandbox transfer declined',
          requested_at: isoDaysAgo(now, 6),
        },
      ])
      .select('id, fee_amount, status'),
    'insert advances',
  )

  await must(
    supabase.from('wagr_ledger').insert(
      advances
        .filter((advance) => advance.status === 'disbursed' || advance.status === 'repaid')
        .map((advance) => ({
          advance_request_id: advance.id,
          fee_amount: advance.fee_amount,
        })),
    ),
    'insert Wagr ledger rows',
  )

  await must(
    supabase.from('float_top_ups').insert([
      {
        employer_id: employerId,
        amount: 5000,
        status: 'succeeded',
        moolre_external_ref: `demo-float-1-${Date.now()}`,
        moolre_transaction_id: `demo-float-tx-1-${Date.now()}`,
        initiated_at: isoDaysAgo(now, 12),
        completed_at: isoDaysAgo(now, 12),
      },
      {
        employer_id: employerId,
        amount: 2500,
        status: 'succeeded',
        moolre_external_ref: `demo-float-2-${Date.now()}`,
        moolre_transaction_id: `demo-float-tx-2-${Date.now()}`,
        initiated_at: isoDaysAgo(now, 2),
        completed_at: isoDaysAgo(now, 2),
      },
    ]),
    'insert float top-ups',
  )

  await must(
    supabase.from('audit_log').insert([
      {
        action: 'demo_data_seeded',
        actor: 'system',
        employer_id: employerId,
        metadata: {
          employees: employees.length,
          advances: advances.length,
          float_balance_pesewas: 7500 * PESEWAS_PER_CEDI,
        },
      },
    ]),
    'insert audit row',
  )

  log(`Seeded ${employees.length} employees, ${advances.length} advances, and GHS 7,500 float.`)
}

async function deleteExistingDemoUser(): Promise<void> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`could not list users: ${error.message}`)

  const existing = data.users.find((user) => user.email?.toLowerCase() === DEMO_EMAIL.toLowerCase())
  if (!existing) return

  const { error: deleteError } = await supabase.auth.admin.deleteUser(existing.id)
  if (deleteError) throw new Error(`could not reset existing demo user: ${deleteError.message}`)
  log(`Reset existing demo user ${DEMO_EMAIL}`)
}

async function must<T extends { error: { message?: string } | null }>(
  result: PromiseLike<T>,
  label: string,
): Promise<void> {
  const { error } = await result
  if (error) throw new Error(`${label} failed: ${error.message ?? 'unknown database error'}`)
}

async function mustData<T>(
  result: PromiseLike<{ data: T | null; error: { message?: string } | null }>,
  label: string,
): Promise<T> {
  const { data, error } = await result
  if (error || !data) {
    throw new Error(`${label} failed: ${error?.message ?? 'missing returned data'}`)
  }
  return data
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`missing ${label}`)
  return value
}

function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function log(line: string): void {
  console.log(line)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
