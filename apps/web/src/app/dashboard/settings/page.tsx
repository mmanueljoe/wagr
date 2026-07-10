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
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { zodResolver } from '@hookform/resolvers/zod'
import { EMPLOYER_INDUSTRIES, updateProfileSchema } from '@wagr/types'
import { Loader2, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { type DefaultValues, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

const INDUSTRY_LABELS: Record<(typeof EMPLOYER_INDUSTRIES)[number], string> = {
  healthcare: 'Healthcare',
  education: 'Education',
  retail: 'Retail & Commerce',
  hospitality: 'Hospitality & Leisure',
  manufacturing: 'Manufacturing & Tech',
  other: 'Other Services',
}

type UpdateProfileFormInput = z.infer<typeof updateProfileSchema>

export default function SettingsPage() {
  const { data: profile, isLoading, error } = useProfile()
  const updateProfile = useUpdateProfile()

  const form = useForm<UpdateProfileFormInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      company_name: '',
      phone: '',
      industry: 'other',
      pay_date: 25,
    } satisfies DefaultValues<UpdateProfileFormInput>,
    mode: 'onBlur',
  })

  // Sync form defaults with loaded profile data
  useEffect(() => {
    if (profile) {
      form.reset({
        company_name: profile.company_name,
        phone: profile.phone,
        industry: profile.industry,
        pay_date: profile.pay_date,
      })
    }
  }, [profile, form])

  function onSubmit(values: UpdateProfileFormInput) {
    updateProfile.mutate(values, {
      onSuccess: () => {
        toast.success('Company profile updated successfully')
      },
      onError: (err) => {
        toast.error(err.message || 'Could not update profile')
      },
    })
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <Settings className="size-6 text-wagr-navy" />
          <div>
            <h1 className="text-2xl font-heading text-wagr-navy">Company settings</h1>
            <p className="text-sm text-wagr-gray">
              Manage your company information and monthly pay cycle.
            </p>
          </div>
        </header>

        {isLoading && <p className="text-sm text-wagr-gray">Loading profile details…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {profile && (
          <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+233241235993" {...field} />
                        </FormControl>
                        <FormDescription>Normalised E.164 format (+233…).</FormDescription>
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
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EMPLOYER_INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind}>
                                {INDUSTRY_LABELS[ind]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pay_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly pay day</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              Day {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The day of the month when your salary cycle ends.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t flex justify-end">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Saving changes…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </main>
  )
}
