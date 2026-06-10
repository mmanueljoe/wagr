import type { ReactNode } from 'react'

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-wagr-gray-light p-4">
      <div className="w-full max-w-3xl bg-wagr-white rounded-wagr-lg shadow-lg p-8 md:p-12">
        {children}
      </div>
    </div>
  )
}
