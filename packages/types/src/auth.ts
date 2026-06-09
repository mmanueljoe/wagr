import { z } from 'zod'

export const EMPLOYER_INDUSTRIES = [
  'healthcare',
  'education',
  'retail',
  'hospitality',
  'manufacturing',
  'other',
] as const

export type EmployerIndustry = (typeof EMPLOYER_INDUSTRIES)[number]

// Phone is stored in normalised E.164 Ghana format (+233 followed by 9 digits).
// The frontend's PhoneInput accepts user input in any common shape (024…, 0244…,
// +233…) and normalises before submit so the api always sees one shape.
export const GH_PHONE_REGEX = /^\+233\d{9}$/

export const registerEmployerSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(GH_PHONE_REGEX, 'Enter a valid Ghana phone number'),
  industry: z.enum(EMPLOYER_INDUSTRIES),
  pay_date: z.number().int().min(1).max(31),
})

export type RegisterEmployerInput = z.infer<typeof registerEmployerSchema>

export const loginEmployerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginEmployerInput = z.infer<typeof loginEmployerSchema>

// The shape every auth success endpoint (register, login, /me) returns.
// Same keys, same types, every time — the frontend learns it once.
export interface AuthUser {
  id: string
  employer_id: string
  email: string
}
