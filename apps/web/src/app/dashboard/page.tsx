'use client'

// Placeholder dashboard. The real one ships with [dashboard-home] in Sprint 4.
// Logout button included so we can test the full BFF auth flow end-to-end.

import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const logout = useLogout()

  function onLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-heading text-wagr-navy">Welcome to Wagr</h1>
        <p className="text-sm text-wagr-gray">Your dashboard is coming soon.</p>
        <Button onClick={onLogout} disabled={logout.isPending} variant="secondary">
          {logout.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </main>
  )
}
