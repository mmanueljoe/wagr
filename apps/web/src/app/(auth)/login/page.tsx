'use client'

import { PasswordInput } from '@/components/shared/password-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/hooks/use-login'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { type DefaultValues, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginInput = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const login = useLogin()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' } satisfies DefaultValues<LoginInput>,
    mode: 'onBlur',
  })

  function onSubmit(values: LoginInput) {
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Welcome back')
        router.push('/dashboard')
      },
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-heading text-wagr-navy mb-2">Welcome back</h1>
      <p className="text-sm text-wagr-gray mb-6">Log in to your Wagr dashboard.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-wagr-gray mt-6">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-wagr-navy underline">
          Create one
        </a>
      </p>
    </div>
  )
}
