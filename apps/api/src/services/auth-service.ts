import type { AuthUser, FundingModel, LoginEmployerInput, RegisterEmployerInput } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { type SessionData, createSession } from '../lib/session'
import { createSupabaseAuthClient, supabase } from '../lib/supabase'

// Pure business logic for employer auth. Throws AppError on every failure;
// returns plain data on success. Knows nothing about Express — the controller
// owns req/res, this owns the rules. Same AuthUser shape returned by
// register, login, and getMe — frontend learns it once. funding_model is
// null until the employer picks one at onboarding.

interface AuthResult {
  user: AuthUser
  sessionId: string
}

export async function registerEmployer(input: RegisterEmployerInput): Promise<AuthResult> {
  const { company_name, email, password, phone, industry, pay_date } = input

  // email_confirm: true skips Supabase's email-verification step. Acceptable
  // for MVP — we'll wire verification when we have an email template.
  const { data, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !data.user) {
    const isDuplicate = authError?.message?.toLowerCase().includes('already')
    if (isDuplicate) {
      throw new AppError('EMAIL_TAKEN', 409, 'An account with this email already exists')
    }
    throw new AppError('AUTH_CREATE_FAILED', 500, 'Could not create account')
  }

  // Same UUID as the auth user. funding_model is left NULL — the employer
  // picks it at /onboarding/funding-model. If the insert fails we delete
  // the auth user so we don't leave orphans.
  const { error: insertError } = await supabase.from('employers').insert({
    id: data.user.id,
    company_name,
    email,
    phone,
    industry,
    pay_date,
  })

  if (insertError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    logger.error(
      { err: insertError, userId: data.user.id },
      'employer insert failed; auth user rolled back',
    )
    throw new AppError('EMPLOYER_INSERT_FAILED', 500, 'Could not create employer record')
  }

  const user: AuthUser = {
    id: data.user.id,
    employer_id: data.user.id,
    email,
    funding_model: null,
  }
  const sessionId = await createSession({
    user_id: user.id,
    employer_id: user.employer_id,
    email: user.email,
  })

  await audit({
    action: 'employer_register',
    actor: 'employer',
    employerId: user.employer_id,
    metadata: { industry, pay_date },
  })

  return { user, sessionId }
}

export async function loginEmployer(input: LoginEmployerInput): Promise<AuthResult> {
  const { email, password } = input

  // Anon-key client just to verify the password. We discard the Supabase
  // session immediately — our own Redis session is the source of truth.
  const authClient = createSupabaseAuthClient()
  const { data, error: signInError } = await authClient.auth.signInWithPassword({ email, password })

  if (signInError || !data.user) {
    // Same generic code for both wrong-email and wrong-password so attackers
    // can't enumerate which accounts exist.
    throw new AppError('INVALID_CREDENTIALS', 401, 'Incorrect email or password')
  }

  const { data: employer } = await supabase
    .from('employers')
    .select('id, email, funding_model')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!employer) {
    logger.error({ userId: data.user.id }, 'auth user has no employer row')
    throw new AppError('EMPLOYER_NOT_FOUND', 500, 'Account is missing an employer record')
  }

  const user: AuthUser = {
    id: data.user.id,
    employer_id: employer.id,
    email: employer.email,
    funding_model: (employer.funding_model as FundingModel) ?? null,
  }
  const sessionId = await createSession({
    user_id: user.id,
    employer_id: user.employer_id,
    email: user.email,
  })

  await audit({
    action: 'employer_login',
    actor: 'employer',
    employerId: user.employer_id,
  })

  return { user, sessionId }
}

// getMe re-reads funding_model from the DB so the response always reflects
// the latest onboarding state. Session stores identity only; mutable state
// stays in Postgres — single source of truth.
export async function getMe(session: SessionData): Promise<AuthUser> {
  const { data: employer } = await supabase
    .from('employers')
    .select('funding_model')
    .eq('id', session.employer_id)
    .maybeSingle()

  return {
    id: session.user_id,
    employer_id: session.employer_id,
    email: session.email,
    funding_model: (employer?.funding_model as FundingModel) ?? null,
  }
}
