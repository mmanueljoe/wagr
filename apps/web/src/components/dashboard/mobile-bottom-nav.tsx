'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { NAV_ITEMS, type NavItem, isActive } from './nav-items'

export function MobileBottomNav() {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.hiddenOnMobile)

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-wagr-navy border-t border-wagr-navy-light flex justify-around pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => (
        <BottomNavLink key={item.href} item={item} active={isActive(item, pathname)} />
      ))}
    </nav>
  )
}

function BottomNavLink({ item, active }: Readonly<{ item: NavItem; active: boolean }>) {
  const Icon = item.icon
  const base =
    'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors border-t-2'

  if (item.comingSoon) {
    return (
      <button
        type="button"
        onClick={() => toast.info(`${item.label} is coming soon`)}
        className={cn(base, 'border-transparent text-white/40')}
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        base,
        active
          ? 'border-wagr-gold text-white'
          : 'border-transparent text-white/70 hover:text-white',
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  )
}
