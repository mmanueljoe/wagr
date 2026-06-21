import type { MoneyPesewas } from '@wagr/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors/app-error'
import * as audit from '../lib/audit'
import * as moolre from '../lib/moolre'
import * as payslipGpt from '../lib/payslip-gpt'
import {
  notifyAdvanceDisbursed,
  notifyAdvanceFailed,
  notifyAdvanceRequested,
  sendWorkerAdvanceSummary,
} from './notification-service'

const MOMO = '0241235993'

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('notifyAdvanceRequested', () => {
  it('formats the request-received message with the gross amount', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceRequested({ momoNumber: MOMO, requestedPesewas: 20_000 as MoneyPesewas })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message:
        'Your Wagr advance request of GHS 200.00 has been received. You will be notified when it is sent.',
    })
  })

  it('swallows SMS delivery failures so the advance is not blocked', async () => {
    vi.spyOn(moolre, 'sendSms').mockRejectedValue(new AppError('MOOLRE_HTTP_FAILED', 502, 'down'))
    await expect(
      notifyAdvanceRequested({ momoNumber: MOMO, requestedPesewas: 5_000 as MoneyPesewas }),
    ).resolves.toBeUndefined()
  })
})

describe('notifyAdvanceDisbursed', () => {
  it('formats the arrival message with the net amount', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceDisbursed({ momoNumber: MOMO, netPesewas: 19_400 as MoneyPesewas })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message: "GHS 194.00 has been sent to your MoMo. Wagr — Don't wait for payday.",
    })
  })
})

describe('notifyAdvanceFailed', () => {
  it('sends the generic failure message', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceFailed({ momoNumber: MOMO })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message:
        'Your Wagr advance request could not be processed. Contact your employer or try again later.',
    })
  })

  it('swallows SMS delivery failures', async () => {
    vi.spyOn(moolre, 'sendSms').mockRejectedValue(new Error('boom'))
    await expect(notifyAdvanceFailed({ momoNumber: MOMO })).resolves.toBeUndefined()
  })
})

describe('sendWorkerAdvanceSummary', () => {
  const BASE_INPUT = {
    employerId: 'emp-1',
    employeeId: 'wkr-1',
    momoNumber: MOMO,
    workerFullName: 'Abena Mensah',
    employerName: 'Accra Wellness Clinic',
    payPeriodLabel: 'June 2026',
    totalAdvancesPesewas: 30_000 as MoneyPesewas,
    ref: 'wagr-summary-rep-1-wkr-1',
  }

  it('sends a templated WhatsApp message with the right placeholders + closing line', async () => {
    vi.spyOn(payslipGpt, 'generatePayslipClosingLine').mockResolvedValue(
      'Take care this month, Abena.',
    )
    const wa = vi.spyOn(moolre, 'sendWhatsAppTemplate').mockResolvedValue()
    vi.spyOn(audit, 'audit').mockResolvedValue()

    await sendWorkerAdvanceSummary(BASE_INPUT)

    expect(wa).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      templateName: 'wagr_advance_summary_v1',
      language: 'en',
      placeholders: [
        'Abena',
        'June 2026',
        'Accra Wellness Clinic',
        'GHS 300.00',
        'Take care this month, Abena.',
      ],
      ref: 'wagr-summary-rep-1-wkr-1',
    })
  })

  it('passes only the worker first name + period to the LLM (no momo, no salary)', async () => {
    const closing = vi
      .spyOn(payslipGpt, 'generatePayslipClosingLine')
      .mockResolvedValue('Stay well.')
    vi.spyOn(moolre, 'sendWhatsAppTemplate').mockResolvedValue()
    vi.spyOn(audit, 'audit').mockResolvedValue()

    await sendWorkerAdvanceSummary(BASE_INPUT)

    expect(closing).toHaveBeenCalledExactlyOnceWith({
      workerFirstName: 'Abena',
      payPeriodLabel: 'June 2026',
    })
  })

  it('audits whatsapp_summary_sent on success', async () => {
    vi.spyOn(payslipGpt, 'generatePayslipClosingLine').mockResolvedValue('Hi.')
    vi.spyOn(moolre, 'sendWhatsAppTemplate').mockResolvedValue()
    const auditSpy = vi.spyOn(audit, 'audit').mockResolvedValue()

    await sendWorkerAdvanceSummary(BASE_INPUT)

    expect(auditSpy).toHaveBeenCalledOnce()
    expect(auditSpy.mock.calls[0]?.[0]).toMatchObject({
      action: 'whatsapp_summary_sent',
      actor: 'system',
      employerId: 'emp-1',
      employeeId: 'wkr-1',
    })
  })

  it('swallows WhatsApp delivery failures and audits whatsapp_summary_failed', async () => {
    vi.spyOn(payslipGpt, 'generatePayslipClosingLine').mockResolvedValue('Hi.')
    vi.spyOn(moolre, 'sendWhatsAppTemplate').mockRejectedValue(
      new AppError('MOOLRE_HTTP_FAILED', 502, 'template not approved'),
    )
    const auditSpy = vi.spyOn(audit, 'audit').mockResolvedValue()

    await expect(sendWorkerAdvanceSummary(BASE_INPUT)).resolves.toBeUndefined()

    expect(auditSpy).toHaveBeenCalledOnce()
    expect(auditSpy.mock.calls[0]?.[0]).toMatchObject({
      action: 'whatsapp_summary_failed',
      actor: 'system',
      employerId: 'emp-1',
      employeeId: 'wkr-1',
    })
  })
})
