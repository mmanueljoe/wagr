'use client'

import { EmployeesTable } from '@/components/dashboard/employees-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEmployees } from '@/hooks/use-employees'
import type { Employee } from '@wagr/types'
import { ArrowLeft, ArrowRight, FileUp, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type SortKey = 'name-asc' | 'name-desc' | 'newest' | 'advances-desc'

const PAGE_SIZE = 25

export default function EmployeesPage() {
  const { data: employees, isLoading, error } = useEmployees()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => filterAndSort(employees ?? [], search, sort),
    [employees, search, sort],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading text-wagr-navy">Your workforce</h1>
            <p className="text-sm text-wagr-gray">
              Workers on your Wagr account. Each one can request advances against earned wages.
            </p>
          </div>
          {employees && employees.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  toast.info('CSV bulk upload is coming soon — add workers one at a time for now.')
                }
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <Button asChild>
                <Link href="/dashboard/employees/new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add worker
                </Link>
              </Button>
            </div>
          )}
        </div>

        {isLoading && <p className="text-sm text-wagr-gray">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {employees && employees.length === 0 && (
          <EmptyState
            icon={Users}
            title="Your workforce is empty"
            description="Add your first worker to start letting them request advances against wages they've already earned."
            action={
              <Button asChild>
                <Link href="/dashboard/employees/new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add your first worker
                </Link>
              </Button>
            }
          />
        )}

        {employees && employees.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <Input
                placeholder="Search by name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="max-w-xs"
              />
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v as SortKey)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="name-asc">Name A–Z</SelectItem>
                  <SelectItem value="name-desc">Name Z–A</SelectItem>
                  <SelectItem value="advances-desc">Most advances this period</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-wagr-gray ml-auto">
                {filtered.length} {filtered.length === 1 ? 'worker' : 'workers'}
              </span>
            </div>

            {paged.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No matches"
                description="Try a different name or clear the search."
              />
            ) : (
              <EmployeesTable employees={paged} />
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-wagr-gray">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function filterAndSort(employees: Employee[], search: string, sort: SortKey): Employee[] {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? employees.filter((e) => e.full_name.toLowerCase().includes(q))
    : employees.slice()

  switch (sort) {
    case 'name-asc':
      return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name))
    case 'name-desc':
      return filtered.sort((a, b) => b.full_name.localeCompare(a.full_name))
    case 'advances-desc':
      return filtered.sort(
        (a, b) => (b.advances_this_period_count ?? 0) - (a.advances_this_period_count ?? 0),
      )
    case 'newest':
      return filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  }
}
