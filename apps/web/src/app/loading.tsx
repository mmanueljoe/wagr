import { Loader2 } from 'lucide-react'

// Suspense fallback rendered while any server-side work below is streaming.
// Currently most of our work happens on the client (TanStack Query), so this
// fires mainly between route transitions while Next is fetching the new
// segment's RSC payload. Keep it minimal — a quick visual signal, no layout
// shift.

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="flex items-center gap-2 text-wagr-gray">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </main>
  )
}
