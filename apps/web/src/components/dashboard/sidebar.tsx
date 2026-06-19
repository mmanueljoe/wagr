'use client'

import { CreditCard, LayoutDashboard, Settings, Users, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/advances', label: 'Advances', icon: CreditCard },
  { href: '/dashboard/payroll', label: 'Payroll', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-wagr-navy h-screen">
      <div className="px-6 py-6">
        <span className="font-heading text-xl font-semibold text-white">Wagr</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          // Exact match for /dashboard; prefix match for sub-routes.
          const isActive =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-wagr text-sm font-heading font-medium transition-colors ${
                isActive
                  ? 'border-l-2 border-wagr-gold bg-wagr-navy-light text-white pl-[10px]'
                  : 'text-white/70 hover:text-white hover:bg-wagr-navy-light'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
