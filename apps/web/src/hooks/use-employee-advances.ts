'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { AdvanceListResponse } from '@wagr/types'

export function useEmployeeAdvances(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['advances', 'employee', employeeId],
    queryFn: ({ signal }) =>
      api.get<AdvanceListResponse>(`/advances?employee_id=${employeeId}`, { signal }),
    enabled: !!employeeId,
  })
}
