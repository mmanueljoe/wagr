import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="text-center max-w-md">
        <div className="h-12 w-12 rounded-full bg-wagr-navy/10 mx-auto flex items-center justify-center mb-4">
          <Compass className="h-6 w-6 text-wagr-navy" />
        </div>
        <h1 className="text-2xl font-heading text-wagr-navy mb-2">Page not found</h1>
        <p className="text-sm text-wagr-gray mb-6">
          The page you’re looking for doesn’t exist. It may have been moved, or the link you
          followed is out of date.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  )
}
