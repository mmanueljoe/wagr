import { env } from '@/lib/env'
import type { AuthUser } from '@wagr/types'
import { type NextRequest, NextResponse } from 'next/server'

// Two gates on /dashboard/* and /onboarding/*:
//
//  1. /dashboard/* requires auth. If /auth/me returns 401 → /login.
//  2. /dashboard/* also requires onboarding completed. If funding_model is
//     still null → /onboarding/funding-model. This is a soft gate at the
//     route level; the api still re-checks on every write.
//
// We also bounce already-onboarded users away from /onboarding/* so they
// don't get stuck on the onboarding flow after completing it.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isOnboarding = path.startsWith('/onboarding')
  if (!isDashboard && !isOnboarding) return NextResponse.next()

  const cookieHeader = request.headers.get('cookie') ?? ''
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = (await res.json()) as AuthUser

  if (isDashboard && user.funding_model === null) {
    return NextResponse.redirect(new URL('/onboarding/funding-model', request.url))
  }
  if (isOnboarding && user.funding_model !== null) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
