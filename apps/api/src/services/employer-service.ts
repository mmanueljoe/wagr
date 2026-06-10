import type { FundingModel } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'

// Employer-record operations. Pure business logic, throws AppError on failure.

export async function setFundingModel(employerId: string, model: FundingModel): Promise<void> {
  const { error } = await supabase
    .from('employers')
    .update({ funding_model: model })
    .eq('id', employerId)

  if (error) {
    logger.error({ err: error, employerId }, 'failed to update funding model')
    throw new AppError('FUNDING_MODEL_UPDATE_FAILED', 500, 'Could not update funding model')
  }

  await audit({
    action: 'employer_funding_model_set',
    actor: 'employer',
    employerId,
    metadata: { funding_model: model },
  })
}
