import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  action?: ReactNode
}

export function StatCard({ label, value, subtext, action }: StatCardProps) {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light p-6 shadow-sm flex flex-col gap-1">
      <p className="text-sm font-body text-wagr-gray">{label}</p>
      <p className="text-3xl font-heading font-semibold text-wagr-navy mt-1">{value}</p>
      {subtext && <p className="text-sm font-body text-wagr-gray">{subtext}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
