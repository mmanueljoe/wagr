'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmployees } from '@/hooks/use-employees'
import type { Employee } from '@wagr/types'
import { formatGhs } from '@wagr/types'
import { UserPlus, Users } from 'lucide-react'
import Link from 'next/link'

const NETWORK_LABELS: Record<Employee['network'], string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

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

        {employees && employees?.length === 0 && <EmptyState />}
        {employees && employees.length > 0 && <EmployeesTable employees={employees} />}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light p-12 text-center">
      <div className="h-12 w-12 rounded-full bg-wagr-navy/10 mx-auto flex items-center justify-center mb-4">
        <Users className="h-6 w-6 text-wagr-navy" />
      </div>
      <h2 className="text-lg font-medium text-wagr-black mb-1">Your workforce is empty</h2>
      <p className="text-sm text-wagr-gray mb-6 max-w-md mx-auto">
        Add your first worker to start letting them request advances against wages they've already
        earned.
      </p>
      <Button asChild>
        <Link href="/dashboard/employees/new">
          <UserPlus className="h-4 w-4 mr-2" />
          Add your first worker
        </Link>
      </Button>
    </div>
  )
}

function EmployeesTable({ employees }: Readonly<{ employees: Employee[] }>) {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>MoMo number</TableHead>
            <TableHead>Network</TableHead>
            <TableHead className="text-right">Monthly salary</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.full_name}</TableCell>
              <TableCell className="font-mono text-sm">{e.momo_number}</TableCell>
              <TableCell>{NETWORK_LABELS[e.network]}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatGhs(e.monthly_salary_pesewas)}
              </TableCell>
              <TableCell>
                <span
                  className={
                    e.is_active
                      ? 'inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700'
                      : 'inline-flex items-center rounded-full bg-wagr-gray-light px-2 py-1 text-xs font-medium text-wagr-gray'
                  }
                >
                  {e.is_active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
