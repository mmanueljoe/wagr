import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav'
import { MobileTopBar } from '@/components/dashboard/mobile-top-bar'
import { Sidebar } from '@/components/dashboard/sidebar'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-wagr-gray-light">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <div className="flex-1 pb-20 md:pb-0">{children}</div>
        <MobileBottomNav />
      </div>
    </div>
  )
}
