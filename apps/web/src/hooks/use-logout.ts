'use client'

import { env } from '@/lib/env'
import { useMutation, useQueryClient } from '@tanstack/react-query'

async function logoutRequest(): Promise<void> {
  await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      // Drop every cached query so a fresh login starts from a clean cache.
      queryClient.clear()
    },
  })
}
