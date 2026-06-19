import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
}

export function StatCard({ icon: Icon, label, value, hint }: Readonly<StatCardProps>) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-wagr-gray">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-heading text-wagr-navy">{value}</p>
      {hint && <p className="mt-2 text-xs text-wagr-gray">{hint}</p>}
    </div>
  )
}
