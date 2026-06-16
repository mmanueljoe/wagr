import { env } from '@/lib/env'
import { type NextRequest, NextResponse } from 'next/server'

// Single gate on /dashboard/*: requires auth. If /auth/me returns 401 → /login.
// (We used to also gate on a funding-model onboarding step here; every
// employer now pre-funds a float, so that branch is gone.)
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (!path.startsWith('/dashboard')) return NextResponse.next()

  const cookieHeader = request.headers.get('cookie') ?? ''
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
