-- Moolre's Payments API has a 3-step OTP flow before the actual MoMo PIN
-- prompt is sent: first call returns TP14 ("OTP sent to payer"), payer
-- types the OTP back into our dashboard, we resubmit with the otpcode
-- field (200_OTP_SUCCESS), then call a third time to trigger the prompt
-- (200_PAYMENT_REQ). The intermediate state between "OTP sent" and "OTP
-- submitted" needs its own status so the reconciler and UI can
-- distinguish it from a top-up that's actually waiting on Moolre's webhook.
--
-- See docs/architecture/moolre-api-reference.md (Payment API → OTP flow).

alter table float_top_ups drop constraint if exists float_top_ups_status_check;

alter table float_top_ups
  add constraint float_top_ups_status_check
  check (status in ('pending', 'awaiting_otp', 'succeeded', 'failed'));
