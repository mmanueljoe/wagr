// Pre-demo smoke test — exercises the entire Wagr loop against a RUNNING api
// pointed at Moolre sandbox (or live) credentials:
//
//   register → login → add workers (CSV path) → fund float (Payments + OTP)
//   → USSD: PIN setup, balance, amount, confirm, wrong-PIN retry, correct PIN
//   → transfer polling lands the advance → dashboard reflects it
//   → period close runs → repayment reconciles.
//
// Run it before every pitch, every video recording, every deploy:
//
//   pnpm --filter api dev          # terminal 1 — api must be running
//   pnpm smoke                     # terminal 2
//
// Moolre still gets called for real (Payments, Transfers, SMS) — this is a
// sandbox test, not a mock. Webhooks are the one exception: if ngrok isn't
// exposing the api, pass --simulate-webhooks and the script POSTs the same
// payload Moolre would, straight to /webhooks/moolre. Same handler, same
// code path — only the delivery hop is skipped.
//
// Overrides (all optional):
//   SMOKE_API_URL           default http://localhost:3001
//   SMOKE_WORKER_MOMO       default 0244123456 — use a REAL number for live runs
//   SMOKE_WORKER_NETWORK    default mtn
//   SMOKE_EMPLOYER_MOMO     default 0244000001 — the wallet float is pulled from
//   SMOKE_EMPLOYER_NETWORK  default mtn
import { createInterface } from 'node:readline/promises'

const API = process.env.SMOKE_API_URL ?? 'http://localhost:3001'
const WORKER_MOMO = process.env.SMOKE_WORKER_MOMO ?? '0244123456'
const WORKER_NETWORK = process.env.SMOKE_WORKER_NETWORK ?? 'mtn'
const EMPLOYER_MOMO = process.env.SMOKE_EMPLOYER_MOMO ?? '0244000001'
const EMPLOYER_NETWORK = process.env.SMOKE_EMPLOYER_NETWORK ?? 'mtn'
const SIMULATE_WEBHOOKS = process.argv.includes('--simulate-webhooks')
const USSD_ONLY = process.argv.includes('--ussd-only')

// Moolre's USSD callback network integers — USSD API values, which differ
// from the Payments/Transfers codes. See docs/architecture/moolre-api-reference.md.
const USSD_NETWORK_CODES: Record<string, number> = { mtn: 3, telecel: 6, at: 5 }

const FLOAT_TOPUP_PESEWAS = 20_000
const ADVANCE_CEDIS = '50'
const PIN = process.env.SMOKE_WORKER_PIN ?? '4321'
const POLL_TIMEOUT_MS = 120_000
const POLL_EVERY_MS = 3_000

let cookie = ''
let passed = 0
const startedAt = Date.now()

async function main(): Promise<void> {
  banner()

  await step('api is up (/health)', async () => {
    const res = await fetch(`${API}/health`)
    if (!res.ok) throw new Error(`GET /health returned ${res.status}`)
  })

  const runId = Date.now()
  const email = `smoke-${runId}@wagr.dev`
  const password = `Smoke-${runId}!`

  if (!USSD_ONLY) {
    await step('employer registers', async () => {
      const res = await post('/auth/register', {
        company_name: `Smoke Test Co ${runId}`,
        email,
        password,
        phone: `+233${String(200_000_000 + (runId % 100_000_000))}`,
        industry: 'other',
        pay_date: payDateRoughlyTwoWeeksAgo(),
      })
      captureCookie(res)
    })

    await step('employer logs in', async () => {
      const res = await post('/auth/login', { email, password })
      captureCookie(res)
      const me = await getJson('/auth/me')
      if (!me.employer_id) throw new Error('/auth/me missing employer_id')
    })

    await step('workers uploaded (CSV path posts per row)', async () => {
      const workers = [
        { full_name: 'Smoke Worker', momo_number: WORKER_MOMO, network: WORKER_NETWORK },
        { full_name: 'Ama Mensah', momo_number: '0550000002', network: 'telecel' },
        { full_name: 'Kojo Asante', momo_number: '0270000003', network: 'at' },
      ]
      for (const w of workers) {
        await post('/employees', {
          ...w,
          monthly_salary_pesewas: 200_000,
          start_date: '2026-01-05',
        })
      }
      const list = await getJson('/employees')
      if (list.employees.length !== 3) {
        throw new Error(`expected 3 employees, got ${list.employees.length}`)
      }
    })

    await fundFloat()
  }

  const sessionId = `smoke-${runId}`
  const msisdn = `233${WORKER_MOMO.slice(1)}`

  await step('USSD rejects an unregistered number', async () => {
    const r = await ussd(`${sessionId}-stranger`, '233209999999', '', true)
    expectIncludes(r.message, 'not registered')
    expectEnded(r)
  })

  // First dial lands on PIN setup for a fresh worker, or straight on the
  // balance screen when the PIN already exists (e.g. --ussd-only reruns).
  await step('USSD first dial reaches the balance screen', async () => {
    let r = await ussd(sessionId, msisdn, '', true)
    if (r.message.includes('set a 4-digit PIN')) {
      r = await ussd(sessionId, msisdn, PIN, false)
      expectIncludes(r.message, 'Re-enter')
      r = await ussd(sessionId, msisdn, PIN, false)
    }
    expectIncludes(r.message, 'Earned:')
    expectIncludes(r.message, 'Press 1')
  })

  await step('USSD amount + confirm screens', async () => {
    const r1 = await ussd(sessionId, msisdn, '1', false)
    expectIncludes(r1.message, 'Enter amount')
    const r2 = await ussd(sessionId, msisdn, ADVANCE_CEDIS, false)
    expectIncludes(r2.message, `Confirm: GHS ${ADVANCE_CEDIS}.00`)
    expectIncludes(r2.message, 'Fee:')
    const r3 = await ussd(sessionId, msisdn, '1', false)
    expectIncludes(r3.message, 'Enter your 4-digit PIN')
  })

  await step('USSD wrong PIN burns an attempt, right PIN submits', async () => {
    const r1 = await ussd(sessionId, msisdn, '0000', false)
    expectIncludes(r1.message, 'Wrong PIN. 2 attempts remaining')
    const r2 = await ussd(sessionId, msisdn, PIN, false)
    expectIncludes(r2.message, 'Request submitted')
    expectEnded(r2)
  })

  if (USSD_ONLY) return summary()

  await step('advance reaches disbursed (transfer polling)', async () => {
    await pollUntil('GET /advances shows a terminal advance', async () => {
      const { advances } = await getJson('/advances')
      const adv = advances[0]
      if (!adv) return false
      if (adv.status === 'failed') {
        throw new Error(`advance failed: ${adv.failure_reason ?? 'no reason recorded'}`)
      }
      return adv.status === 'disbursed'
    })
  })

  await step('dashboard reflects the advance', async () => {
    const summary = await getJson('/dashboard/summary')
    if (summary.advances_this_period_count < 1) {
      throw new Error('dashboard advances_this_period_count still 0')
    }
  })

  await periodClose()
  summary()
}

async function fundFloat(): Promise<void> {
  let externalRef = ''
  await step('float top-up initiated (Moolre Payments)', async () => {
    const res = await post('/float/fund', {
      amount_pesewas: FLOAT_TOPUP_PESEWAS,
      momo_number: EMPLOYER_MOMO,
      network: EMPLOYER_NETWORK,
    })
    const body = (await res.json()) as {
      top_up_id: string
      external_ref: string
      state: 'otp_required' | 'prompt_sent'
    }
    externalRef = body.external_ref

    if (body.state === 'otp_required') {
      const otp = await promptLine(`  Moolre SMS'd an OTP to ${EMPLOYER_MOMO}. Enter it: `)
      await post('/float/fund/otp', { top_up_id: body.top_up_id, otpcode: otp })
    }
  })

  await step('float top-up completes (webhook)', async () => {
    if (SIMULATE_WEBHOOKS) {
      await simulateWebhook(externalRef)
    } else {
      log('  approve the MoMo prompt on the employer phone; waiting for the webhook (needs ngrok)')
    }
    await pollUntil('GET /float shows the credited balance', async () => {
      const status = await getJson('/float')
      return status.balance_pesewas >= FLOAT_TOPUP_PESEWAS && !status.has_pending_top_up
    })
  })
}

async function periodClose(): Promise<void> {
  let repaymentId = ''
  await step('period close preview includes the advance', async () => {
    const preview = await getJson('/period-close/preview')
    if (preview.total_to_recover_pesewas <= 0) {
      throw new Error('preview shows nothing to recover')
    }
  })

  await step('period close initiated (Moolre Payments)', async () => {
    const res = await post('/period-close/run', {})
    const body = (await res.json()) as { repayment_id: string }
    repaymentId = body.repayment_id
  })

  await step('repayment reconciles to collected', async () => {
    if (SIMULATE_WEBHOOKS) {
      await simulateWebhook(await repaymentExternalRef(repaymentId))
    } else {
      log('  approve the repayment MoMo prompt; waiting for the webhook (needs ngrok)')
    }
    await pollUntil('GET /period-close/status shows collected', async () => {
      const status = await getJson(`/period-close/status/${repaymentId}`)
      if (status.status === 'failed') {
        throw new Error(`repayment failed: ${status.failure_reason ?? 'no reason recorded'}`)
      }
      return status.status === 'collected'
    })
  })
}

// The run endpoint only returns the repayment id; the webhook needs the
// externalref. Read it straight off the row via Supabase REST — this is a
// test harness talking to its own test DB, not app code.
async function repaymentExternalRef(repaymentId: string): Promise<string> {
  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!base || !key) {
    throw new Error('--simulate-webhooks needs SUPABASE_URL + SUPABASE_SERVICE_KEY')
  }
  const res = await fetch(
    `${base}/rest/v1/repayments?id=eq.${repaymentId}&select=moolre_external_ref`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  )
  const rows = (await res.json()) as Array<{ moolre_external_ref: string }>
  const ref = rows[0]?.moolre_external_ref
  if (!ref) throw new Error(`no repayment row found for ${repaymentId}`)
  return ref
}

async function simulateWebhook(externalref: string): Promise<void> {
  const secret = process.env.MOOLRE_WEBHOOK_SECRET
  if (!secret) throw new Error('--simulate-webhooks needs MOOLRE_WEBHOOK_SECRET in the environment')
  const res = await fetch(`${API}/webhooks/moolre`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: { secret, externalref, txstatus: 1, transactionid: `smoke-sim-${Date.now()}` },
    }),
  })
  if (!res.ok) throw new Error(`simulated webhook rejected: ${res.status}`)
}

// ─── HTTP + USSD helpers ────────────────────────────────────────────────

async function post(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
  return res
}

// biome-ignore lint/suspicious/noExplicitAny: test harness reads loosely-shaped JSON
async function getJson(path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: { cookie } })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function ussd(
  sessionId: string,
  msisdn: string,
  message: string,
  isNew: boolean,
): Promise<{ message: string; reply: boolean }> {
  const res = await post('/ussd', {
    sessionId,
    new: isNew ? '1' : '0',
    msisdn,
    network: USSD_NETWORK_CODES[WORKER_NETWORK] ?? 3,
    message,
    extension: '',
    data: '',
  })
  return res.json() as Promise<{ message: string; reply: boolean }>
}

function captureCookie(res: Response): void {
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0] ?? ''
}

// ─── Assertions + runner ────────────────────────────────────────────────

function expectIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`expected message to include "${expected}", got:\n  "${actual}"`)
  }
}

function expectEnded(r: { reply: boolean }): void {
  if (r.reply) throw new Error('expected session to END (reply=false) but it stayed open')
}

async function pollUntil(what: string, check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS))
  }
  throw new Error(`timed out after ${POLL_TIMEOUT_MS / 1000}s waiting for: ${what}`)
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  const t0 = Date.now()
  try {
    await fn()
    passed += 1
    log(`✓ ${name} (${Date.now() - t0}ms)`)
  } catch (err) {
    log(`✗ ${name}`)
    log(`  ${err instanceof Error ? err.message : String(err)}`)
    log(`\nSMOKE TEST FAILED after ${passed} passing steps. Do not demo until this is green.`)
    process.exit(1)
  }
}

async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(question)).trim()
  rl.close()
  return answer
}

function payDateRoughlyTwoWeeksAgo(): number {
  const d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).getDate()
  return Math.min(d, 28)
}

function banner(): void {
  log(`Wagr smoke test → ${API}`)
  log(`  webhooks: ${SIMULATE_WEBHOOKS ? 'SIMULATED (self-POST)' : 'real (Moolre → ngrok)'}`)
  log(`  worker: ${WORKER_NETWORK} ${WORKER_MOMO.slice(0, 3)}***${WORKER_MOMO.slice(-2)}\n`)
}

function summary(): void {
  log(`\nSMOKE TEST GREEN — ${passed} steps in ${Math.round((Date.now() - startedAt) / 1000)}s.`)
  log('Loop is demo-ready. Run this again right before the pitch.')
}

function log(line: string): void {
  console.log(line)
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
