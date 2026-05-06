# Security Policy

## Reporting a Vulnerability

If you believe you've found a security vulnerability in FIVUCSAS — the multi-tenant biometric authentication platform — please report it privately so we can fix it before disclosing publicly.

**Email:** info@app.fivucsas.com (subject prefix: `[SECURITY] FIVUCSAS`)

Please include:
- A clear description of the issue and its impact.
- Steps to reproduce, ideally with a minimal proof of concept.
- Affected versions or commit SHAs if known.
- Whether the issue is already public.

We commit to:
- Acknowledging your report within **3 business days**.
- Providing a full assessment within **10 business days**.
- Coordinating disclosure timing with you once a fix is ready.

## Scope

In scope:
- Authentication/authorization bypass (JWT, OAuth2, refresh-token, MFA, WebAuthn).
- Account takeover or session hijacking.
- Biometric data integrity (tenant scoping, embedding-encryption-at-rest, replay).
- Multi-tenant isolation breaks.
- Server-side injection (SQL, command, log).
- Data exposure beyond the authenticated principal's tenant.

Out of scope:
- Issues requiring physical access to a user's device.
- Social-engineering of platform staff or end-users.
- Best-practice hardening recommendations without a concrete attack path (please open a regular issue).
- Self-XSS, missing security headers without exploit, clickjacking on non-state-changing pages.

## Safe-Harbor

Good-faith research that respects user privacy, doesn't degrade service, and follows this disclosure process is welcomed. We will not pursue legal action against researchers who follow this policy.
