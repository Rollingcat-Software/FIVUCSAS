# FIVUCSAS — Product Review

**Date:** 2026-04-30
**Reviewer:** Product Owner (Claude, acting)
**Scope:** Parent meta-repo `/opt/projects/fivucsas` and all submodules
(`identity-core-api`, `biometric-processor`, `web-app`, `landing-website`,
`verify-widget`, `client-apps`, `practice-and-test`).
**Lens:** Product / market / user-value. Engineering audit is run separately.

---

## Executive Summary

- **Maturity: Late Beta with a Production Skin.** All ten primary auth methods
  ship and run in prod (`identity-core-api/.../service/handler/`, ten handlers
  present), V50 schema migrations are applied, three subdomains are live, and
  900+ tests pass. But *product packaging* is firmly pre-revenue: no pricing
  page, no self-serve sign-up that creates a tenant, no billing, no support
  surface, no trust center, no status page. Engineering is ahead of
  productization by roughly two quarters.
- **Strength 1 — Auth-method depth.** Ten methods (Password, Email-OTP,
  SMS-OTP, TOTP, QR, Face, Fingerprint/WebAuthn, Voice, NFC document, Hardware
  Key) plus a configurable multi-step flow engine
  (`identity-core-api/src/main/resources/db/migration/V16__auth_flow_system.sql`)
  is genuinely competitive with Auth0 / Okta on raw method count and exceeds
  most KYC players (Onfido / Veriff) on second-factor variety.
- **Strength 2 — Hosted-first OAuth 2.1 / OIDC.** `verify.fivucsas.com` ships
  a real hosted login surface (`web-app/src/verify-app/HostedLoginApp.tsx`)
  with PKCE S256, JWKS, OIDC discovery, redirect-URI allowlist, tenant-bound
  client refusal (commit `5446d57`). This is the integration shape modern
  buyers expect.
- **Strength 3 — Real biometric stack.** Facenet512 + UniFace passive liveness
  + DeepFace anti-spoof + pgvector cosine search all live on prod (CLAUDE.md
  Biometric pipeline section). Not a demo — this actually verifies users.
- **Risk 1 — No self-serve.** Tenant creation requires an existing super-admin
  login (`web-app/src/pages/TenantFormPage.tsx:35`). A prospect cannot sign up,
  swipe a card, and integrate. Without that flywheel the product cannot scale
  past hand-sold pilots.
- **Risk 2 — Identity-confused branding.** Landing copy markets it as a
  *Marmara University engineering project*
  (`landing-website/src/App.tsx:143,559`). Buyers will not procure from a
  course project. The product is an enterprise auth/KYC platform but is
  presented as a capstone.
- **Risk 3 — KVKK/GDPR is half-implemented as UX.** Backend export and purge
  endpoints exist (`UserDataExportController.java:42`, `PurgeAdminController`),
  but the user-facing consent flow at registration is silent — no checkboxes,
  no link-out to processing terms before submit
  (`web-app/src/features/auth/components/RegisterPage.tsx:300-320`). For a
  Turkey-regulated identity product, that is a procurement blocker.

---

## Product Vision & Positioning

**What FIVUCSAS *is* (derivable from code+docs):**
A multi-tenant Turkish-market biometric authentication & identity-verification
SaaS. It bundles three product surfaces:

1. An **Identity Provider** (IdP) — OAuth 2.1 / OIDC issuer at
   `verify.fivucsas.com`, with hosted-login, JWKS, ten configurable auth
   methods, and a per-tenant flow builder. Maps to Auth0 / Okta / Keycloak.
2. A **KYC / Identity Verification Pipeline** — the `auth_methods` table
   carries `DOCUMENT_SCAN`, `NFC_CHIP_READ`, `DATA_EXTRACT`, `FACE_MATCH`,
   `LIVENESS_CHECK`, `WATCHLIST_CHECK`, `AGE_VERIFICATION`, `ADDRESS_PROOF`
   (`V26__verification_pipeline.sql:14-20`), with industry templates
   `FINTECH_KYC`, `HEALTHCARE_BASIC` (`V27__seed_verification_flows.sql`).
   Maps to Onfido / Jumio / Veriff / Sumsub.
3. An **Embeddable Auth Widget / SDK** — `@fivucsas/auth-js` and
   `@fivucsas/auth-react` (`web-app/src/verify-app/sdk/`), iframe-bridge for
   step-up + redirect-mode hosted login. Maps to Stripe Elements / Plaid Link.

**Tagline derivable from code:** *"Face & Identity Verification Platform — a
multi-tenant biometric authentication SaaS with 10 auth methods, hosted-login,
and KYC pipelines."* The current landing hero
(`landing-website/src/App.tsx:147-155`) lands on "Face & Identity Verification
Platform" — accurate but undifferentiated.

**Comparable products and where FIVUCSAS lands:**

| Competitor | Where FIVUCSAS overlaps | Where FIVUCSAS is weaker |
|---|---|---|
| **Auth0 / Okta** | OAuth/OIDC, MFA depth, flow builder | No SAML, no AD/LDAP federation, no log-streaming, no marketplace |
| **Onfido / Jumio / Veriff** | Liveness, anti-spoof, NFC, document scan templates | No global ID coverage, no AML/PEP screening data, no manual-review console |
| **Yoti** | Multi-method enrollment, mobile app | No reusable identity wallet, no digital ID network |
| **e-Devlet (TR gov)** | NFC TC ID reading, KVKK posture | Would consume e-Devlet, doesn't replace it |
| **Stripe Identity** | Embeddable widget, hosted page | No self-serve signup, no Turkish localization parity |
| **Keycloak (OSS)** | OIDC, multi-tenant, theme | No SAML, federation, identity brokering |

**Differentiation signals that exist in the code but are NOT marketed:**
- Native **Turkish KVKK** posture (`PrivacyPage.tsx`, `tenant_email_domains`
  with `marun.edu.tr` routing).
- **Configurable multi-step flows per operation type**
  (`OperationType.APP_LOGIN | DOOR_ACCESS | TRANSACTION | EXAM_PROCTORING`,
  `OperationType.java`) — exam-proctoring as first-class is genuinely novel.
- **Biometric Puzzle** — random sequence of facial actions
  (`web-app/src/features/biometric-puzzles/BiometricPuzzleId.ts`), 14-face +
  9-hand challenge library, README "key innovation" — but hidden behind login.
- **Server-authoritative geometry pre-filter** (D2 rule, CLAUDE.md). Avoids
  client-trust pitfalls most KYC widgets ignore.

---

## Personas & Use Cases

| Persona | Job-to-be-done | Where they live in the code | Maturity |
|---|---|---|---|
| **End-user (consumer)** | Sign up at a tenant site, enroll biometrics, log in with face/TOTP/etc., manage privacy | `web-app/src/features/auth/components/RegisterPage.tsx`, `LoginPage.tsx`, `MyProfilePage.tsx` | Functional but confusingly mixes admin and end-user concerns in one app shell |
| **Tenant admin** | Onboard org, configure auth flows per operation, manage users, audit, export data | `web-app/src/pages/TenantFormPage.tsx`, `AuthFlowBuilderPage.tsx`, `AuditLogsPage.tsx`, `EnrollmentsListPage.tsx` | Decent admin surface; no onboarding wizard, no first-run checklist |
| **Integrator / developer** | Get OAuth client_id+secret, set redirect URI, wire SDK | `web-app/src/pages/DeveloperPortalPage.tsx`, `web-app/src/verify-app/sdk/FivucsasAuth.ts`, `landing-website` API docs link | OAuth client CRUD exists; documentation is scattered across `docs/` submodule + GitHub README; no live "Try it" sandbox |
| **Ops / SRE (you)** | Deploy, rotate secrets, monitor, restore from backup | `RUNBOOK_*.md`, Grafana stack at `grafana.fivucsas.com` (DNS pending), `scripts/deploy/` | Recently improved (Loki+Promtail+Grafana), still single-operator |
| **Marmara University BYS (anchor customer)** | Demo deployment for exam proctoring + student auth | `demo.fivucsas.com`, `tenant_email_domains` rule for `marun.edu.tr`, `industry_template='HIGHER_ED'` not yet seeded | Live demo, no signed contract evident in repo |
| **Compliance officer / DPO** | Audit log access, data export proof, retention policy | `AuditLogsPage.tsx`, `UserDataExportController.java`, `PurgeAdminController.java` | Endpoints exist; no DPO-facing dashboard or retention-policy UI |
| **End-user's grandmother / non-technical user** | Sign up by phone, recover lost device | (no SMS-as-primary path; no recovery flow) | **Missing.** Major gap. |

**Top JTBDs uncovered:** social sign-on (Google/Apple/Microsoft); enterprise
upstream SSO (SAML, AD/LDAP); account recovery without device; cross-tenant
identity (Option B in `MULTI_EMAIL_TENANT_DESIGN`).

---

## Feature Inventory

### Authentication & MFA
| Feature | Status | Evidence |
|---|---|---|
| Password + bcrypt(12) | Shipped | `PasswordAuthHandler.java` |
| Email OTP | Shipped | `EmailOtpAuthHandler.java`, V29 |
| SMS OTP (Twilio) | Shipped | `SmsOtpAuthHandler.java`, `TwilioSmsService` |
| TOTP encrypted-at-rest | Shipped | `TotpAuthHandler.java`, V39, V42 |
| QR-code login | Shipped | `QrCodeAuthHandler.java`, `QrController.java` |
| Face (Facenet512 + liveness + anti-spoof) | Shipped | `FaceAuthHandler.java` |
| Fingerprint (WebAuthn platform) | Shipped | `FingerprintAuthHandler.java`, `WebAuthnService` |
| Voice (Resemblyzer 256-d) | Shipped | `VoiceAuthHandler.java`, V33 |
| NFC document (TC kimlik) | Shipped | `NfcDocumentAuthHandler.java`, V22 |
| Hardware Key (FIDO2) | Shipped | `HardwareKeyAuthHandler.java`, V18 |
| Multi-step flow per operation type | Shipped | `auth_flows`, `MultiStepAuthFlow.tsx` |
| Step-up auth | Shipped | `StepUpController.java`, V17 |
| Adaptive MFA / risk-based skips | Partial | V30 exists; not surfaced to users |

### Identity Verification (KYC) Pipeline
| Feature | Status | Evidence |
|---|---|---|
| Document scan | Defined only | `auth_methods` row; no UI flow |
| NFC chip read (TC kimlik) | Shipped (Android) | `client-apps`, 11k LOC |
| Data extraction (OCR) | Defined only | `DATA_EXTRACT` seeded; no extractor wired |
| Face-match against doc photo | Partial | enum exists; pipeline glue missing |
| Liveness check | Shipped | UniFace passive in prod |
| Watchlist / PEP screening | **Defined only — no data** | `WATCHLIST_CHECK` row in V26 |
| Age verification | Defined only | row exists, no enforcement |
| Phone verification | Shipped via SMS_OTP | |
| Address proof | Defined only | no flow |
| Industry templates | Partial | FINTECH_KYC, HEALTHCARE_BASIC seeded; no HIGHER_ED / GOV |
| Manual-review console | **Missing** | no triage UI for failures |

### Tenant / Multi-tenancy
| Feature | Status | Evidence |
|---|---|---|
| Multi-tenant data model | Shipped | `V1`, RLS in `V25` |
| Tenant CRUD admin UI | Shipped | `TenantFormPage.tsx`, `TenantsListPage.tsx` |
| Auto-routing by email domain | Shipped | `V44__tenant_email_domains.sql` |
| Per-tenant auth-method config | Shipped | `tenant_auth_methods` |
| Per-tenant branding (logo / color) | **Missing in UI** | no theme override path; `HostedLoginApp.tsx` reads `theme=light/dark` only |
| Tenant-scoped subdomains (`tenant.fivucsas.com`) | **Missing** | only fixed `app./demo./verify.` subdomains |
| Self-serve tenant creation | **Missing** | only super-admin route |
| Subscription plan tracking | DB columns exist, **no enforcement** | `tenants.subscription_plan/start_date/end_date` (V21 comment notes "stored but not surfaced") |

### End-user Privacy / Compliance
| Feature | Status | Evidence |
|---|---|---|
| Personal data export (JSON) | Shipped | `UserDataExportController.java`, `MyProfilePage` Section 6 |
| Per-method enrollment delete | Shipped | `MyProfilePage.tsx:761-783` |
| Bulk biometric purge (self-serve) | Shipped | `MyProfilePage.tsx:786-806` |
| Account deletion (self-serve) | **Missing** | no "Delete my account" flow; only enrollment delete |
| Soft-delete + 30-day purge job | Shipped, **disabled by default** | `PurgeAdminController.java`, feature flag `app.purge.softDelete.enabled` |
| Privacy / Terms pages | Shipped | `PrivacyPage.tsx`, `TermsPage.tsx` |
| Consent capture at registration | **Missing** | `RegisterPage.tsx:300-435` has no Terms/KVKK checkbox |
| Cookie banner | Not located | no consent banner component found |
| Audit log (admin-visible) | Shipped | `AuditLogsPage.tsx`, V40 partitioned, V46 backfilled |
| Audit log (end-user visible) | Partial | `MyProfilePage` Activity section shows recent logins only |

### Embeddable / Developer
| Feature | Status | Evidence |
|---|---|---|
| Hosted login (`verify.fivucsas.com`) | Shipped | `HostedLoginApp.tsx` |
| Iframe widget (step-up) | Shipped | `verifyContainer.ts`, `postMessageBridge.ts` |
| `@fivucsas/auth-js` SDK | Shipped | `web-app/src/verify-app/sdk/` |
| `@fivucsas/auth-react` | Shipped | dito |
| Web Components wrapper | **Planned** | CLAUDE.md "Phase 7 ~75% complete" |
| Mobile SDKs (iOS/Android native) | Partial | `client-apps` Compose Multiplatform — but iOS scope was permanently dropped (CLAUDE.md L11) |
| OpenAPI / Swagger spec | Shipped | `https://api.fivucsas.com/swagger-ui.html` |
| Postman collection / quickstart | **Missing** | no published collection |
| Sandbox / test mode (`test_*` keys) | **Missing** | no separation of test vs live |

### Observability for the customer
| Feature | Status | Evidence |
|---|---|---|
| Internal Loki + Grafana | Shipped (today) | Session 2026-04-30 |
| Customer-visible dashboards | **Missing** | tenant admin sees AuditLog + Analytics page; no SLA/uptime view |
| Webhooks | Partial | `biometric-processor/app/api/routes/webhooks.py` exists; not user-configurable |
| Status page | **Missing** | no `status.fivucsas.com` |

---

## User Journeys

### Journey A — End-user first-time enrollment **Grade: C+**

Walkthrough: Land on tenant integration → click "Sign in with FIVUCSAS" → redirected to `verify.fivucsas.com/login` → "Don't have an account? Register" → `RegisterPage` → fill name/email/password → email OTP → log in → land on dashboard → enroll biometrics from "My Profile".

Friction points:
1. **No consent capture at registration.** No "I accept Terms / I consent to KVKK" checkbox; the user has no informed-consent moment before account creation
   (`RegisterPage.tsx:300-320`).
2. **Hardcoded English on Register success screen** (`RegisterPage.tsx:314,317,347,350,358,373,379,426,435,445`): "Create Account", "Join FIVUCSAS Identity Platform", "Check your email", "We sent a verification code to", "Email verified successfully!", "Go to Sign In", "Verify Email", "Skip for now — Go to Sign In", aria-label "Registration form". Turkish users see English at the most trust-critical moment.
3. **First-run is not guided.** After register the user is dropped on `DashboardPage`; there is no enrollment wizard guiding "Step 1: secure your account with TOTP, Step 2: enroll your face." `EnrollmentPage.tsx` exists but is reached via My Profile, not auto-triggered.
4. **Sign-up auto-binds EMAIL_OTP and QR_CODE** as enrollments
   (`ManageEnrollmentService.ensureSessionBoundEnrollments`) — clever, but the
   user is never told this. The "Kayıtlı Doğrulama Yöntemleri" list shows
   methods they didn't consciously enroll.
5. **No recovery instructions.** No "save these recovery codes" pattern after TOTP enrollment (`TotpEnrollment.tsx`).

### Journey B — End-user re-auth via widget **Grade: B**

Walkthrough: User on tenant site clicks "Sign in" → `FivucsasAuth.loginRedirect()` → redirects to `verify.fivucsas.com/login?client_id=...&redirect_uri=...&code_challenge=...` → MFA flow runs → on success, redirects back with `?code=&state=` → tenant exchanges at `/oauth2/token`.

This is the strongest journey in the product. Code path is clean
(`HostedLoginApp.tsx`, `LoginMfaFlow.tsx`), uses `formatApiError`, properly
handles `ui_locales` (OIDC §3.1.2.1 compliant). Tenant-bound client refusal
(commit `5446d57`) is genuinely thoughtful — `demo.fivucsas.com` won't
authenticate non-Marmara accounts.

Friction:
1. **No forgot-device path mid-MFA.** If user lost their TOTP device, the
   MFA step shows "enter code" with no "I lost my device" link
   (`TotpStep.tsx`). Falls back to email-OTP only if the flow has it as a
   step.
2. **Tenant branding is invisible.** `HostedLoginApp.tsx` shows "FIVUCSAS"
   header even when the OAuth client is `marmara-bys-demo`. No tenant logo /
   tenant name fetched at `/oauth2/clients/{id}/public`. The user thinks
   they're logging into FIVUCSAS, not their bank/university.
3. **Mobile multi-tap WebAuthn bug** known and logged (CLAUDE.md "Known
   Issue" section). 2-7 taps to invoke fingerprint. Real customers will
   abandon.

### Journey C — Tenant admin onboarding **Grade: D**

Walkthrough: New customer wants to integrate FIVUCSAS. Today they cannot
self-serve. Steps:
1. Email Ahmet (the founder).
2. Ahmet logs into `app.fivucsas.com` as `admin@fivucsas.local`.
3. Ahmet goes to `/tenants/new` → fills tenant form (name, slug,
   contactEmail, maxUsers).
4. Ahmet creates a tenant admin user under that tenant (`UserFormPage`).
5. Ahmet emails the customer their initial password.
6. Customer logs in → goes to `/developer-portal` → creates an OAuth2 client → copies `client_id`/`client_secret`/redirect URI → integrates SDK.

Friction:
1. **No self-serve.** The product literally cannot grow without Ahmet.
2. **No onboarding checklist.** First login lands on `DashboardPage`; the new admin doesn't know to go to Auth Flows or Developer Portal.
3. **Default auth flow is opaque.** The seeded "Default Login Flow" has 10 methods now (Round 2 fix added VOICE + NFC_DOCUMENT to all 3 CHOICE steps) — but the tenant admin doesn't know they can disable any.
4. **No sandbox vs production.** The same OAuth client is used for everything; a misconfigured client breaks live traffic.
5. **No auth-flow templates per industry exposed.** `industry_template='FINTECH_KYC'` exists in DB; UI doesn't show "Start from FINTECH KYC template" — wasted asset.
6. **No "invite teammate" flow.** Creating a second admin in the tenant is a manual user-create + role-assign path; no email invite.

---

## UX & i18n Quality

**Bilingual coverage:** `en.json` and `tr.json` are both 1956 lines, key counts
matched (Audit 2026-04-28 found 23 missing `biometricPuzzle.puzzles.*.hint`
keys in TR — recently filled). On the surface this is one of the better
bilingual apps in the Turkish SaaS ecosystem.

**Concrete UX/i18n issues with file citations:**

1. **`RegisterPage.tsx:314,317,347,358,373,379,426,435,445`** — at least nine
   hardcoded English strings ("Create Account", "Check your email", "Verify
   Email", "Skip for now — Go to Sign In", "Registration form") on the
   single most trust-critical page. This is a regression: every other recent
   page properly uses `t()`.
2. **`RegisterPage.tsx:46-58`** — Zod validation messages are hardcoded English
   ("Email is required", "Password must contain uppercase letter"); these
   bypass `t()` because they fire in the `zodResolver` before render.
   Pattern fix: use `z.string().min(1, { message: t('register.emailRequired') })`
   inside `useMemo`.
3. **`AuditLogsPage.tsx:165`** — `{error.message}` rendered raw (Audit
   2026-04-28 BASIC #5). Backend exception text leaks to end-users.
4. **`TotpEnrollment.tsx:165`** — `window.confirm('Are you sure you want to
   disable TOTP?')` — hardcoded English in a destructive confirm. Mobile
   browser dialogs can't even be styled, so this is doubly bad.
5. **`App.tsx:14-46`** — `PAGE_TITLES` is a static English `Record` for
   `document.title`. Browser tab title stays English even with `?lng=tr`.
   Audit 2026-04-28 BASIC #3.
6. **`landing-website/src/App.tsx`** — landing page is **English-only**. No
   Turkish landing page despite the entire app being Turkish-first
   (`marun.edu.tr`, KVKK). Buyers from a Turkish enterprise hit
   `fivucsas.com` and see "Marmara University - Engineering Project" in
   English with `framer-motion` animations.
7. **Mobile responsiveness** — `LoginPage.tsx` uses `xs/sm` breakpoints
   correctly; `MyProfilePage.tsx` is `Grid container` — passes a basic
   eyeball test. But `BiometricPuzzlesPage.tsx` and `FaceDemoPage.tsx`
   require landscape camera + 478-point overlay; on 360px screens these
   degrade visibly.
8. **Accessibility** — LoginPage has `aria-label` on form, `role="alert"` on
   errors. RegisterPage has hardcoded English `aria-label="Registration
   form"`. No `<main>` landmark inspection done; no skip-to-content link
   evident in `DashboardLayout.tsx`. Color contrast: gradient buttons
   `#6366f1 → #8b5cf6` on white pass WCAG AA but not AAA.
9. **Copy consistency** — "Auth Flow" vs "Verification Flow" used
   interchangeably (sidebar `/auth-flows` and `/verification-flows` both
   exist). End-user has no idea which is which.
10. **`LoginPage.tsx:854`** — DEV-only credential hint says
    `admin@fivucsas.local / Test@123`. While Vite tree-shakes it (Audit
    confirmed), the existence of this in source signals "this is still a
    student project" to anyone code-reviewing the repo.

---

## Compliance & Trust Posture (product angle)

**KVKK / GDPR readiness — product UX lens, not crypto:**

| Right | UX surface | Verdict |
|---|---|---|
| Right to be informed (consent at signup) | None on `RegisterPage.tsx` | **Failing.** No checkbox, no terms-link click event captured. A Turkish DPO would reject this in 30 seconds. |
| Right of access (data export) | `MyProfilePage` "Export My Data" button | **Passing.** JSON download, rate-limited, localized copy `myProfile.kvkkText`. |
| Right to rectification | Profile edit (name, phone) | **Partial.** No "request correction" flow for biometric data — biometric vector cannot be edited, must be re-enrolled. |
| Right to erasure | Per-method delete + bulk biometric purge | **Partial.** No full account-delete UI; only biometric data. User must email support to actually leave. |
| Right to restriction | None | **Missing.** No "pause processing" toggle. |
| Right to portability | Same export endpoint | **Passing on letter, weak on spirit.** JSON is not a portable identity format — no JWT-VC, no W3C Verifiable Credential. |
| Right to object | None | **Missing.** |
| Automated decision-making transparency | None | **Missing.** Biometric matching is automated decision; no UX disclosure. |

**Trust signals the product needs but doesn't ship:**
- A `trust.fivucsas.com` or `/trust` page covering: ISO 27001 status (none),
  SOC2 status (none), pen-test reports (none), DPIA template, sub-processor
  list, GPG key for security disclosures.
- A clearly labeled `security.txt` (RFC 9116) at the root of every domain.
- A signed Data Processing Agreement (DPA) template downloadable by tenants.
- Public uptime / SLA claims on the landing page.

**What IS strong on compliance UX:**
- `PrivacyPage.tsx` and `TermsPage.tsx` exist, properly localized.
- Audit log is comprehensive; tenant admin can demonstrate "we logged this".
- Soft-delete with 30-day grace + dry-run preview before purge — a thoughtful
  GDPR Art. 17 implementation (`PurgeAdminController.java:34`).
- BIOMETRIC_DATA dropped from prod (V48) — minimization principle respected.

---

## Roadmap Reality Check

**Living roadmap docs reviewed:** `ROADMAP_2026-04-28.md`,
`MULTI_EMAIL_TENANT_DESIGN_2026-04-28.md`,
`CLIENT_APPS_PARITY_PLAN_2026-04-28.md`, four `AUDIT_2026-04-28_*.md`,
`AUDIT_2026-04-29_OPS_FOLLOWUP.md`.

**Strengths of the current roadmap:**
- **Brutally honest about state.** Section A (Verified Done) vs B (Stale
  claims) vs C (New bugs) is the right discipline.
- **Operator-only items clearly tagged** (DNS, Twilio).
- **Plan-only items respect approval gates** (multi-email A/B/C, APK).

**Gaps in the roadmap (product lens):**
1. **No revenue path.** Roadmap is 100% engineering — no pricing, billing,
   sign-up, customer success.
2. **No design / UX track.** Reads "fix bug, ship migration." No quarter for
   onboarding wizard, empty states, brand polish.
3. **R&D bleeds in.** Z-wave shipped 5 tracks plus a Face Demo — good, but
   the centroid is demoing capability, not shipping outcomes.
4. **No competitor analysis.** Doc never asks "what does Auth0 do here."
5. **Mobile dropped without replacement strategy.** iOS scope dropped (CLAUDE.md
   L11) — fine — but no PWA / partner / Android-only statement. Mobile gap.
6. **KYC half-roadmapped.** `WATCHLIST_CHECK`, `AGE_VERIFICATION`,
   `ADDRESS_PROOF` are seeded but not built and not in the roadmap to either
   ship or remove. Creates feature-shadow.

**What should be cut:** Web Components SDK (auth-react already serves modern
integrators); the 135 `Map.of`→record refactor; biometric-api memory tuning;
Recharts lazy-load — all are cosmetic.

**What should be added:** Self-serve sign-up with Stripe trial; tenant-branded
hosted login; onboarding wizard; trust center page; SAML or AD federation for
one enterprise design partner.

---

## Productization Gaps

To become a sellable SaaS, the product needs:

1. **Self-serve signup → tenant creation flow.** Today only super-admin can
   create tenants (`TenantFormPage.tsx:35`). Need: public `/signup` form →
   verify email → instantly own a new `tenants` row with the user as tenant
   admin.
2. **Pricing page + Stripe.** Landing has no `/pricing`. Tenants table has
   `subscription_plan` and `max_users` columns since V1 but nothing reads
   them. Need: 3-tier (Free / Pro / Enterprise), Stripe Checkout, webhook
   into `subscription_plan` updater, soft-cap enforcement on `max_users`.
3. **Multi-tenant isolation maturity.** RLS exists (V25) but I did not find
   `SET app.current_tenant_id = ...` evidence in the request filter — the
   actual enforcement may be only at the JPA query level. Worth a follow-up
   audit before claiming "SOC2 ready."
4. **Per-tenant branding.** Logo upload, primary-color picker, custom subdomain
   (`acme.fivucsas.com` instead of `verify.fivucsas.com?client_id=acme-...`).
5. **Customer-visible audit log + webhook configuration UI.** Tenants want to
   stream their auth events into their Splunk/Datadog. Webhook plumbing
   exists in biometric-processor; not exposed in admin UI.
6. **Sandbox mode.** Tenants need test API keys (`test_xxx`) that don't write
   to prod tables. None present.
7. **Status page.** Buyers ask. Cost: ~30 minutes for an UptimeRobot public
   page at `status.fivucsas.com`.
8. **Trust center / DPA.** Already discussed in Compliance section.
9. **Marketing site that sells.** Current landing
   (`landing-website/src/App.tsx`) is a portfolio piece. Needs: customer
   logos (or "trusted by Marmara University"), case studies, ROI numbers
   ("reduce login fraud by X%"), pricing CTA, demo-request form, testimonials,
   blog.
10. **Support tooling.** No `support@fivucsas.com` mailbox, no help desk
    (Intercom / Crisp / Freshdesk) embedded in app, no in-app help articles.
    `t('myProfile.supportEmail')` keys do exist but no live mailbox is
    documented.
11. **Onboarding email automation.** Welcome email after register exists
    (Email-OTP), but there is no Day-1 / Day-3 / Day-7 drip teaching the user
    how to enroll TOTP, set up biometrics, etc.
12. **First real reference customer.** Marmara University is the demo tenant;
    no signed pilot agreement evident in the repo. Without a logo on the
    landing, every other prospect asks "who else uses this?"

---

## Top 10 Product Recommendations

Ranked by ROI (impact / effort).

| # | Recommendation | Why | Effort | Impact |
|---|---|---|---|---|
| 1 | **Add KVKK + Terms consent checkboxes to `RegisterPage`** with a hard-block submit until ticked + audit-log the consent timestamp. | Largest single compliance gap. No Turkish enterprise procurement signs without it. | S (~3h) | High — unblocks every B2B sale. |
| 2 | **Localize `RegisterPage` and Zod validation messages.** Fix all 9 hardcoded English strings (`RegisterPage.tsx:46-58, 314-445`). Use `useMemo` to localize Zod schema. | The signup page is the single most-viewed UX surface. Turkish users see English exactly when trust matters most. | S (~2h) | High — measurable conversion lift on TR traffic. |
| 3 | **Translate `landing-website` to Turkish + add `/pricing`.** A landing page in English with a "Marmara University Engineering Project" badge sells nothing. Replace with a Turkish-first hero, customer-logo bar (even if only Marmara), 3-tier pricing card, "Demo İste" CTA. | Marketing is the bottleneck, not engineering. | M (~2 days) | Very high — unlocks inbound. |
| 4 | **Self-serve tenant signup flow.** Public `/signup` → email verify → tenant created with that user as admin → redirect to onboarding wizard. Wire `tenant_email_domains` so the user automatically gets a `slug.fivucsas.com` namespace. | Without this, growth ceiling is "people Ahmet meets in person". | M (~5 days) | Very high — turns the product into a SaaS. |
| 5 | **Strip "Marmara University Engineering Project" branding from buyer-facing surfaces.** Keep it in `README.md` and a single `/about` page; remove from landing hero, footer, register page. | Capstone branding kills enterprise procurement. | S (~1h) | High — perception shift. |
| 6 | **Onboarding wizard for new tenant admin.** First-run checklist on `DashboardPage`: (1) Create OAuth client, (2) Configure auth flow, (3) Invite teammate, (4) Test login on demo page. Show progress 0/4 → 4/4. | Tenant admins land on an empty dashboard and bounce. A 4-step checklist halves time-to-first-integration. | M (~3 days) | High. |
| 7 | **Tenant-branded hosted login.** Add `tenants.logo_url` + `tenants.primary_color` columns; render them on `HostedLoginApp.tsx` instead of FIVUCSAS branding when an OAuth client is tenant-bound. | Currently every tenant's user thinks they're logging into FIVUCSAS, not their own brand. Prevents adoption by banks/universities who guard brand. | M (~2 days) | High. |
| 8 | **Account recovery flow ("I lost my device").** Today `/forgot-password` works for password reset; there is no recovery for "I lost my TOTP / WebAuthn / phone." Add: 8 backup codes generated at TOTP enroll, email-based recovery with cooldown, support-contact fallback. | Without it, every device-lost user is permanently locked out and must email support. Single biggest churn driver in identity products. | M (~3 days) | Very high. |
| 9 | **Decide and ship — or remove — the half-built KYC pipeline rows.** Either build flows for `WATCHLIST_CHECK`, `ADDRESS_PROOF`, `AGE_VERIFICATION`, `DATA_EXTRACT` (months of work + data partner) OR delete those rows from `auth_methods` so the product doesn't pretend to have features it lacks. | Feature-shadow is dangerous; a buyer demos and discovers gaps. Worse than not claiming the feature. | S (~2h to remove) or L (~6 weeks to ship) | Medium-high — credibility. |
| 10 | **Status page + `security.txt` + trust center.** Stand up `status.fivucsas.com` (UptimeRobot free), publish RFC 9116 `security.txt`, add a `/trust` page listing sub-processors (Hostinger, Hetzner, Twilio, Hostinger SMTP), DPIA, and incident-response contact. | Cheapest credibility purchase available. Every enterprise buyer asks. | S (~half day) | Medium-high — table-stakes for enterprise. |

---

## Closing note for the founder

The hardest work is done. The engineering — ten auth methods, OIDC, biometric
pipeline with passive liveness, multi-tenant data model, KVKK endpoints,
observability — is comparable to mid-stage seed-funded competitors. What's
missing is the packaging: a self-serve front door, a Turkish marketing site
that doesn't read as a school project, real consent UX, one anchor customer
logo. Recommendations 1–5 above move the product from "impressive capstone
with prod traffic" to "indie SaaS that can take inbound demo requests."
