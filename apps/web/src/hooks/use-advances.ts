'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdvanceFilters,
  AdvanceRequest,
  DashboardSummary,
  PaginatedAdvances,
} from '@wagr/types'

export function useRecentAdvances() {
  return useQuery({
    queryKey: ['advances', 'recent'],
    queryFn: ({ signal }) => api.get<AdvanceRequest[]>('/advances', { signal }),
  })
}

export function useAdvances(filters: AdvanceFilters = {}) {
  const { status, from, to, page = 1 } = filters
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', String(page))

  return useQuery({
    queryKey: ['advances', 'all', filters],
    queryFn: ({ signal }) =>
      api.get<PaginatedAdvances>(`/advances/all?${params.toString()}`, { signal }),
  })
}

export function useRetryAdvance() {
  const queryClient = useQueryClient()
  return useMutation<{ id: string; status: string }, ApiResponseError, string>({
    mutationFn: (advanceId) => api.post(`/advances/${advanceId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] })
    },
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: ({ signal }) => api.get<DashboardSummary>('/dashboard/summary', { signal }),
  })
}
