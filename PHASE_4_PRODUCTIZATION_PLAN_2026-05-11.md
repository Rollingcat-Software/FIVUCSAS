# Phase 4 Productization Plan — Stripe + amispoof.com + Sequencing

**Date:** 2026-05-11
**Author:** Claude (Opus 4.7) on behalf of Ahmet
**Status:** Planning document. **No code is changed by this PR.** Approval required before any Phase 4.3 scaffolding starts.
**Supersedes nothing.** Consolidates: `docs/plans/BAAS_RENTAL_MODEL.md` (pricing), `docs/plans/BYOD_ARCHITECTURE.md` (sequencing tail), `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` (amispoof decision), `infra/OPERATOR_HANDOFF_2026-05-11.md` §4 + §7 (operator-blocked items), `ROADMAP.md` (long-running queue).

---

## 1. Where we are

### Production state (verified today, 2026-05-11)

| Surface | Status |
|---|---|
| Identity Core API | `api.fivucsas.com` — image `179d34a5` rebuilt today, healthy. V60 applied. JWT RS256 default. Refresh tokens hashed-only. Branch protection on `main` + `master`. |
| Biometric Processor | Internal only — image `75347c98` rebuilt today, healthy. Facenet512 + UniFace passive liveness + anti-spoof verdict + Fernet embedding encryption all live. |
| Web Dashboard | `app.fivucsas.com` — current bundle, theme refresh shipped. |
| Auth Widget | `verify.fivucsas.com` — hosted-first OIDC primary path live. |
| Landing | `fivucsas.com` — static, Hostinger. **Has no /pricing page and no signup CTA.** |
| BYS Demo | `demo.fivucsas.com` — works against shared tenant. |
| Status Page | `status.fivucsas.com` — Uptime-Kuma, public. **Not yet wired to Stripe status.** |
| Observability | Loki + Promtail + Grafana, ops-email alerting. |
| CI/CD | All four submodules GREEN. Branch protection enforced (1-review + admin bypass + force-push blocked). |
| Compliance | KVKK/GDPR data export + soft-delete + purge default-on. DPIAs drafted. |
| Tests | ~1,900+ across four modules. |
| Migrations | V60 latest on `main`. **V61 is the next available slot.** |

### The gating step for "open self-serve signup"

Today, becoming a tenant requires an operator to provision a tenant row + admin user. The product is technically ready to take paying customers but cannot **collect payment** and cannot **gate features by plan**. That is Phase 4.

Phase 4 = **"a stranger on the internet can click Sign Up → enter payment → become a billed tenant → log into the dashboard, end-to-end, without operator intervention."**

Three things must be true to flip the switch:

1. **Stripe is connected.** Account, products, webhooks, customer-portal — all live.
2. **The tenant lifecycle is plan-aware.** `tenants` table knows about subscription state. Feature gates respect the plan. Suspended-tenant gate (already shipped in PR #ICA-2026-05-07) extends naturally to "payment failed → suspend."
3. **The marketing surface has a pricing page and a "Sign up" CTA that lands on Stripe Checkout.** Landing-website addition.

Nothing else (BYOD, amispoof.com, paper publication) is part of Phase 4. They are explicitly Phase 4+ items in `ROADMAP.md` and stay there.

---

## 2. Stripe integration plan

The integration is broken into five sequential phases. Operator owns 4.1; agent owns 4.2 + 4.3 + 4.5; both share 4.4 (live mode soak).

### Phase 4.1 — Account setup (operator-only, ~1 day)

**Owner:** Ahmet. Cannot be done from a Claude session — KYC requires personal identity documents.

**Steps:**

1. Stripe Dashboard → create account. Business country = Turkey, business type = sole proprietor or limited company per your registration.
2. Complete business verification: TC Kimlik or vergi levhası, IBAN for payouts, business address.
3. Stripe Dashboard → Developers → API keys → capture both `pk_test_…` (publishable, web-app), `sk_test_…` (secret, identity-core-api), `whsec_…` (webhook signing secret, identity-core-api). Store in 1Password.
4. Stripe Dashboard → Products → create three products mirroring BAAS_RENTAL_MODEL §2:
   - `prod_fivucsas_free` — recurring, $0/month, 100 calls limit (we enforce, not Stripe).
   - `prod_fivucsas_developer` — recurring, $29/month, 10 000 calls included.
   - `prod_fivucsas_enterprise` — manual sales, no Stripe product (handled via invoicing).
5. Stripe Dashboard → Customer portal → enable. Configure: customers can update payment method, cancel subscription, view invoices. **Disable** "switch plan" until we have plan-change webhooks tested.
6. Stripe Dashboard → Tax → enable Stripe Tax (Turkey KDV applies for TR customers).
7. Email `dkim`-signed Ahmet's `rollingcat.help@gmail.com` summary of: account ID, product IDs, price IDs. Drop into 1Password vault `fivucsas-stripe`.

**Acceptance:** Three Stripe products visible in dashboard; test keys captured; portal enabled. **No code change yet.**

**Estimate:** 1 calendar day (most time is KYC review wait — start early).

### Phase 4.2 — Pricing model (already decided)

**Recommendation: adopt BAAS_RENTAL_MODEL.md §2 verbatim for v1. Iterate after first 10 paying tenants give us real price-elasticity data.**

The pricing in BAAS_RENTAL_MODEL.md (Free $0 / Developer $29 / Enterprise custom) was drafted 2026-04-05 against a competitor analysis (AWS Rekognition / Azure Face / Auth0 / Onfido) that hasn't materially moved. The model is defensible. Reasons not to redraft now:

1. **Sunk decision cost.** The plan is internally consistent (per-call cost ≤ per-call list price for all features). Re-deriving wastes a week.
2. **We need data, not theory.** Three months of real billing tells us more than another iteration on the spreadsheet.
3. **Stripe can rev pricing in 5 minutes.** Changing a price doesn't require code changes if we use `lookup_key` resolution, not hard-coded `price_id`.

**Soft adjustments for v1 (defer to Phase 4.3 implementation, no business decision needed):**

- Use Stripe `lookup_key` (`fivucsas_developer_monthly_v1`) not raw `price_id` in code. Renaming a price → bump suffix to `_v2`.
- Mark every customer with a `metadata.tenant_id`, every subscription with `metadata.tenant_id` — makes webhook routing trivial.
- Single currency for v1: USD. TRY localization deferred until first 5 TR-paying tenants.

### Phase 4.3 — Code scaffolding (agent-actionable, ~3–5 days, **awaits approval**)

This is the chunk Claude can ship once operator finishes Phase 4.1. Below is structured DX-first — the tenant integrator experience comes first; backend internals serve that experience.

#### 4.3.a Tenant / integrator experience (the "why")

A new visitor on `fivucsas.com`:

```
fivucsas.com/pricing            <- new page; copies BAAS_RENTAL_MODEL §2
   ↓ click "Start Developer plan"
verify.fivucsas.com/signup      <- new flow (extends existing OIDC signup)
   ↓ create tenant + admin email
app.fivucsas.com/onboarding/payment
   ↓ Stripe Checkout (hosted) -- one redirect
back to app.fivucsas.com/dashboard?welcome=true
```

After signup, in dashboard:

```
Admin → Settings → Billing            <- new page
   • Current plan: Developer ($29/mo)
   • Next invoice: 2026-06-11 — $29.00
   • [Manage payment / cancel]        <- redirects to Stripe customer portal
   • Usage this period: 4 213 / 10 000 API calls
   • [Upgrade to Enterprise]          <- mailto: sales (manual)
```

For an integrator using the API:

```
401 Payment Required
{
  "error": "subscription_inactive",
  "tenant_id": "tnt_abc",
  "message": "Subscription suspended — payment failed 2026-06-12. Pay invoice at <portal_url> to reactivate.",
  "portal_url": "https://billing.stripe.com/p/session/cs_..."
}
```

That last contract matters — if a payment fails, the tenant's API stops working with a clear-error 402, not silent 500.

#### 4.3.b Spring Boot changes (identity-core-api)

```
identity-core-api/src/main/java/com/fivucsas/identity/
├── domain/billing/                              # NEW
│   ├── Subscription.java                        # Value object
│   ├── SubscriptionStatus.java                  # enum: ACTIVE, PAST_DUE, CANCELED, SUSPENDED, TRIAL
│   ├── PlanTier.java                            # enum: FREE, DEVELOPER, ENTERPRISE
│   └── port/
│       ├── StripeService.java                   # outbound port (hexagonal)
│       └── BillingEventPort.java                # inbound port for webhook events
├── application/billing/                         # NEW
│   ├── CheckoutSessionUseCase.java              # create Stripe Checkout for new signup
│   ├── BillingPortalUseCase.java                # create customer portal session
│   ├── HandleSubscriptionEventUseCase.java      # update tenant on webhook
│   └── EnforceSubscriptionGateUseCase.java      # called from filter chain
└── infrastructure/billing/                      # NEW
    ├── StripeAdapter.java                       # uses stripe-java SDK
    ├── WebhookController.java                   # POST /api/v1/billing/stripe/webhook
    ├── BillingController.java                   # POST /api/v1/billing/checkout-session, /portal-session
    └── SubscriptionFilter.java                  # 402 if subscription_status NOT IN (ACTIVE, TRIAL)
```

Webhook contract — these are the only event types we care about for v1:

| Stripe event | Action |
|---|---|
| `checkout.session.completed` | Create / activate `tenants.stripe_subscription_id`. Provision admin user. Send welcome email. |
| `customer.subscription.updated` | Sync `subscription_status` + `plan_tier`. |
| `customer.subscription.deleted` | Set `subscription_status = CANCELED`. Tenant data retained per soft-delete purge schedule. |
| `invoice.payment_failed` | Set `subscription_status = PAST_DUE`. Email tenant admin. After 3 attempts (Stripe's default 21-day dunning): `subscription_status = SUSPENDED`. |
| `invoice.payment_succeeded` | If transitioning from `PAST_DUE` → `ACTIVE`, log to audit_logs + email tenant. |

Everything else is logged and ignored (defensive — Stripe adds event types over time).

**Idempotency:** every webhook handler dedupes on `event.id` against a new table `stripe_webhook_events (event_id PK, received_at, processed_at, payload JSONB)`. Replay-safe.

**Signature verification:** `stripe-java`'s `Webhook.constructEvent(payload, sigHeader, whsec)` — mandatory, no exceptions. Test coverage must include malformed-signature → 400.

**Dependency add (pom.xml):**

```xml
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>27.0.0</version>     <!-- as of 2026-05; pin and let Dependabot bump -->
</dependency>
```

#### 4.3.c Database migration V61

```sql
-- V61__add_tenant_stripe_columns.sql
ALTER TABLE tenants
  ADD COLUMN stripe_customer_id     VARCHAR(64),
  ADD COLUMN stripe_subscription_id VARCHAR(64),
  ADD COLUMN subscription_status    VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN plan_tier              VARCHAR(20) NOT NULL DEFAULT 'FREE',
  ADD COLUMN subscription_started_at TIMESTAMP,
  ADD COLUMN subscription_period_end TIMESTAMP;

CREATE UNIQUE INDEX idx_tenants_stripe_customer_id
  ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX idx_tenants_subscription_status
  ON tenants(subscription_status)
  WHERE subscription_status IN ('PAST_DUE', 'SUSPENDED');

-- Idempotency table for webhook replay safety
CREATE TABLE stripe_webhook_events (
  event_id      VARCHAR(64) PRIMARY KEY,
  event_type    VARCHAR(64) NOT NULL,
  received_at   TIMESTAMP   NOT NULL DEFAULT now(),
  processed_at  TIMESTAMP,
  payload       JSONB       NOT NULL
);

CREATE INDEX idx_stripe_events_received_at ON stripe_webhook_events (received_at);
```

V61 is the next free slot — V60 was applied to prod today; double-checked against `identity-core-api/src/main/resources/db/migration/`.

**No data backfill needed.** Existing tenants stay at `subscription_status='TRIAL'` until they self-upgrade or operator manually changes them to `ENTERPRISE`. Suspended-tenant gate from PR #ICA-2026-05-07 transparently handles `SUSPENDED`.

#### 4.3.d Frontend changes (web-app)

```
web-app/src/
├── features/billing/                            # NEW
│   ├── hooks/
│   │   ├── useStripeCheckout.ts                 # POST /billing/checkout-session, redirect
│   │   ├── useBillingPortal.ts                  # POST /billing/portal-session, redirect
│   │   └── useSubscriptionStatus.ts             # GET /tenants/me/subscription
│   ├── components/
│   │   ├── PlanSelector.tsx                     # 3-card pricing display
│   │   ├── BillingStatusBanner.tsx              # PAST_DUE / SUSPENDED warning bar
│   │   └── UsageMeter.tsx                       # API calls progress bar
│   └── pages/
│       ├── PricingPage.tsx                      # rendered on landing-website iframe? OR own page
│       └── BillingSettingsPage.tsx              # Admin → Settings → Billing
└── i18n/locales/{en,tr}.json
    └── stripe: { plans: {...}, status: {...}, errors: {...} }   # ALL strings via t()
```

`@stripe/stripe-js` (3 kB) loaded lazily. `loadStripe(publishableKey)` only on PricingPage / BillingSettingsPage mount, not in main bundle.

**i18n keys — sample (full set defined at PR time):**

```json
{
  "stripe": {
    "plans": {
      "free": { "name": "Free", "cta": "Get started — no card" },
      "developer": { "name": "Developer", "cta": "Subscribe — $29/month" },
      "enterprise": { "name": "Enterprise", "cta": "Contact sales" }
    },
    "status": {
      "trial": "Trial — upgrade anytime",
      "active": "Active",
      "past_due": "Payment failed — update card",
      "suspended": "Suspended — pay invoice to reactivate"
    },
    "errors": {
      "checkout_failed": "We could not start checkout. Please try again.",
      "subscription_inactive": "Your subscription is inactive. Please update billing."
    }
  }
}
```

Per `feedback_no_hardcode.md` — every label routed through `t('stripe.plans.developer.cta')`. No English strings in `.tsx`.

#### 4.3.e Tests required at PR time

| Test | Module | Type |
|---|---|---|
| Webhook signature verify (valid → 200; tampered → 400; missing → 400) | identity-core-api | Unit + Integration |
| Idempotent webhook replay (same event.id twice → second is no-op) | identity-core-api | Integration |
| `checkout.session.completed` → tenant provisioned + subscription_status=ACTIVE | identity-core-api | Integration |
| `invoice.payment_failed` → subscription_status=PAST_DUE | identity-core-api | Unit |
| `customer.subscription.deleted` → subscription_status=CANCELED, tenant.deleted_at NULL (soft-delete purge owns that) | identity-core-api | Unit |
| SubscriptionFilter → 402 when SUSPENDED, 200 when ACTIVE/TRIAL | identity-core-api | Integration |
| PlanSelector renders three tiers from i18n keys | web-app | Vitest |
| useStripeCheckout calls Stripe with `lookup_key`, not raw `price_id` | web-app | Vitest |
| Pricing page Playwright E2E: click Developer → lands on Stripe Checkout test mode | web-app | Playwright |

**Coverage target:** the billing module must hit 90%+ line + branch coverage at merge (matches existing `application/` standard).

**Estimate:** 3–5 days agent time, single PR per submodule (api + web-app) gated by Phase 4.1 completion.

### Phase 4.4 — Test mode → Live cutover (~1 week soak)

Operator + agent together.

1. Deploy identity-core-api with `STRIPE_KEYS=test`. Run Phase 4.3 PRs.
2. Run through Stripe test cards (4242 4242 4242 4242 = success, 4000 0000 0000 0341 = card declined). Verify webhook → DB state transitions for all 5 event types listed in 4.3.b.
3. Confirm SubscriptionFilter 402-response contract on a SUSPENDED tenant.
4. Flip Stripe keys to `live`. Restart api container. Smoke-test with a real card (Ahmet's). Refund yourself once verified.
5. **Soak:** first 10 production subscriptions are reviewed manually within 24 h. Watch Loki for any webhook-processing exception. Watch audit_logs for plan-mismatch events. If clean → declare GA.

**Estimate:** 1 calendar week (most time is soak — actual work is hours).

**Rollback plan:** Stripe keys → test mode (one env-var change + container restart), web-app PricingPage feature-flag `BILLING_LIVE=false` → falls back to "Contact sales" mailto. No DB rollback needed; existing tenants keep `subscription_status='TRIAL'`.

### Phase 4.5 — Status page integration (~1 day agent)

Wire Stripe → `status.fivucsas.com` (Uptime-Kuma).

1. Uptime-Kuma monitor: HTTPS check on `api.fivucsas.com/api/v1/billing/health` — new endpoint that does `stripe.Balance.retrieve()` to confirm Stripe API connectivity.
2. Uptime-Kuma monitor: webhook delivery health — query `stripe_webhook_events` for "any event in last 24 h" (if zero, alert: webhooks not being delivered).
3. Display two new tiles on `status.fivucsas.com`: "Payment Processing" + "Webhook Delivery."

**Estimate:** 1 day agent.

### Phase totals

| Phase | Owner | Effort | Calendar |
|---|---|---|---|
| 4.1 Account setup | Operator | 1 day | Week 1 |
| 4.2 Pricing decision | (done) | 0 days | — |
| 4.3 Code scaffolding | Agent | 3–5 days | Week 1–2, awaits 4.1 |
| 4.4 Test→Live soak | Both | 1 week | Week 2–3 |
| 4.5 Status page | Agent | 1 day | Week 3 |
| **Total** | | **~3 weeks calendar** | **First paying tenant week 3** |

---

## 3. amispoof.com decision

**Recommendation: defer per `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` Option B.**

### Why defer

That research memo (worth re-reading) lays out three options:

- A) Build amispoof.com + extract proctoring submodule simultaneously.
- **B) Extract proctoring submodule, defer amispoof.com to Phase 4+.**
- C) Don't extract — fold proctoring permanently into biometric-processor. *(Ruled out.)*

Option B is still the right answer five months later for three reasons:

1. **spoof-detector standalone repo is its own canonical demo.** The recently-shipped paper push (Session 2026-05-11 Track 5) gave that repo its own README, results page, and RUNBOOK_PAPER_PREP.md. Anyone evaluating our anti-spoof can clone the repo and reproduce the benchmarks. A separate demo site re-explaining the same thing has marginal value before there's a paper to point at.
2. **Paper-push has higher leverage right now.** A BIOSIG / IJCB-accepted paper is durable, citable, and is what enterprise procurement teams ask for. A viral demo site without a paper behind it is brittle marketing.
3. **The Phase 4 plumbing is the actual blocker.** Until we can take payment, all the viral traffic in the world goes nowhere. amispoof.com without a `fivucsas.com/pricing` page that converts is a one-night-only trick.

### If you change your mind — short path

Total agent time: **~1 day**, conditional on operator buying the domain.

1. Operator: register `amispoof.com` at Cloudflare Registrar (~$10/yr).
2. Operator: add to Hostinger DNS pointing at static-site IP.
3. Agent: new `amispoof-website/` submodule. Single Vite-built page embedding `verify-widget` in spoof-mode (`?mode=spoof-detector-demo`). The widget already exists at `verify.fivucsas.com`; spoof-mode = pre-baked iframe with three attack-type illustrations (printed photo, screen replay, mask) clickable for live demo.
4. Agent: GitHub Actions deploy on push (same pattern as `landing-website`).
5. Agent: footer link → `fivucsas.com` so the demo drives traffic back to the product.

**Out of scope for the 1-day version:** consent banner UX, DPIA, donation-of-clips research pipeline, AR-filter detector, server-side spoof-classify endpoint. Those would require Phase 5+ per the original memo and would not ship in a 1-day pass.

**Soft recommendation:** wait until paper draft is at submission-ready (`spoof-detector/RUNBOOK_PAPER_PREP.md` exit criteria). Then build amispoof.com **as a paper-companion site**, not a standalone marketing demo. Better leverage; demos sites attached to papers convert academic readers into evaluators.

---

## 4. BYOD architecture sequencing

Per `docs/plans/BYOD_ARCHITECTURE.md` §9, BYOD is an 8-week scope:

- Week 1–3: Foundation (DataSource routing, HikariCP per-tenant pools, credential encryption).
- Week 4–5: Repository refactor + biometric-processor proxy.
- Week 6–7: Migration engine (shared-DB → tenant-DB cutover).
- Week 8: Hardening + docs.

**Sequencing rule: do NOT start BYOD until BOTH:**

1. **Phase 4.4 complete** (first 10 paying tenants soaked successfully). Otherwise we're building on-prem deployment tooling for a SaaS that hasn't proven self-serve product/market fit.
2. **First enterprise lead asks for it.** BYOD is an enterprise upsell (`BYOD_ARCHITECTURE.md` §2 quotes 3–5× price multiplier). It is not speculative — a real customer's RFP triggers the work. Don't pre-build.

That puts BYOD at **earliest Phase 6**, mid-2026 if Phase 4 ships on the 3-week calendar above. `ROADMAP.md` "Long-running scheduled" already books this correctly; no change needed.

**One small thing to do now for free:** when Phase 4.3 adds `tenants.subscription_status`, also add a placeholder `tenants.byod_enabled BOOLEAN DEFAULT FALSE` and `tenants.byod_datasource_config JSONB` columns. Empty until BYOD ships, but reserving the slot prevents a future schema-merge collision when two PRs touch `tenants` simultaneously. (Optional — flag for V61 reviewer.)

---

## 5. Trigger criteria for starting Phase 4

Phase 4 starts when **all three columns** are green:

### Operator-side prerequisites

- [ ] Stripe account active + KYC verified (TC Kimlik / vergi levhası uploaded, IBAN linked).
- [ ] Three Stripe products + prices created (Free / Developer / Enterprise-manual).
- [ ] Test + live + webhook keys captured in 1Password vault `fivucsas-stripe`.
- [ ] **At least one warm tenant lead in the pipeline** (someone has said "yes I'd pay $29/month for this"). Otherwise we're shipping a checkout flow into a vacuum.

### Code-side prerequisites

- [x] Zero P0 open on `main` across all four submodules. (Verified 2026-05-11 — INVESTIGATION 2026-05-07 P1 residue closed.)
- [x] Zero P1 open on `main`. (Verified 2026-05-11.)
- [x] Branch protection on `main` + `master`. (Verified 2026-05-11.)
- [x] V60 applied + Flyway repair complete + `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` enforced. (Verified 2026-05-11.)
- [x] Embedding encryption-at-rest live (PR #65). (Verified 2026-05-07.)
- [x] Refresh-token plaintext column dropped (V60). (Verified 2026-05-11.)
- [x] Soft-delete purge default-on. (Verified 2026-05-11.)

### Process-side prerequisites

- [ ] Phase 4.3 PR drafted in agent worktree (api + web-app + V61) ready to merge within 2 days of Phase 4.1 completion.
- [ ] DPIA addendum for billing data (KVKK Article 6 — contract basis for processing payment data — not Article 9 — biometric is separate). 1 page; updates `infra/DPIA.md`.
- [ ] Stripe-specific incident-response playbook in `infra/RUNBOOK_STRIPE.md` (handle webhook outage, key rotation, refund procedure).

**Hard-blocker check (the only items that must be done first, no exceptions):**

- Stripe account active.
- DPIA addendum.

**Soft-recommendations (nice-to-have but don't gate):**

- Warm tenant lead — without one, we still ship but plan for slower revenue ramp.
- BYOD schema placeholder columns in V61.
- Status-page tiles can land after live cutover, not before.

---

## 6. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| KVKK/GDPR billing data exposure | Low | High | DPIA addendum (item in §5). Stripe is processor-only — we never see card numbers. Audit log on every webhook event (`audit_logs` already partitioned). |
| Chargeback / friendly fraud | Medium | Medium | Stripe Radar enabled (default). Tier-1 manual review for first 10 subscriptions (Phase 4.4 soak). Refund SLA: 5 business days. |
| Tenant onboarding bottleneck | Low | Medium | Already partially mitigated by `docs/tenant-onboarding.md` from PR #13 (Session 2026-05-11). Self-serve flow inherits the same playbook. |
| Pricing-model assumptions wrong | Medium | Low | Stripe `lookup_key` resolution lets us rev prices without code deploy. Plan: test elasticity in first 10 paid deals (target conversion ≥ 5% pricing-page → subscription). |
| Webhook signing secret leak | Low | High | Secret in env-var only, never committed. Rotate quarterly (calendar reminder). Webhook handler dedupes on `event.id` → replay-safe even on partial leak. |
| Stripe outage during cutover | Low | Medium | All billing endpoints non-blocking for auth path. Suspension is a flag, not a hard-fail. Tenant can keep using paid services for up to 21 days (Stripe's dunning window) before SUSPENDED status fires. |
| `tenants.subscription_status` drift vs Stripe | Medium | Medium | Daily reconcile job: cron-style `SELECT stripe_subscription_id FROM tenants` → fetch from Stripe → diff. Surface drift to ops via Loki alert. Phase 4.5 work. |
| Tenant churns + soft-delete grace | Low | Low | Existing soft-delete purge (default 30 days post-cancel) handles. `customer.subscription.deleted` webhook sets `deleted_at=NULL` — that's intentional; cancellation is not deletion. |
| TR KDV calculation wrong | Medium | Medium | Stripe Tax enabled (Phase 4.1 step 6) — Stripe owns the math. If wrong, Stripe issues correction; we don't owe tax authority directly. |
| First-week edge cases blow up | High | Low | Soak window is exactly for this. Watch Loki + audit_logs. Expect ≥3 fixes in first week of live mode. Plan a buffer day for them. |

No risk on this list is a hard-blocker. All have mitigations. The combined risk profile is **acceptable to ship at Phase 4.3 PR readiness**.

---

## 7. Operator action items checklist

These are the items only Ahmet can do. Track in his issue tracker; this doc just lists them.

**Before Phase 4.3 dispatch:**

- [ ] Stripe → sign up + complete KYC (TC Kimlik or vergi levhası, IBAN). Estimated 1–3 days vendor review.
- [ ] Stripe Dashboard → API keys captured (`pk_test_…`, `sk_test_…`, `whsec_…`, plus the live counterparts when ready). Stored in 1Password vault `fivucsas-stripe`.
- [ ] Stripe Dashboard → three products created: Free / Developer / Enterprise-manual. Price IDs captured.
- [ ] Stripe Dashboard → Customer portal enabled (cancel + update payment method; **plan-switch disabled** in v1).
- [ ] Stripe Dashboard → Stripe Tax enabled for TR jurisdiction.
- [ ] Confirm pricing tiers vs `BAAS_RENTAL_MODEL.md §2` — confirm or note deltas. Adopt-as-is recommended.

**Trigger Phase 4.3:**

- [ ] Open issue on `Rollingcat-Software/FIVUCSAS` titled `Phase 4.3 — Stripe scaffolding (api + web-app + V61)`. Reference this doc. Tag the agent.

**During Phase 4.4 (live cutover week):**

- [ ] Run real-card purchase + refund cycle to verify live mode.
- [ ] Watch Stripe Dashboard for first 10 subscriptions.
- [ ] Approve declaring GA after the soak.

**Operator-side gate-keeping (not in 4.3 path, can run in parallel):**

- [ ] DPIA addendum for billing data — `infra/DPIA.md` patch. ~30 min.
- [ ] Decide on amispoof.com — defer (recommended) or buy now. Either way, close the open question.

---

## 8. Out of scope for Phase 4

Explicitly listed to prevent scope creep:

- BYOD architecture (Phase 6+, conditional on enterprise lead).
- amispoof.com build (Phase 5+, conditional on paper draft).
- BaaS SDKs (npm, Maven, CocoaPods, PyPI) — `BAAS_RENTAL_MODEL.md §7`. Phase 5.
- API gateway middleware (per-key rate limits, feature isolation, usage metering at the gateway tier) — `BAAS_RENTAL_MODEL.md §4`. Phase 5.
- Iyzico (Turkish local payment) integration. Phase 5+ — Stripe accepts TR cards in v1.
- Multi-region deployment (Hetzner EU + US East). Phase 6+.
- iBeta PAD-Level-1 submission (operator track, parallel to Phase 4 — see `OPERATOR_HANDOFF_2026-05-11.md §5`).

---

## 9. Decision the user needs to make

**Today's ask:** approve or reject this plan.

If approved:

1. Operator starts Phase 4.1 (Stripe KYC) — at your pace; this is mostly waiting.
2. When 4.1 is done, **operator opens an issue** on `Rollingcat-Software/FIVUCSAS` titled `Phase 4.3 dispatch — Stripe scaffolding`. That issue is the trigger to start agent work.
3. Agent ships 4.3 in 3–5 days as a single PR-set (api + web-app + V61).
4. Agent + operator soak 4.4 over 1 week.
5. Agent ships 4.5 status-page tiles in 1 day.

**If rejected or modified:** comment on the PR for this doc. No code is changed regardless of decision — this is the planning artifact, not the implementation.

**Open question explicitly deferred to operator:** amispoof.com — defer (recommended in §3) or buy the domain now?

---

*This plan replaces nothing in the existing docs corpus; it consolidates Phase-4-scoped decisions across them. The source-of-truth docs remain authoritative for their domain (`BAAS_RENTAL_MODEL.md` for pricing detail; `BYOD_ARCHITECTURE.md` for BYOD detail; `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` for proctoring/amispoof reasoning).*
