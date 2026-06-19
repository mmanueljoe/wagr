'use client'

import { AdvancePatternFlag } from '@/components/dashboard/advance-pattern-flag'
import { AdvancesTable } from '@/components/dashboard/advances-table'
import { EmptyState } from '@/components/shared/empty-state'
import { useEmployeeAdvances } from '@/hooks/use-employee-advances'
import { useEmployees } from '@/hooks/use-employees'
import { type Employee, formatGhs } from '@wagr/types'
import { ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const NETWORK_LABELS: Record<Employee['network'], string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const employeeId = params?.id

  const { data: employees, isLoading: employeesLoading } = useEmployees()
  const { data: advancesData, isLoading: advancesLoading } = useEmployeeAdvances(employeeId)

  const employee = employees?.find((e) => e.id === employeeId)
  const advances = advancesData?.advances ?? []

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center text-sm text-wagr-gray hover:text-wagr-navy"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to workforce
        </Link>

        {employeesLoading && <p className="text-sm text-wagr-gray">Loading…</p>}

        {!employeesLoading && !employee && (
          <EmptyState
            icon={CreditCard}
            title="Worker not found"
            description="This worker may have been removed, or you don't have access."
          />
        )}

        {employee && (
          <>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-heading text-wagr-navy">{employee.full_name}</h1>
                    <AdvancePatternFlag employee={employee} />
                  </div>
                  <p className="text-sm text-wagr-gray">
                    Joined{' '}
                    {new Date(employee.start_date).toLocaleDateString('en-GH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={
                    employee.is_active
                      ? 'inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700'
                      : 'inline-flex items-center rounded-full bg-wagr-gray-light px-3 py-1 text-xs font-medium text-wagr-gray'
                  }
                >
                  {employee.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <Detail label="MoMo number" value={employee.momo_number} mono />
                <Detail label="Network" value={NETWORK_LABELS[employee.network]} />
                <Detail label="Monthly salary" value={formatGhs(employee.monthly_salary_pesewas)} />
                <Detail
                  label="Advances this period"
                  value={String(employee.advances_this_period_count ?? 0)}
                />
              </dl>
            </div>

            <section>
              <h2 className="text-lg font-heading text-wagr-navy mb-3">Advance history</h2>

              {advancesLoading && <p className="text-sm text-wagr-gray">Loading advances…</p>}
              {!advancesLoading && advances.length === 0 && (
                <EmptyState
                  icon={CreditCard}
                  title="No advances yet"
                  description={`${employee.full_name} hasn't requested any advances.`}
                />
              )}
              {advances.length > 0 && <AdvancesTable advances={advances} />}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Detail({
  label,
  value,
  mono,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <dt className="text-xs text-wagr-gray">{label}</dt>
      <dd className={mono ? 'font-mono text-wagr-navy' : 'text-wagr-navy'}>{value}</dd>
    </div>
  )
}
