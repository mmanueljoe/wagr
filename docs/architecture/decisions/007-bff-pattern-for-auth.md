# 007. Backend-for-Frontend (BFF) pattern for authentication

Date: 2026-06-09
Status: Accepted

## Context

The default Supabase Auth pattern in a Next.js app — using
`@supabase/ssr`'s `createBrowserClient` — stores the session JWT in
browser cookies (readable by JavaScript) and in localStorage. This is
what most tutorials and consumer SaaS dashboards ship.

For Wagr, the JWT is the credential. Any JavaScript that runs on a
logged-in page can read it from localStorage or `document.cookie`. A
single XSS bug means an attacker can impersonate an employer — read
employee PII, salaries, MoMo numbers, and initiate Collections calls
against the employer's float.

Wagr handles real wages to real workers via Moolre. We're in the fintech
threat class, not the consumer-SaaS one.

## Decision

Adopt the BFF (Backend-for-Frontend) pattern. The browser talks only to
the Wagr api; the Wagr api holds the Supabase session.

Concretely:

- Real tokens (Supabase access token, Supabase refresh token, Moolre keys
  in future) **never reach the browser.** They live in Redis on the api,
  keyed by an opaque random session ID.
- The browser holds a single `HttpOnly`, `Secure`, `SameSite=Lax` cookie
  containing only the opaque session ID. JavaScript on the page literally
  cannot read it.
- All auth endpoints (`/auth/register`, `/auth/login`, `/auth/logout`,
  `/auth/me`) live on the api. The web hits these via `fetch`.
- The web app does **not** install `@supabase/ssr` or `@supabase/supabase-js`.
- Next.js middleware checks the session cookie against Redis to gate
  `/dashboard/*`. No Supabase call in the browser.

## Consequences

**Accepted:**

- Auth flows take one extra hop (browser → api → Supabase) instead of
  direct (browser → Supabase). Latency cost: ~50-100ms on login. Worth it.
- We maintain session storage ourselves in Redis (TTL, refresh-token
  rotation, revocation list). Slightly more code than relying on Supabase's
  default client.
- Logout is a real api call (delete the Redis row, clear the cookie),
  not just clearing browser storage.

**Gained:**

- XSS no longer gives an attacker the auth token. The opaque session ID is
  in an HttpOnly cookie that JavaScript cannot read.
- Token rotation, revocation, and lifetime are fully in our control.
- Every authenticated request passes through the api, so audit logging
  and authorization checks are centralised.
- The pattern matches what every serious fintech (Stripe, Plaid, Wise,
  Revolut) ships in production.
- Future Moolre work inherits the same pattern: Moolre keys live on the
  api, never on the client, by construction.

## Why the typical "just use Supabase Auth" reasoning doesn't apply here

The default Supabase pattern is fine for consumer apps and internal
SaaS dashboards. For a payments product, the JWT being readable from
client-side JavaScript fails the OWASP ASVS requirement that session
tokens be `HttpOnly`, and contradicts Auth0's published hierarchy
(in-memory > BFF > localStorage-as-fallback) for SPAs.

We have the pieces already — Redis from `[redis-setup]`, an Express
api from `[express-scaffold]`, only one auth flow live so far — so
the BFF cost is bounded. Retrofitting in Sprint 4 would be much
harder.

## References

- [OWASP ASVS — Session Management](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V3-Session-management.md)
- [Auth0 — Token Storage Guidance](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
