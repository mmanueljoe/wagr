'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FundingModel } from '@wagr/types'

export function useSetFundingModel() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiResponseError, FundingModel>({
    mutationFn: (model) => api.patch<void>('/employer/funding-model', { funding_model: model }),
    onSuccess: () => {
      // The 'me' query needs to refetch so the new funding_model is reflected
      // immediately on the dashboard.
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
