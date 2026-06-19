'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { AdvanceRequest, DashboardSummary } from '@wagr/types'

export function useRecentAdvances() {
  return useQuery({
    queryKey: ['advances', 'recent'],
    queryFn: ({ signal }) => api.get<AdvanceRequest[]>('/advances', { signal }),
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: ({ signal }) => api.get<DashboardSummary>('/dashboard/summary', { signal }),
  })
}
