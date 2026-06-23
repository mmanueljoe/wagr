'use client'

import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SubmitFloatTopUpOtpInput, SubmitFloatTopUpOtpResponse } from '@wagr/types'

// Second leg of the Moolre Payments 3-step flow. The user enters the OTP
// they received via SMS; this POSTs it to /float/fund/otp which verifies
// with Moolre and triggers the actual MoMo PIN prompt.
export function useSubmitFloatOtp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitFloatTopUpOtpInput) =>
      api.post<SubmitFloatTopUpOtpResponse>('/float/fund/otp', input),
    onSuccess: () => {
      // Float status now flips from awaiting_otp → pending. Refetch so the
      // card swaps from the OTP input to the "awaiting prompt" spinner.
      void queryClient.invalidateQueries({ queryKey: ['float'] })
    },
  })
}
