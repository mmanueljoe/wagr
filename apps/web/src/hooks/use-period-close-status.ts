'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { PeriodCloseStatus } from '@wagr/types'

const POLL_MS = 3000

export function usePeriodCloseStatus(repaymentId: string | null) {
  return useQuery({
    queryKey: ['period-close', 'status', repaymentId],
    queryFn: ({ signal }) =>
      api.get<PeriodCloseStatus>(`/period-close/status/${repaymentId}`, { signal }),
    enabled: !!repaymentId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return POLL_MS
      return data.status === 'pending' ? POLL_MS : false
    },
  })
}
