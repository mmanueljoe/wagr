'use client'

import { PasswordInput } from '@/components/shared/password-input'
import { PhoneInput } from '@/components/shared/phone-input'
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
import { useRegister } from '@/hooks/use-register'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  EMPLOYER_INDUSTRIES,
  type RegisterEmployerInput,
  registerEmployerSchema,
} from '@wagr/types'
import { AtSign, Building2, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type DefaultValues, useForm } from 'react-hook-form'

const INDUSTRY_LABELS: Record<(typeof EMPLOYER_INDUSTRIES)[number], string> = {
  healthcare: 'Healthcare',
  education: 'Education',
  retail: 'Retail',
  hospitality: 'Hospitality',
  manufacturing: 'Manufacturing',
  other: 'Other',
}

export default function RegisterPage() {
  const router = useRouter()
  const register = useRegister()

  const form = useForm<RegisterEmployerInput>({
    resolver: zodResolver(registerEmployerSchema),
    defaultValues: {
      company_name: '',
      email: '',
      password: '',
      phone: '',
    } satisfies DefaultValues<RegisterEmployerInput>,
    mode: 'onBlur',
  })

  function onSubmit(values: RegisterEmployerInput) {
    register.mutate(values, {
      // Brand-new employer always lands at funding-model selection — they
      // haven't picked one yet (funding_model is null fresh out of register).
      onSuccess: () => router.push('/onboarding/funding-model'),
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-heading text-wagr-navy mb-2">Create your Wagr account</h1>
      <p className="text-sm text-wagr-gray mb-6">
        Set up your company and start managing your workforce.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup title="Company" icon={<Building2 className="h-3.5 w-3.5" />}>
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input placeholder="Accra Wellness Clinic" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYER_INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>
                          {INDUSTRY_LABELS[i]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldGroup title="Contact" icon={<AtSign className="h-3.5 w-3.5" />}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <PhoneInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>At least 8 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldGroup title="Payroll" icon={<CalendarDays className="h-3.5 w-3.5" />}>
            <FormField
              control={form.control}
              name="pay_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay date</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    {...(field.value ? { value: String(field.value) } : {})}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Day of month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The day each month you pay your workers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          {register.error && (
            <p className="text-sm text-destructive" role="alert">
              {register.error.message}
            </p>
          )}

          <Button type="submit" disabled={register.isPending} className="w-full">
            {register.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-wagr-gray mt-6">
        Already have an account?{' '}
        <a href="/login" className="text-wagr-navy underline">
          Log in
        </a>
      </p>
    </div>
  )
}

function FieldGroup({
  title,
  icon,
  children,
}: Readonly<{
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}>) {
  return (
    <fieldset className="space-y-4">
      <legend className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-wagr-gray mb-2">
        {icon}
        {title}
      </legend>
      {children}
    </fieldset>
  )
}
