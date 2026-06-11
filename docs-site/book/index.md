---
layout: home
hero:
  name: FIVUCSAS
  text: Face & Identity Verification using Cloud-based SaaS
  tagline: A production-deployed, multi-tenant biometric identity platform — one "Sign in with FIVUCSAS" button, 10 composable factors, hybrid liveness, OAuth2/OIDC, CPU-only, self-hostable.
  actions:
    - theme: brand
      text: Read the Guide
      link: /guide/overview
    - theme: alt
      text: Architecture
      link: /guide/architecture
    - theme: alt
      text: Diagram Gallery
      link: /diagrams.html
      target: _blank
      rel: noreferrer
features:
  - icon: 🔐
    title: 10 composable auth factors
    details: Password, Email/SMS OTP, TOTP, QR, Face, Voice, Fingerprint/WebAuthn, Hardware Key, NFC document — plus passkey & approve-login. Per-tenant flows assembled by config, not code.
  - icon: 🧠
    title: Hybrid liveness, no GPU
    details: Passive PAD (MiniFASNet) + the active Biometric Puzzle (random 3–5 of 23 actions) run CPU-only on one Hetzner CX43. Sub-second face verification.
  - icon: 🪪
    title: NFC document auth
    details: ICAO 9303 chip reading (BAC, DG1/DG2, passive authentication, fail-closed) for Turkish ID cards and biometric passports.
  - icon: 🏢
    title: Multi-tenant by design
    details: Hibernate @Filter isolation, pairwise OIDC subjects, per-tenant biometric consent. One platform, infinite verification flows.
  - icon: 🔌
    title: Hosted-first OIDC
    details: Redirective OAuth2/OIDC with PKCE — integrate like "Sign in with Google" / e-Devlet. Embeddable widget for step-up MFA.
  - icon: 🇪🇺
    title: KVKK / GDPR built-in
    details: Consent-gated capture, scoped use, and full data-subject rights — export, revoke, delete — with auditable lifecycle.
---
