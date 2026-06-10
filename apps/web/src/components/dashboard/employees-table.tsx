'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Employee } from '@wagr/types'
import { formatGhs } from '@wagr/types'

const NETWORK_LABELS: Record<Employee['network'], string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

interface EmployeesTableProps {
  employees: Employee[]
}

// Presentational — props in, JSX out. No data fetching, no hooks. The page
// owns the query; this just renders rows.
export function EmployeesTable({ employees }: EmployeesTableProps) {
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
