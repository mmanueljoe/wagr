import type { MoneyPesewas } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { getCurrentPayPeriod } from '../lib/wage-engine/earned-wage'

const PESEWAS_PER_CEDI = 100

// Sum of advances the worker has already drawn against the *current* pay
// period — only `disbursed` rows count. `pending` is in-flight (Moolre
// hasn't confirmed), `failed` never moved money, `repaid` is settled.
//
// The max-advance cap is "50% of earned wage minus what's already out",
// so this is the second argument. Returns 0 when the worker has no
// disbursed advances yet — which is true for every worker today until
// [moolre-disbursement] starts creating rows.
export async function getCurrentPeriodDisbursedPesewas(
  employeeId: string,
  payDate: number,
  today: Date,
): Promise<MoneyPesewas> {
  const period = getCurrentPayPeriod(payDate, today)

  const { data, error } = await supabase
    .from('advance_requests')
    .select('requested_amount')
    .eq('employee_id', employeeId)
    .eq('status', 'disbursed')
    .gte('requested_at', period.start.toISOString())
    .lte('requested_at', period.end.toISOString())

  if (error) {
    logger.error({ err: error, employeeId }, 'failed to sum disbursed advances')
    throw new AppError('ADVANCE_SUM_FAILED', 500, 'Could not read advance history')
  }

  // requested_amount is numeric(12,2) cedis in the DB. Convert at this
  // boundary so the wage engine sees pesewas integers only.
  const totalCedis = data.reduce((sum, row) => sum + row.requested_amount, 0)
  return Math.round(totalCedis * PESEWAS_PER_CEDI) as MoneyPesewas
}
