import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Users,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  comingSoon?: boolean
  hiddenOnMobile?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/advances', label: 'Advances', icon: CreditCard },
  { href: '/dashboard/period-close', label: 'Close Period', icon: Calendar },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    comingSoon: true,
    hiddenOnMobile: true,
  },
]

export function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false
  if (item.href === '/dashboard') return pathname === '/dashboard'
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
