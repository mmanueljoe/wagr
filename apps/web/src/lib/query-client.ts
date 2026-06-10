import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiResponseError } from './api'

// The QueryClient is the shared cache + scheduler for every query and mutation
// in the app. Server: a new client per request (no cache leaks between users).
// Browser: a singleton (one cache for the whole tab).
//
// Global error handler on mutations fires a toast for any unhandled failure.
// Pages can still set their own onError to override (e.g. show an inline
// message AND skip the toast for form-level errors) — but by default every
// failed mutation gets a visible notification.

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 1 minute. Stops refetches from firing every time a component mounts
        // during the same interaction. Real-time-ish reads can override.
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          if (error instanceof ApiResponseError) {
            toast.error(error.message)
            return
          }
          toast.error('Something went wrong. Try again.')
        },
      },
    },
  })
}

let browserClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server render: brand-new client so caches never bleed across requests.
    return makeQueryClient()
  }
  if (!browserClient) browserClient = makeQueryClient()
  return browserClient
}
