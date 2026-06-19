'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { AdvanceListResponse, AdvanceStatus } from '@wagr/types'

export function useAdvances(status?: AdvanceStatus) {
  return useQuery({
    queryKey: ['advances', status ?? 'all'],
    queryFn: ({ signal }) => {
      const path = status ? `/advances?status=${status}` : '/advances'
      return api.get<AdvanceListResponse>(path, { signal })
    },
  })
}
