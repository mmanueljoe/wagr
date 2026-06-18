'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { FloatStatusResponse } from '@wagr/types'

// Polls every 5s while a top-up is pending — that's how the dashboard
// knows the Moolre webhook landed and the balance moved. Once nothing is
// pending, the query goes quiet again.
const PENDING_POLL_MS = 5_000

export function useFloat() {
  return useQuery({
    queryKey: ['float'],
    queryFn: ({ signal }) => api.get<FloatStatusResponse>('/float', { signal }),
    refetchInterval: (query) => (query.state.data?.has_pending_top_up ? PENDING_POLL_MS : false),
  })
}
