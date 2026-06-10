'use client'

import { env } from '@/lib/env'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FundingModel } from '@wagr/types'

interface SetFundingModelError {
  code: string
  message: string
}

async function setFundingModelRequest(model: FundingModel): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/employer/funding-model`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ funding_model: model }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: SetFundingModelError } | null
    throw body?.error ?? { code: 'UNKNOWN', message: 'Could not save your choice. Try again.' }
  }
}

export function useSetFundingModel() {
  const queryClient = useQueryClient()
  return useMutation<void, SetFundingModelError, FundingModel>({
    mutationFn: setFundingModelRequest,
    onSuccess: () => {
      // The 'me' query (if anything is using it) needs to refetch so the new
      // funding_model is reflected immediately on the dashboard.
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
