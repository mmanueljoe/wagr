'use client'

// Catches runtime errors thrown anywhere below it. Per Next.js App Router
// convention — must be a client component because it uses useEffect to
// surface the error to whatever monitoring we wire up later (Sentry, etc.).

import { Button } from '@/components/ui/button'
import { AlertOctagon } from 'lucide-react'
import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: Readonly<ErrorPageProps>) {
  useEffect(() => {
    // TODO when we add Sentry: send `error` here so a developer can see what
    // actually went wrong in production. For now, console.error is the best
    // we've got. Tracked in docs/architecture/tech-debt.md.
    console.error('Unhandled route error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="text-center max-w-md">
        <div className="h-12 w-12 rounded-full bg-destructive/10 mx-auto flex items-center justify-center mb-4">
          <AlertOctagon className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-2xl font-heading text-wagr-navy mb-2">Something went wrong</h1>
        <p className="text-sm text-wagr-gray mb-6">
          We hit an unexpected error. Try again — if it keeps happening, get in touch and we’ll take
          a look.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" asChild>
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </div>
      </div>
    </main>
  )
}
