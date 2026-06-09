import { env } from '@/lib/env'
import { type NextRequest, NextResponse } from 'next/server'

// Runs on every protected route. Forwards the user's session cookie to
// /auth/me on the api. If the api says 401, we redirect to /login.
// The web doesn't decode or trust the cookie itself — only the api does.
export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  })

  if (!res.ok) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
