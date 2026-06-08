import type { ReactNode } from 'react'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="w-full max-w-md bg-wagr-white rounded-wagr-lg shadow-lg p-8">{children}</div>
    </div>
  )
}
