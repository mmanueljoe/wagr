'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateEmployee } from '@/hooks/use-create-employee'
import { zodResolver } from '@hookform/resolvers/zod'
import { EMPLOYEE_NETWORKS, createEmployeeSchema, parseGhs } from '@wagr/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type DefaultValues, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

const NETWORK_LABELS: Record<(typeof EMPLOYEE_NETWORKS)[number], string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

// Salary is captured outside the form (its own input with cedis-to-pesewas
// parsing) and validated manually below, so the form-side schema omits it.
// Keeping the full createEmployeeSchema as the form resolver was silently
// blocking submission because monthly_salary_pesewas was never registered.
const createEmployeeFormSchema = createEmployeeSchema.omit({ monthly_salary_pesewas: true })
type CreateEmployeeFormInput = z.infer<typeof createEmployeeFormSchema>

export default function NewEmployeePage() {
  const router = useRouter()
  const createEmployee = useCreateEmployee()
  const [salaryInput, setSalaryInput] = useState('')
  const [salaryError, setSalaryError] = useState<string | null>(null)

  const form = useForm<CreateEmployeeFormInput>({
    resolver: zodResolver(createEmployeeFormSchema),
    defaultValues: {
      full_name: '',
      momo_number: '',
      start_date: '',
    } satisfies DefaultValues<CreateEmployeeFormInput>,
    mode: 'onBlur',
  })

  function onSubmit(values: CreateEmployeeFormInput) {
    const pesewas = parseGhs(salaryInput)
    if (pesewas === null || pesewas <= 0) {
      setSalaryError('Enter a valid salary (e.g. 1500.00)')
      return
    }
    setSalaryError(null)
    createEmployee.mutate(
      { ...values, monthly_salary_pesewas: pesewas },
      {
        onSuccess: (employee) => {
          toast.success(`${employee.full_name} added`)
          router.push('/dashboard/employees')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not add worker')
        },
      },
    )
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center text-sm text-wagr-gray hover:text-wagr-navy mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to workforce
        </Link>

        <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light p-6 md:p-8">
          <h1 className="text-2xl font-heading text-wagr-navy mb-2">Add a worker</h1>
          <p className="text-sm text-wagr-gray mb-6">
            They'll be able to request advances via USSD once you've funded your float.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Abena Mensah" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="momo_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MoMo number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="0244123456"
                        maxLength={10}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>10 digits, starting with 0.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Network</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYEE_NETWORKS.map((n) => (
                          <SelectItem key={n} value={n}>
                            {NETWORK_LABELS[n]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Monthly salary</FormLabel>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-wagr-gray pointer-events-none">
                    GHS
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="1500.00"
                    value={salaryInput}
                    onChange={(e) => {
                      setSalaryInput(e.target.value)
                      setSalaryError(null)
                    }}
                    className="pl-12"
                  />
                </div>
                <FormDescription>The gross monthly salary you pay this worker.</FormDescription>
                {salaryError && (
                  <p className="text-sm text-destructive" role="alert">
                    {salaryError}
                  </p>
                )}
              </FormItem>

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>The day this worker started their job.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createEmployee.isPending} className="flex-1">
                  {createEmployee.isPending ? 'Adding…' : 'Add worker'}
                </Button>
                <Button type="button" variant="secondary" asChild>
                  <Link href="/dashboard/employees">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  )
}
