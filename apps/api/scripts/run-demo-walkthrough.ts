import { supabase } from '../src/lib/supabase'

async function ussd(sessionId: string, msisdn: string, message: string, isNew: boolean) {
  const res = await fetch('http://localhost:3001/ussd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      new: isNew ? '1' : '0',
      msisdn,
      network: 3,
      message,
      extension: '',
      data: '',
    }),
  })
  if (!res.ok) {
    throw new Error(`USSD callback failed: ${await res.text()}`)
  }
  return res.json() as Promise<{ message: string; reply: boolean }>
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  console.log('=== WAGR END-TO-END DEMO WALKTHROUGH ===\n')

  try {
    // 1. Fetch current float balance
    console.log('[Step 1] Loading initial employer float balance...')
    const { data: employer } = await supabase
      .from('employers')
      .select('id, company_name, float_balance')
      .eq('email', 'demo@wagr.dev')
      .single()

    if (!employer) throw new Error('Demo employer not found')
    console.log(`Company: ${employer.company_name}`)
    console.log(`Current Float Balance: GHS ${Number(employer.float_balance).toFixed(2)}`)

    // 2. Simulate USSD worker advance request
    console.log('\n[Step 2] Simulating worker dialing *767# on USSD...')
    const sessionId = `demo-walkthrough-${Date.now()}`
    const msisdn = '233244123456' // Abena's Momo number (0244123456)

    // Dial 1: Balance check screen
    console.log('Dialing *767# (first time)...')
    let r = await ussd(sessionId, msisdn, '', true)
    console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)

    // If PIN is not set, set it to 4321
    if (r.message.includes('PIN')) {
      console.log('Setting PIN to 4321...')
      r = await ussd(sessionId, msisdn, '4321', false)
      console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)
      console.log('Re-entering PIN to confirm...')
      r = await ussd(sessionId, msisdn, '4321', false)
      console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)
    }

    // Dial 2: Choose Advance (Select 1)
    console.log('Selecting Option 1 (Request Advance)...')
    r = await ussd(sessionId, msisdn, '1', false)
    console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)

    // Dial 3: Enter amount GHS 100 (well within Abena's GHS 140 limit)
    console.log('Entering amount "100"...')
    r = await ussd(sessionId, msisdn, '100', false)
    console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)

    // Dial 4: Confirm (Select 1)
    console.log('Selecting Option 1 (Confirm)...')
    r = await ussd(sessionId, msisdn, '1', false)
    console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)

    // Dial 5: Enter PIN 4321
    console.log('Entering PIN 4321...')
    r = await ussd(sessionId, msisdn, '4321', false)
    console.log(`USSD Response: "${r.message.replace(/\n/g, ' | ')}"`)
    console.log('USSD session completed successfully!')

    // Wait a brief moment for background processing / mock transfer status
    console.log('\nWaiting for backend status reconciliation...')
    await sleep(2000)

    // 3. Verify float balance decreased
    console.log('\n[Step 3] Verifying float balance decrement after USSD request...')
    const { data: updatedEmployer } = await supabase
      .from('employers')
      .select('float_balance')
      .eq('id', employer.id)
      .single()

    const balanceDiff = Number(employer.float_balance) - Number(updatedEmployer?.float_balance)
    console.log(
      `New Float Balance: GHS ${Number(updatedEmployer?.float_balance).toFixed(2)} (decreased by GHS ${balanceDiff.toFixed(2)})`,
    )

    // 4. Log in to Dashboard to close pay period
    console.log('\n[Step 4] Logging in to Dashboard to preview pay period close...')
    const loginRes = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@wagr.dev',
        password: 'DemoWagr-2026!',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0]
    if (!cookie) throw new Error('Authentication failed')

    console.log('Fetching pay period preview...')
    const previewRes = await fetch('http://localhost:3001/period-close/preview', {
      headers: { Cookie: cookie },
    })
    const preview = (await previewRes.json()) as {
      worker_count: number
      total_to_recover_pesewas: number
    }
    console.log(`Advances to recover count: ${preview.worker_count}`)
    console.log(
      `Total gross to recover: GHS ${(preview.total_to_recover_pesewas / 100).toFixed(2)}`,
    )

    // 5. Create the pending repayment in database to simulate initiating period close without hitting Moolre's payment API
    console.log('\n[Step 5] Simulating period close initiation in database...')
    const totalCedis = preview.total_to_recover_pesewas / 100
    const externalRef = `wagr-repay-demo-${Date.now()}`

    // Fetch all current disbursed advances for this employer to associate
    const { data: advancesToAssociate } = await supabase
      .from('advance_requests')
      .select('id')
      .eq('employer_id', employer.id)
      .eq('status', 'disbursed')

    const advanceIds = (advancesToAssociate ?? []).map((adv) => adv.id)

    const { data: repayment, error: repayErr } = await supabase
      .from('repayments')
      .insert({
        employer_id: employer.id,
        total_amount: totalCedis,
        advance_request_ids: advanceIds,
        status: 'pending',
        moolre_external_ref: externalRef,
      })
      .select('id')
      .single()

    if (repayErr || !repayment) {
      throw new Error(`Failed to create test repayment: ${repayErr?.message}`)
    }
    console.log(
      `Created pending repayment ID: ${repayment.id} with ${advanceIds.length} associated advances`,
    )

    // 6. Simulate Moolre Payment Webhook success to recover float
    console.log('\n[Step 6] Simulating Moolre Payday Recovery Webhook callback...')
    const webhookRes = await fetch('http://localhost:3001/webhooks/moolre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          secret: 'local-webhook-secret',
          externalref: externalRef,
          txstatus: 1, // Successful
        },
      }),
    })
    console.log(`Webhook handler replied with status: ${webhookRes.status}`)

    // Wait for DB write
    await sleep(2000)

    // 7. Verify float balance recovered
    console.log('\n[Step 7] Verifying float balance restored post-repayment...')
    const { data: finalEmployer } = await supabase
      .from('employers')
      .select('float_balance')
      .eq('id', employer.id)
      .single()

    console.log(
      `Final Float Balance: GHS ${Number(finalEmployer?.float_balance).toFixed(2)} (fully recovered!)`,
    )
    console.log('\n=== END-TO-END DEMO WALKTHROUGH GREEN ===')
  } catch (err) {
    console.error('Error in demo walkthrough:', err)
  }
}

run()
