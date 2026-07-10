# One-minute submission video — script + shot list

Target: 60 seconds. Structure per the sprint brief: 10s problem, 35s the real
USSD flow on a real phone, 10s employer dashboard, 5s close. **Run
`pnpm smoke` before recording anything.** No fabricated numbers anywhere —
if a figure appears on screen, it must be a real value from the demo run.

## Shot list

| # | Time | Shot | Audio (VO) | Caption overlay |
|---|---|---|---|---|
| 1 | 0:00–0:04 | Real SMS on a worker's phone: school-fees reminder (recreate the landing-page artifact — no real PII) | "It's the 15th. Salary comes on the 30th. The school wants fees on Thursday." | `Payday is two weeks away.` |
| 2 | 0:04–0:10 | Hands holding a basic phone, thumb hovering over the dial pad | "She's already worked half the month. That money exists — she just can't touch it. Until now." | `Her wages already exist.` |
| 3 | 0:10–0:18 | Screen-record / over-shoulder: dialing the USSD code, balance screen appears | "Abena dials a short code. Any phone — no app, no data, no loan." | `*XXX# — any phone` (real code) |
| 4 | 0:18–0:26 | USSD: enter 50 → confirm screen with fee + net | "She asks for 50 cedis of her own earned wages. Wagr shows the fee up front — 3%, flat, no interest." | `GHS 50 · fee GHS 1.50 · no interest` |
| 5 | 0:26–0:33 | USSD: PIN entry → "Request submitted" | "She confirms with her PIN…" | `Confirmed with her PIN` |
| 6 | 0:33–0:45 | **The money shot:** MoMo credit alert + SMS landing, phone in hand, real notification sound. Show a visible clock/stopwatch if the run is fast | "…and the money is in her MoMo wallet. That's the whole product. Under a minute, start to finish." | `Money in MoMo — under 60 seconds` |
| 7 | 0:45–0:52 | Dashboard: advances page showing the GHS 50 row `disbursed`; quick pan to float balance | "Her employer sees every advance in real time, funds the float, and settles everything on payday with one click." | `Employers stay in control` |
| 8 | 0:52–0:57 | Dashboard: close period → cut to WhatsApp payslip on the worker phone | "On payday, the employer closes the period — Wagr recovers every advance, and every worker gets a WhatsApp payslip." | `One click closes payday` |
| 9 | 0:57–1:00 | Wagr wordmark on Deep Midnight Blue, gold accent | "Wagr. Don't wait for payday. Built on Moolre." | `Wagr — Don't wait for payday. Built on Moolre.` |

## Recording checklist

- [ ] `pnpm smoke` green immediately before recording
- [ ] Worker phone: notifications ON, volume UP (shot 6 needs the sound), no
      real personal MoMo balance visible in frame
- [ ] Use the demo employer + demo worker — never a real person's name/number
      on screen; blur the msisdn if it appears in USSD headers
- [ ] Record shots 3–6 in ONE continuous take if possible — an honest,
      uncut take is more convincing than an edit
- [ ] Dashboard recordings at 1920×1080, cursor visible, slow deliberate moves
- [ ] Capture 2–3 takes of shot 6; the notification timing varies

## Captions file (for burned-in subtitles)

```
0:00 Payday is two weeks away.
0:04 Her wages already exist.
0:10 Dial a short code. Any phone.
0:18 GHS 50 · fee GHS 1.50 · no interest.
0:26 Confirmed with her PIN.
0:33 Money in MoMo — under 60 seconds.
0:45 Employers stay in control.
0:52 One click closes payday.
0:57 Wagr. Don't wait for payday. Built on Moolre.
```

## What NOT to say

- No user counts, revenue, or growth claims — we have none yet and the
  honesty is the brand.
- No "instant" — say "under a minute" and let the stopwatch prove it.
- No "credit", "loan", or "score" — it's their earned wage, and the flag
  feature is an "advance pattern", never credit risk.
