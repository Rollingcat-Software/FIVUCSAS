# Multi-email / multi-tenant identity — design note (2026-04-28)

User question: "I have ahabgu@gmail.com → Fivucsas tenant. I should
also have ahmet.abdullah@marun.edu.tr → Marmara University tenant.
Same person, two emails, two tenants. Phone number could similarly
be a tenant-scoped login method. Think about this with the glsm
duplicate-row situation."

## What the schema supports today

`users.email` carries a partial unique index `idx_users_email_unique`
WHERE `deleted_at IS NULL`. Translation:

- The **same email** cannot be used by two ACTIVE users at the
  same time. It can be reused after the previous owner is
  soft-deleted.
- A **person** with **two distinct emails** can absolutely have two
  active user rows in two different tenants today. The system
  treats them as two different users; they are unrelated by any
  schema link.

The `tenant_email_domains` table (V44) already routes registration
by email domain:

```
marmara-university   marmara.edu.tr
marmara-university   marun.edu.tr
anatolia-medical-center anatoliamed.com.tr
techcorp-istanbul    techcorp.com.tr
system               system.fivucsas.local
```

So `ahmet.abdullah@marun.edu.tr` registers automatically into
Marmara University tenant. `ahabgu@gmail.com` has no domain rule
→ manual tenant assignment to Fivucsas. Both work today as
separate user rows.

Combined with the new tenant-lock at OAuth login (commit 5446d57),
the right user automatically lands in the right tenant at the right
surface:
- demo.fivucsas.com (Marmara client) → only Marmara accounts
- app.fivucsas.com (system tenant client) → cross-tenant OK
- exam.marmara.edu.tr → only system-tenant accounts (current)
- per-tenant tenants get their own OAuth clients pinned to their
  tenant_id

## What the schema does NOT support today

1. **Account linking** — there's no link between Ahmet's two user
   rows. If Ahmet logs into one, the system doesn't know the other
   exists.
2. **Email aliases on a single user** — one row cannot list
   multiple emails. The `email` column is single-valued.
3. **Phone-number-as-login-identifier** — phone is just a profile
   field. SMS_OTP requires a phone but the auth flow looks up the
   user by email first.

## glsm.2212@gmail.com — what happened

She has two rows:

| user_id | tenant | created | deleted_at |
|---|---|---|---|
| `3086c8b3-…` | Marmara | 2026-03-24 | **2026-04-28 09:54** (soft-deleted) |
| `ff000003-…0002` | Fivucsas | 2026-04-28 | active |

This is the **email-reuse-after-soft-delete** path. The
`findByEmail` filter (today's morning fix) only returns the active
row, so this is no longer a 500 risk. But the soft-deleted row's
data — her old enrollments, audit log, etc. — still exists in
identity_core. If anyone hard-deletes the Marmara row, FK CASCADE
wipes it (per `feedback_no_hard_delete_users` lesson).

This is fine **as long as no one hard-deletes the soft-deleted
row**. The two rows are NOT linked; they represent the same human
under two separate organizational identities.

## Three architectural options for "one person, multiple tenants"

| Option | What changes | Effort | Trade-offs |
|---|---|---|---|
| **A. Status quo** | Nothing. Each tenant relationship is a separate user row. | 0 | Two distinct logins. No cross-tenant context switch. |
| **B. Identity + memberships** | New `identities` table (one row per real human, primary email + alternate emails). New `identity_tenant_memberships` (many-to-many). User row keeps tenant scope but `identity_id` FKs to identities. | ~1 week + UX. Migration of all existing users into identities. | True human-centric model. SSO-able. After login, user picks tenant context. WebAuthn / TOTP / face / voice / fingerprint can be **shared** across tenant memberships if desired (not required). |
| **C. Aliases on user row** | Add `users.alternate_emails JSONB` and a unique index across primary + alternates. Keep one row per tenant. | ~3 days. | Cheap, partially solves multi-email login (any address authenticates the same row). Doesn't solve cross-tenant context — still one tenant per user row. |

**My recommendation: Option B**, but only when there's a concrete
business need. Today (98% complete capstone) Option A works:
register `ahmet.abdullah@marun.edu.tr` as a separate user, log in
with whichever email matches the surface you're on. The
tenant-lock change shipped today already enforces "right account at
right surface."

If/when you want to ship B:
1. Add `identities` + `identity_tenant_memberships` migration.
2. Backfill: every existing user becomes one identity with one
   membership.
3. Login flow: authenticate against any email on the identity, then
   show a tenant-picker if the identity has >1 active membership.
4. Move biometric enrollments (face, voice, fingerprint, TOTP
   secret, WebAuthn credentials) to identity-level so they work
   across tenant memberships. NFC card stays per-tenant if it's
   org-issued.
5. Audit logs already keep both tenant_id and user_id — keep that.
6. JWT carries `identity_id` + `tenant_id`; tenant_id is the
   active-context selector.

## Phone-as-login-method (the user's "tel no might be tenant-related" idea)

`SMS_OTP` already works as a login method, but it's a SECOND
factor — the user identifies by email first. If the user wants
phone as a PRIMARY identifier:

1. Add `users.phone_number` unique index per tenant (right now it's
   unique globally, length 20).
2. Add a `/auth/login-by-phone` endpoint that does:
   - `findByPhoneNumber(phone, tenantHint)`
   - send SMS code
   - verify code → issue session
3. Tenant scoping: phone numbers can collide across tenants
   (different orgs may know the same person). Either keep a global
   unique constraint (simpler, but breaks if two tenants have the
   same person) OR scope uniqueness per tenant (correct, but
   requires a tenant-hint at login time — like demo.fivucsas.com
   already does via the OAuth client tenant binding).

**My recommendation:** add phone-as-login only if there's demand.
The 10 auth methods FIVUCSAS already ships cover the same use
cases. Fold it into Option B if/when that lands — at that point
phone becomes another identifier on the identity row, naturally
cross-tenant.

## What I am shipping right now (2026-04-28)

- ✅ V42 TOTP encrypted-at-rest CHECK constraint
- ✅ OAuth tenant-lock (issue 1 — demo.fivucsas refuses
  cross-tenant logins)
- ✅ TOTP / Users-list-lastLogin / 10-method flow fixes (round 2)
- 📄 This design note (option A is current state, B is the future,
  C is a quick-but-incomplete halfway)

## What I am NOT shipping (architectural — needs your sign-off)

- Option B (identities + memberships) — week-long change, needs UX
  decisions on tenant picker.
- Phone-as-primary-login — needs business sign-off on collision
  handling.
- Account merging tool — only useful after B.
