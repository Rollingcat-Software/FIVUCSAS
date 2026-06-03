# Overview

**FIVUCSAS** (Face & Identity Verification using Cloud-based SaaS) is a multi-tenant
biometric identity platform that is **already running in production**. Every login is
confirmed with the user's own biometric data, behind a single **"Sign in with FIVUCSAS"**
button. It plugs into any app the way *e-Devlet* or *"Sign in with Google"* do — only here
the identity proof is biometric, and you can host the whole thing yourself.

> Marmara University CSE4297 / CSE4298 graduation project · MIT-licensed · CPU-only · self-hostable.

## The problem

- Passwords and SMS-OTP fall to phishing, credential stuffing and SIM-swap.
- Face login is spoofable by printed photos, screen replay, masks and deepfakes.
- Every app rebuilds auth from scratch, and KVKK / GDPR compliance gets tacked on afterwards.
- Mainstream IAM (Okta, Auth0, Entra) treat biometrics as a device-local feature.

## What FIVUCSAS does

- **Face recognition** — FaceNet-512 embeddings, pgvector search, 1:1 and 1:N.
- **Hybrid liveness** — the active *Biometric Puzzle* plus passive MiniFASNet PAD.
- **Ten composable factors** — password, OTPs, TOTP, QR, face, voice, WebAuthn/FIDO2, NFC.
- **Hosted-first OAuth2 / OIDC** — redirective login with PKCE, plus an embeddable widget.
- **Multi-platform** — React 18 dashboard, Kotlin-Multiplatform mobile (Android/iOS/Desktop).
- **Compliance built-in** — per-tenant consent, data export / revoke / delete.

## Why it's different

It runs production-grade biometric auth on **ordinary CPU-only hardware** (one Hetzner CX43,
8 vCPU / 16 GB / 0 GPU), ships as **self-hostable open source** *and* as a managed SaaS, and
keeps a **frozen OIDC contract** while the ML iterates. The genuine novelty is the
**Biometric Puzzle** — randomised active liveness that defeats photo, replay and deepfake
because the action set is unpredictable and timestamped per attempt.

## Where to next

- [Architecture](./architecture) — how the pieces fit together.
- [Authentication & OIDC](./authentication) — the login round-trip and MFA engine.
- [Biometrics & Liveness](./biometrics) — the face/voice/NFC pipelines and the Puzzle.
- [Security & Threat Model](./security) — what each attack is countered by.
- The full <a href="/diagrams.html" target="_blank" rel="noreferrer">Diagram Gallery</a> has 40+ rendered diagrams.
