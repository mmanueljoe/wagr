'use client'

import { EmployeesTable } from '@/components/dashboard/employees-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useEmployees } from '@/hooks/use-employees'
import { UserPlus, Users } from 'lucide-react'
import Link from 'next/link'

// Container — owns the data query. Rendering belongs to EmployeesTable
// (presentational) and EmptyState (shared).

export default function EmployeesPage() {
  const { data: employees, isLoading, error } = useEmployees()

  return (
    <main className="min-h-screen bg-wagr-gray-light p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading text-wagr-navy">Your workforce</h1>
            <p className="text-sm text-wagr-gray">
              Workers on your Wagr account. Each one can request advances against earned wages.
            </p>
          </div>
          {employees && employees.length > 0 && (
            <Button asChild>
              <Link href="/dashboard/employees/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add worker
              </Link>
            </Button>
          )}
        </div>

        {isLoading && <p className="text-sm text-wagr-gray">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {employees && employees.length === 0 && (
          <EmptyState
            icon={Users}
            title="Your workforce is empty"
            description="Add your first worker to start letting them request advances against wages they've already earned."
            action={
              <Button asChild>
                <Link href="/dashboard/employees/new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add your first worker
                </Link>
              </Button>
            }
          />
        )}
        {employees && employees.length > 0 && <EmployeesTable employees={employees} />}
      </div>
    </main>
  )
}
