'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { PeriodClosePreview } from '@wagr/types'

export function usePeriodClosePreview() {
  return useQuery({
    queryKey: ['period-close', 'preview'],
    queryFn: ({ signal }) => api.get<PeriodClosePreview>('/period-close/preview', { signal }),
  })
}
