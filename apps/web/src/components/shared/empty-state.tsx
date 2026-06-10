import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// One shared empty-state surface for every "no data yet" or "nothing
// matches your filters" view in the app. Lives in shared/ so dashboard,
// settings, and reports can all reach for it.

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light p-12 text-center">
      <div className="h-12 w-12 rounded-full bg-wagr-navy/10 mx-auto flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-wagr-navy" />
      </div>
      <h2 className="text-lg font-medium text-wagr-black mb-1">{title}</h2>
      <p className="text-sm text-wagr-gray mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  )
}
