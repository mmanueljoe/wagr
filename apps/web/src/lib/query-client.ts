import { QueryClient } from '@tanstack/react-query'

// The QueryClient is the shared cache + scheduler for every query and mutation
// in the app. Server: a new client per request (no cache leaks between users).
// Browser: a singleton (one cache for the whole tab).

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
