import { Sidebar } from '@/components/dashboard/sidebar'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-wagr-gray-light">
      <Sidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
