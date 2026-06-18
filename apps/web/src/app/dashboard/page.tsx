'use client'

import { FundFloatCard } from '@/components/dashboard/fund-float-card'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function DashboardPage() {
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
    <main className="min-h-screen bg-wagr-gray-light p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-wagr-navy">Welcome to Wagr</h1>
          <Button onClick={onLogout} disabled={logout.isPending} variant="secondary">
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </Button>
        </header>

        <FundFloatCard />

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-wagr-navy">Workforce</h2>
          <p className="mt-1 text-sm text-wagr-gray">
            Manage employees and review advance activity.
          </p>
          <Link
            href="/dashboard/employees"
            className="mt-4 inline-flex items-center text-sm text-wagr-navy underline"
          >
            Go to employees →
          </Link>
        </div>
      </div>
    </main>
  )
}
