import { registerEmployerSchema } from '@wagr/types'
import { Router } from 'express'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { validateBody } from '../middleware/validate'

export const authRouter: Router = Router()

authRouter.post('/auth/register', validateBody(registerEmployerSchema), async (req, res) => {
  const { company_name, email, password, phone, industry, pay_date } = req.body

  // Create the Supabase Auth user. email_confirm: true skips email verification
  // for MVP — we'll turn that back on once we have the email template designed.
  const { data, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !data.user) {
    // Supabase returns the same error code for both "email already registered"
    // and a few other duplicate-related cases. Map it to a clean user-facing
    // message so the frontend doesn't have to know Supabase's quirks.
    const isDuplicate = authError?.message?.toLowerCase().includes('already')
    res.status(isDuplicate ? 409 : 500).json({
      error: {
        code: isDuplicate ? 'EMAIL_TAKEN' : 'AUTH_CREATE_FAILED',
        message: isDuplicate
          ? 'An account with this email already exists'
          : 'Could not create account',
      },
    })
    return
  }

  // Create the employers row with the same UUID as the auth user. If this
  // fails we delete the auth user so we don't leave an orphan account with
  // no employer record — otherwise the user could "register" but never log in
  // to anything meaningful.
  const { error: insertError } = await supabase.from('employers').insert({
    id: data.user.id,
    company_name,
    email,
    phone,
    industry,
    pay_date,
    funding_model: 'model1',
  })

  if (insertError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    logger.error(
      { err: insertError, userId: data.user.id },
      'employer insert failed; auth user rolled back',
    )
    res.status(500).json({
      error: { code: 'EMPLOYER_INSERT_FAILED', message: 'Could not create employer record' },
    })
    return
  }

  res.status(201).json({ id: data.user.id })
})
