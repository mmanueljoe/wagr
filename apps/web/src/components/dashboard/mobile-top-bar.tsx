'use client'

import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function MobileTopBar() {
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
    <header className="md:hidden sticky top-0 z-30 bg-wagr-navy text-white border-b border-wagr-navy-light flex items-center justify-between px-4 h-12">
      <Link href="/dashboard" className="font-heading text-base font-medium">
        Wagr
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onLogout}
        disabled={logout.isPending}
        className="text-white/80 hover:text-white hover:bg-wagr-navy-light h-8 px-2"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}
