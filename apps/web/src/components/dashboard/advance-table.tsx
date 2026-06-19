import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdvanceRequest, AdvanceStatus } from '@wagr/types'
import { formatGhs } from '@wagr/types'

const STATUS_CLASSES: Record<AdvanceStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  disbursed: 'bg-green-50 text-green-800 border border-green-200',
  repaid: 'bg-blue-50 text-blue-800 border border-blue-200',
  failed: 'bg-red-50 text-red-800 border border-red-200',
}

const STATUS_LABELS: Record<AdvanceStatus, string> = {
  pending: 'Pending',
  disbursed: 'Disbursed',
  repaid: 'Repaid',
  failed: 'Failed',
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface AdvanceTableProps {
  advances: AdvanceRequest[]
}

export function AdvanceTable({ advances }: Readonly<AdvanceTableProps>) {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Requested</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advances.map((advance) => (
            <TableRow key={advance.id}>
              <TableCell className="font-medium">{advance.employee_name}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatGhs(advance.requested_amount_pesewas)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[advance.status]}`}
                >
                  {STATUS_LABELS[advance.status]}
                </span>
              </TableCell>
              <TableCell className="text-right text-sm text-wagr-gray">
                {formatRelativeTime(advance.requested_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
