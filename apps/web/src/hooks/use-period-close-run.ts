'use client'

import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PeriodCloseRunResponse } from '@wagr/types'

export function usePeriodCloseRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<PeriodCloseRunResponse>('/period-close/run'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['period-close', 'preview'] })
    },
  })
}
