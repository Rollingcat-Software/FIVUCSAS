# FIVUCSAS — Academic Poster: Claude Design Brief

> **How to use this file:** open **claude.ai/design**, start a new design, and paste
> everything from the line `=== PASTE BELOW INTO CLAUDE DESIGN ===` to the end.
> Upload the two crest images (see *Assets*) when prompted. Then iterate visually
> with the adjustment knobs / inline comments.

---

## Assets to upload into Claude Design

| File | What it is | Where it is |
|------|------------|-------------|
| `marmara-university.png` | Official Marmara University crest | `poster/assets/marmara-university.png` |
| `muhendislik-fakultesi.jpg` | Faculty of Engineering emblem | `poster/assets/muhendislik-fakultesi.jpg` |

Both crests are **required by CSE4198 §5.1** and must appear in the title bar.

If Claude Design supports it, also mention you want a **QR code** pointing to
`https://fivucsas.com` (see note below on why *not* `verify.fivucsas.com`).

---

## ⚠️ Important correction baked into this brief

The earlier poster drafts put a QR / link to **`verify.fivucsas.com`**. That URL is an
**OIDC sign-in endpoint** — opened on its own it only shows:

> *Verification Error — This sign-in link is incomplete. Please return to the original site and start again.*

So it is useless as a scan target. **The poster QR must point to `https://fivucsas.com`**
(the landing page, which has a working "Try the live demo" button) — or to
`https://demo.fivucsas.com` (the BYS student-portal demo). This brief uses `fivucsas.com`.

---

============================================================
=== PASTE BELOW INTO CLAUDE DESIGN ===
============================================================

# Design request

Design a **professional academic conference poster** for a university graduation
project. **A0 portrait** (841 × 1189 mm), for **print at 300 dpi**. It should read
clearly from ~2 metres away: picture-led, minimal body text, confident and modern —
product-marketing polish with academic rigor. **No emoji-style icons** — use a single
consistent professional **line / duotone icon set** (Lucide / Phosphor / Tabler style).
Flat design: generous whitespace, a disciplined grid, thin accent rules instead of
heavy boxes, no drop shadows.

## Project

**FIVUCSAS** — *Face and Identity Verification Using Cloud-based SaaS.*
A production-deployed, multi-tenant **biometric identity-verification platform**.
Marmara University, Faculty of Engineering, Department of Computer Engineering.
Course CSE4197 / CSE4198, Spring 2025–2026.

**Team:** Ahmet Abdullah Gültekin · Ayşe Gülsüm Eren · Ayşenur Arıcı
**Advisor:** Assoc. Prof. Dr. Mustafa Ağaoğlu

## Visual direction

- **Color palette**
  - Navy `#0B2545` (primary / titles / dark bands)
  - Blue `#13315C` (section headers)
  - Teal `#1E96A8` (accent, data, highlights)
  - Gold `#F4B400` (call-outs, emphasis numbers)
  - Off-white `#F6F8FB` (background)
  - Ink `#1B1F23` (body text)
  - Success green `#27AE60` / Danger red `#C0392B` (only for "blocked vs. passes" contrasts)
- **Typography:** a clean geometric sans (Inter / IBM Plex Sans / Source Sans). Large,
  bold headlines; comfortable line-height; never more than ~2 short lines of body copy
  per block.
- **Icons:** one consistent professional line/duotone set. Each feature / concept gets
  an icon. Absolutely no emoji.
- **Layout:** title bar → a bold slogan band → a "what we solve" band → a 3-column body
  → a thin footer. Use a 3-column grid for the body. Keep blocks flat with a thin
  top accent rule per section; lots of breathing room.

## Title bar (top of poster)

Left: **Marmara University crest** (uploaded image).
Center: **FIVUCSAS** in very large bold; under it the full name
*"Face and Identity Verification Using Cloud-based SaaS"*; under that a one-line
italic descriptor *"A multi-tenant biometric identity platform — production-deployed."*
Right: **Faculty of Engineering emblem** (uploaded image).
Below the center block, a single line: the three team members, then
**Advisor:** Assoc. Prof. Dr. Mustafa Ağaoğlu · CSE4197 / CSE4198 · Spring 2025–2026.
Footer-of-title line: Marmara University · Faculty of Engineering · Department of
Computer Engineering.

## Slogan band (full-width, dark navy)

Big bold white headline:

> **Register once. Verify everywhere. Every time.**

Smaller gold supporting line underneath:

> Ten authentication factors, one hosted login — protected by a liveness check a
> recorded video cannot fake.

Optional: a subtle face-mesh / biometric motif or two simple line-icons (a person, a
globe) flanking the headline.

## Band: "What FIVUCSAS solves" (full-width, 4 cards)

Four equal cards, each a **problem → solution** pair (problem in red-ish tone with a
small "✕" treatment, solution in green tone with a small "✓"):

1. **Passwords leak, SIM-OTPs get swapped** → **Ten composable factors in one MFA flow**
2. **Photos, clips & deepfakes replay a face** → **Active randomised liveness challenge**
3. **GDPR & KVKK bolted on as an afterthought** → **Consent, export & erasure built in**
4. **Re-integrating auth for every new app** → **One hosted OIDC for every platform**

## Body — LEFT column

### Block: "Questions FIVUCSAS answers"
Five Q → A rows, each with a check icon. Question bold navy, answer one line:

1. **Is this a real person — or a replay?**
   → Active liveness challenge — **0 % replay false-accept** on 120 recorded-video attempts.
2. **Can one identity work across many apps?**
   → Hosted OAuth2 / OIDC, tenant-scoped — the user redirects once.
3. **Is my biometric data safe?**
   → Facenet512 embeddings **encrypted at rest** (AES-128 Fernet) before they touch the database.
4. **Can I delete my data?**
   → **GDPR Art. 17** right-to-erasure + scheduled purge — KVKK aligned.
5. **Do you verify real-world identity — not just login?**
   → A **9-step pipeline**: document scan + NFC chip + face match + liveness.

### Block: "Built for nine industries"
A grid of 8–9 industry icons + labels:
Banking KYC · Healthcare · Education · Government e-KYC · Retail age-check ·
Corporate onboarding · Travel & border · Fintech onboarding · Banking-light.
Caption: *"Each industry ships as a ready verification template — steps, thresholds
and regulators pre-wired."*

## Body — MIDDLE column

### Block: "Top 10 features" (the headline block — make it prominent)
A clean numbered list (1–10), each row = number badge + icon + bold title + one-line detail:

1. **Ten composable auth factors** — password · email/SMS OTP · TOTP · QR · face · voice · fingerprint · WebAuthn · hardware key · NFC document
2. **Active-liveness anti-spoofing** — random facial-action challenge + passive MiniFASNet spoof check
3. **Hosted OAuth2 / OIDC + PKCE** — redirective login, JWKS, discovery, RFC 8252 loopback
4. **Multi-tenant, tenant-controlled flows** — each tenant composes its own MFA flow, no backend code
5. **RBAC & fine-grained permissions** — roles, user-roles, permissions, row-level security
6. **9-step identity-verification pipeline** — document scan → NFC chip → face match → liveness
7. **7+ industry verification templates** — Banking KYC, Healthcare, Government e-KYC, Fintech…
8. **Embedding encryption at rest** — Fernet AES-128 wrap before every pgvector write
9. **GDPR / KVKK compliance built in** — consent, data export, right-to-erasure + purge
10. **Every platform** — web · Android · iOS · desktop · CLI

## Body — RIGHT column

### Block: "How it works" (3-step visual)
Three numbered steps with a simple icon each, connected by arrows:

1. **Capture** — the client streams a 60-frame face-mesh landmark stream (MediaPipe, 468 points).
2. **Challenge** — the server issues a random 3–5 step facial-action sequence + nonce, then verifies each action (EAR / MAR / yaw + temporal consistency) in parallel with a passive UniFace MiniFASNet spoof check.
3. **Verdict** — the Facenet512 embedding is encrypted (Fernet) and matched in pgvector (HNSW); returns *live & verified*.

### Block: "By the numbers" (stat grid)
Big numbers, short labels:

- **1,820+** automated tests
- **< 1 s** face verification (P95 = 950 ms, commodity CPU, no GPU)
- **0 %** replay false-accept (n = 120)
- **0.97** passive-spoof AUC
- **10** auth factors
- **9** verification-pipeline steps
- **7+** industry templates
- **60+** database migrations
- **8** architecture decision records (ADRs)
- **8** live production services

### Block: "Architecture at a glance"
Two service boxes connected by an API-key arrow:
- **Identity Core** — Spring Boot 3.4.7 / Java 21 (the frozen OIDC contract)
- **Biometric ML** — FastAPI / Python 3.12 (the weekly-changing ML models)
Caption: *"Split along the OIDC-contract vs. ML-iteration boundary; private Docker
network, API-key gated — the ML service has no public route."*
Tech-logo strip: React 18 · Kotlin Multiplatform · PostgreSQL 17 + pgvector ·
Redis 7.4 · Traefik v3.6.12 · Docker. Deployed on a single Hetzner CX43 (8 CPU / 16 GB).

### Block: "See it live"
A **QR code → `https://fivucsas.com`** with caption *"Scan for the live demo."*
Plus a short URL list:
- `fivucsas.com` — landing + live demo
- `demo.fivucsas.com` — BYS student-portal demo
- `app.fivucsas.com` — admin dashboard
- `api.fivucsas.com` — OAuth2 / OIDC API

> Do **not** use `verify.fivucsas.com` as the scan target — it is an OIDC sign-in
> endpoint and shows a "Verification Error" when opened without tenant parameters.

## Footer strip (full-width, navy)

One line in gold:
`github.com/Rollingcat-Software/FIVUCSAS` · `fivucsas.com` ·
`ahmetabdullahgultekin@gmail.com` · **Marmara University 2026**

============================================================
=== END OF PASTE ===
============================================================

---

## Reference — supporting facts (so you can answer follow-up questions in Claude Design)

**The 10 auth methods (exact names):** PASSWORD, EMAIL_OTP, SMS_OTP, TOTP, FACE,
VOICE, FINGERPRINT, HARDWARE_KEY, QR_CODE, NFC_DOCUMENT — all production-ready.

**The 9 verification step types:** document scan (YOLO), NFC chip read (ICAO 9303),
data extract (OCR + MRZ), face match (DeepFace cosine), liveness check (passive
UniFace + active BiometricPuzzle), address proof, watchlist check (MASAK/OFAC/UN/PEP),
age verification, plus phone verification / credit check / video interview as
extended steps.

**The industry templates:** Banking KYC (7 steps, BDDK/MASAK), Banking-light,
Healthcare (KVKK), Education, Corporate onboarding, Government e-KYC, Retail age-check,
Travel/Border, Fintech onboarding.

**Test counts:** Identity Core API 633 · Web-app 619 · Client-apps (Kotlin) 425 ·
Playwright E2E 27 specs · biometric-processor pytest — total ~1,820+.

**Latency budget (P95, Hetzner CX43, CPU-only):** face detection 120 ms · face mesh
180 ms · embedding 240 ms · anti-spoof 210 ms · vector search 200 ms → ~950 ms total.

**Architecture rationale:** a monolith was rejected early — biometric ML changes
weekly, but the OAuth/OIDC contract must stay frozen; the system is split along that
boundary into two horizontally-scalable services on a private Docker network.

**Hosted-first rationale:** matches the industry pattern (Auth0 Universal Login, Okta,
Microsoft Entra, Google, Apple, Keycloak, AWS Cognito) — solves Web NFC iframe
restrictions, WebAuthn cross-origin edge cases, Safari ITP, third-party-cookie death.

**Production URLs:** api.fivucsas.com · app.fivucsas.com · fivucsas.com ·
verify.fivucsas.com (OIDC endpoint — not a scan target) · demo.fivucsas.com ·
status.fivucsas.com.

---

## Tips for iterating in Claude Design

- First pass: ask for the full layout, then use the **adjustment knobs** for spacing
  and color balance rather than re-prompting from scratch.
- If a section feels text-heavy, tell it: *"cut this block to an icon + one caption line."*
- Keep the **Top 10 features** block as the visual centre of gravity.
- Ask it to **export to PDF at A0** for printing, and optionally **PPTX** for editing.
- Sanity-check that **both crests** survived in the title bar before exporting.
