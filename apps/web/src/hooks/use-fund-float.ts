'use client'

import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FundFloatInput, FundFloatResponse } from '@wagr/types'

export function useFundFloat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FundFloatInput) => api.post<FundFloatResponse>('/float/fund', input),
    onSuccess: () => {
      // Force an immediate refetch so the card flips into "pending approval"
      // state without waiting for the next tick. The redirect fires in the
      // component's onSuccess so consumers can still read authorization_url.
      void queryClient.invalidateQueries({ queryKey: ['float'] })
    },
  })
}
