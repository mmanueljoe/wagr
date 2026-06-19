'use client'

import { AdvancePatternFlag } from '@/components/dashboard/advance-pattern-flag'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSetEmployeeActive } from '@/hooks/use-set-employee-active'
import type { Employee } from '@wagr/types'
import { formatGhs } from '@wagr/types'
import { toast } from 'sonner'

const NETWORK_LABELS: Record<Employee['network'], string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

interface EmployeesTableProps {
  employees: Employee[]
}

export function EmployeesTable({ employees }: Readonly<EmployeesTableProps>) {
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">
                <span className="inline-flex items-center gap-2">
                  {e.full_name}
                  <AdvancePatternFlag employee={e} />
                </span>
              </TableCell>
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
                  {e.is_active ? 'Active' : 'Deactivated'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <EmployeeRowActions employee={e} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface EmployeeRowActionsProps {
  employee: Employee
}

function EmployeeRowActions({ employee }: Readonly<EmployeeRowActionsProps>) {
  const setActive = useSetEmployeeActive()
  const nextActive = !employee.is_active
  const verb = nextActive ? 'Reactivate' : 'Deactivate'

  const onConfirm = () => {
    setActive.mutate(
      { id: employee.id, is_active: nextActive },
      {
        onSuccess: () => {
          toast.success(
            nextActive ? `${employee.full_name} reactivated` : `${employee.full_name} deactivated`,
          )
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={nextActive ? 'outline' : 'destructive'}
          size="sm"
          disabled={setActive.isPending}
        >
          {verb}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {verb} {employee.full_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextActive
              ? `${employee.full_name} will be able to request advances again.`
              : `${employee.full_name} will no longer be able to request advances.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{verb}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
