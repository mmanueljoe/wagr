'use client'

import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Settings,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  // Routes that aren't built yet stay in the sidebar so the dashboard looks
  // complete in demos, but they don't navigate — clicking shows a toast.
  comingSoon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/advances', label: 'Advances', icon: CreditCard },
  { href: '/dashboard/period-close', label: 'Close Period', icon: Calendar, comingSoon: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, comingSoon: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()

  function onLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('Logged out')
        router.push('/login')
      },
    })
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-wagr-navy text-white">
      <div className="px-6 py-6 border-b border-wagr-navy-light">
        <Link href="/dashboard" className="font-heading text-xl text-white">
          Wagr
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item, pathname)} />
        ))}
      </nav>

      <div className="border-t border-wagr-navy-light p-3">
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={logout.isPending}
          className="w-full justify-start text-white/80 hover:text-white hover:bg-wagr-navy-light"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {logout.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </aside>
  )
}

function SidebarLink({ item, active }: Readonly<{ item: NavItem; active: boolean }>) {
  const Icon = item.icon
  const base =
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors border-l-2 border-transparent'

  if (item.comingSoon) {
    return (
      <button
        type="button"
        onClick={() => toast.info(`${item.label} is coming soon`)}
        className={cn(base, 'w-full text-left text-white/40 hover:bg-wagr-navy-light/40')}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        <span className="text-[10px] uppercase tracking-wide text-wagr-gold">Soon</span>
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        base,
        active
          ? 'border-wagr-gold bg-wagr-navy-light text-white'
          : 'text-white/80 hover:bg-wagr-navy-light hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  )
}

function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false
  if (item.href === '/dashboard') return pathname === '/dashboard'
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
