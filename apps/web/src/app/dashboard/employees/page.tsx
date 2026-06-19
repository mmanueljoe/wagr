'use client'

import { CsvUpload } from '@/components/dashboard/csv-upload'
import { EmployeesTable } from '@/components/dashboard/employees-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useEmployees } from '@/hooks/use-employees'
import { UserPlus, Users } from 'lucide-react'
import Link from 'next/link'

export default function EmployeesPage() {
  const { data: employees, isLoading, error } = useEmployees()

  return (
    <main className="min-h-screen bg-wagr-gray-light p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-wagr-navy">Your workforce</h1>
            <p className="text-sm text-wagr-gray">
              Workers on your Wagr account. Each one can request advances against earned wages.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/employees/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add worker
            </Link>
          </Button>
        </div>

        {/* CSV upload — always visible so employers can bulk-add at any time */}
        <div className="rounded-wagr-lg border border-wagr-gray-light bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-base text-wagr-navy">Upload employee list</h2>
          <CsvUpload />
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
            description="Upload a CSV above or add workers one at a time."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/employees/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add first worker manually
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
