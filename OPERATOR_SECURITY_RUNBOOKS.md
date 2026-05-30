# Operator-Gated Security Runbooks

**Audience:** the human operator (project owner) only.
**Scope:** actions that require credentials, external paid accounts, DNS/email-provider
consoles, or certificate submissions — i.e. things an AI agent or CI pipeline cannot
(and must not) execute. Each runbook below documents **why** it matters, the **exact
step-by-step**, how to **verify**, and **rollback**.

> **Location note:** the project's `docs/` directory is a git **submodule**
> (`Rollingcat-Software/docs`), so a parent-repo-tracked file cannot live under `docs/`
> without a second PR + pointer bump. This runbook therefore lives at the **parent repo
> root**, alongside the other operator-facing docs (`ROADMAP.md`, `PROJECT_STATUS_*.md`,
> `SECURITY.md`, and the `infra/RUNBOOK_*.md` set).

> These runbooks describe actions. They do **not** ship any secret values. Every
> `<PLACEHOLDER>` is something the operator fills in from their own console / vault.
> Never paste a real Auth Token, keystore password, or SMTP password into a commit,
> a PR, an issue, or a chat transcript.

## Environment quick-reference (this project)

| Thing | Value |
|---|---|
| Production host | Hetzner CX43, `deploy` user, key-based SSH, all projects under `/opt/projects/` |
| API service | Spring Boot, `https://api.fivucsas.com`, port 8080 |
| API prod compose | `/opt/projects/fivucsas/identity-core-api/docker-compose.prod.yml` |
| API prod env file | `/opt/projects/fivucsas/identity-core-api/.env.prod` (**never committed**) |
| SMTP | `smtp.hostinger.com:587`, sender `info@fivucsas.com` |
| Hostinger SSH (static sites) | `ssh -p 65002 u349700627@46.202.158.52` |
| Email domain | `fivucsas.com` (mailbox hosted at Hostinger) |
| GitHub org | `Rollingcat-Software` (submodule repos: `client-apps`, `identity-core-api`, `spoof-detector`, …) |

**Golden rule on prod compose:** always pass `--env-file .env.prod`.
**Golden rule on git:** use bare `git push`.

### Related runbooks (cross-reference)

- `/opt/projects/infra/RUNBOOK_DISK.md` — disk-capacity defence layers; **check free space
  before any `docker compose build --no-cache`** (Runbook 2 rebuilds the API container).
- `/opt/projects/infra/RUNBOOK_AUDIT_LOG_PARTMAN.md` — pg_partman / audit_logs partition ops.
- `identity-core-api/docs/RUNBOOK_STAGING.md` — local staging stack (`127.0.0.1:18080`) for
  rehearsing API config changes (e.g. Runbook 2 OTP/SMTP and Runbook 4 JWT aud/iss) before prod.

---

## Runbook 1 — APK release signing keystore + 4 GitHub secrets

**Unblocks:** GitGuardian alert **#29836028** (the Android keystore password `fivucsas2026`
was committed to the public git history of `Rollingcat-Software/client-apps`, reachable via
commit `db18fa7` / tag `v3.0.0`). See `ROADMAP.md` C6 and `client-apps` `docs/SECURITY_INCIDENTS.md`.

### Why it matters

A leaked keystore password by itself is harmless **only if the leaked keystore is never used
to sign a published artifact**. The fix is to generate a **brand-new** release keystore with a
**new** password, store all four signing inputs as GitHub repo secrets (so they live in CI, not
in git), and never reuse the old `fivucsas2026` password. The signing build already reads from
env vars — `client-apps/androidApp/build.gradle.kts` pulls `ANDROID_KEYSTORE_PATH`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` via `System.getenv(...)`,
and `.github/workflows/android-build.yml` decodes the keystore from a base64 secret on a
`workflow_dispatch` with `build_type=release`. So this runbook only needs the operator to
populate the secrets; no code change is required.

> History rewrite was deliberately **NOT** done (see `SECURITY_INCIDENTS.md`): rotating the
> password makes the leaked one dead, and a force-push history rewrite of a public repo has a
> higher blast radius than the residual exposure. Do not rewrite history as part of this runbook.

### The exact 4 secret names the workflow expects

Confirmed from `client-apps/.github/workflows/android-build.yml`:

| GitHub secret name | What it holds |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the entire `release.jks` keystore file, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore (store) password |
| `ANDROID_KEY_ALIAS` | the key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | the per-key password |

### Step-by-step

**1. Generate a new release keystore** (run locally, NOT on a shared machine; choose a NEW
strong store/key password — do **not** reuse `fivucsas2026`):

```bash
keytool -genkeypair \
  -alias fivucsas-release \
  -keyalg RSA -keysize 4096 \
  -validity 10000 \
  -keystore release.jks \
  -storetype PKCS12 \
  -dname "CN=FIVUCSAS, OU=RollingCat Software, O=RollingCat, L=Istanbul, C=TR"
# keytool prompts for the store password (use it again for the key password unless you
# intentionally split them). Record both in your password manager.
```

> Keep `release.jks` in your offline vault / password manager. If you lose it you can no longer
> ship an **update** to an already-published app under the same signing identity (Play upload key
> rotation aside). Treat it like a master key.

**2. Base64-encode the keystore** (single line, no wrapping):

```bash
base64 -w0 release.jks > release.jks.b64   # Linux
# macOS: base64 -i release.jks -o release.jks.b64
```

**3. Set the 4 repo secrets** (requires `gh` authenticated as an admin of the repo;
the `-R` flag targets the submodule repo explicitly):

```bash
gh secret set ANDROID_KEYSTORE_BASE64   -R Rollingcat-Software/client-apps < release.jks.b64
gh secret set ANDROID_KEYSTORE_PASSWORD -R Rollingcat-Software/client-apps   # prompts for value
gh secret set ANDROID_KEY_ALIAS         -R Rollingcat-Software/client-apps   # value: fivucsas-release
gh secret set ANDROID_KEY_PASSWORD      -R Rollingcat-Software/client-apps   # prompts for value
```

Console equivalent: repo → **Settings → Secrets and variables → Actions → New repository secret**,
once per name above.

**4. Scrub the local plaintext artifacts** once the secrets are set:

```bash
shred -u release.jks.b64 2>/dev/null || rm -f release.jks.b64
# keep release.jks itself ONLY in your offline vault, not in any repo working tree
```

### Verify success

- Confirm the 4 secret names exist (values are never echoed):
  ```bash
  gh secret list -R Rollingcat-Software/client-apps
  ```
- Trigger a signed build and confirm it does not error on a missing secret:
  ```bash
  gh workflow run android-build.yml -R Rollingcat-Software/client-apps -f build_type=release
  gh run watch -R Rollingcat-Software/client-apps
  ```
  The "Decode release keystore" step fails fast with
  `ANDROID_KEYSTORE_BASE64 secret is not set` if step 3 was incomplete. A green run that
  uploads `fivucsas-release-apk` means signing works.
- (Optional) Mark GitGuardian alert #29836028 as resolved/revoked in the GitGuardian dashboard
  once the new keystore is live and the old password is provably unused.

### Rollback

- Secrets are additive and overwriteable: re-running `gh secret set <NAME>` replaces a value;
  there is no destructive prod change here.
- If a wrong keystore was uploaded, regenerate (step 1) and re-set `ANDROID_KEYSTORE_BASE64`.
- No deployed service is touched by this runbook, so there is nothing to restart.

---

## Runbook 2 — Twilio + Hostinger SMTP credential rotation

**Why it matters:** SMS OTP (Twilio) and Email OTP (Hostinger SMTP) are live auth factors.
Their secrets sit in `identity-core-api/.env.prod` on the Hetzner host. Periodic rotation (and
immediate rotation on any suspected exposure) limits blast radius. The API reads these at boot,
so a rotation requires editing `.env.prod` and **recreating** the API container.

**Env var names** (from `identity-core-api/src/main/resources/application.yml` + `.env.example`):

| Secret | Env var in `.env.prod` |
|---|---|
| Twilio Account SID | `TWILIO_ACCOUNT_SID` (starts `AC…`) |
| Twilio Auth Token | `TWILIO_AUTH_TOKEN` |
| Twilio sender number | `TWILIO_FROM_NUMBER` (E.164, e.g. `+1…`) |
| Twilio Verify service SID (if using Verify) | `TWILIO_VERIFY_SERVICE_SID` (starts `VA…`) |
| SMTP password | `MAIL_PASSWORD` (and the Spring alias `SPRING_MAIL_PASSWORD=${MAIL_PASSWORD}`) |
| SMTP host/port/user | `MAIL_HOST=smtp.hostinger.com`, `MAIL_PORT=587`, `MAIL_USERNAME=info@fivucsas.com` |

> Rehearse the edit + restart on the staging stack first if you want zero-risk
> (`identity-core-api/docs/RUNBOOK_STAGING.md`, `127.0.0.1:18080`).

### Step-by-step — Twilio Auth Token rotation

1. **Twilio Console** → Account → **API keys & tokens** → **Auth Tokens**. Twilio supports a
   primary + secondary token: click **Create secondary token**, then later **Promote** it to
   primary and delete the old one (this lets you roll without downtime). The **Account SID
   does not change**; only the Auth Token rotates.
2. If you use **Twilio Verify**, the **Verify Service SID** (`VA…`) is stable — it only changes
   if you recreate the Verify service. Rotating the Auth Token alone is sufficient for token
   compromise; only update `TWILIO_VERIFY_SERVICE_SID` if you actually create a new service.
3. On the Hetzner host, edit the prod env file (use your editor; do not paste the token into
   shell history):
   ```bash
   nano /opt/projects/fivucsas/identity-core-api/.env.prod
   # update: TWILIO_AUTH_TOKEN=<NEW_AUTH_TOKEN>
   # (and TWILIO_VERIFY_SERVICE_SID=<NEW_VA_SID> only if you recreated the service)
   ```

### Step-by-step — Hostinger SMTP password rotation

1. **Hostinger hPanel** → **Emails** → select `info@fivucsas.com` → **Change password**
   (or recreate the mailbox app password). Host stays `smtp.hostinger.com`, port `587` (STARTTLS).
2. Update the prod env file:
   ```bash
   nano /opt/projects/fivucsas/identity-core-api/.env.prod
   # update: MAIL_PASSWORD=<NEW_SMTP_PASSWORD>
   # (MAIL_HOST / MAIL_PORT / MAIL_USERNAME normally unchanged)
   ```

### Apply (recreate the API container)

```bash
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
```

> No `--build` is needed for an env-only change — `up -d` recreates the container so it
> re-reads `.env.prod`.

### Verify success

- Container healthy:
  ```bash
  docker ps --format "table {{.Names}}\t{{.Status}}" | grep identity-core-api
  docker logs --tail 60 identity-core-api 2>&1 | grep -iE "started|error|mail|twilio"
  ```
- **Email OTP** end-to-end: trigger an Email-OTP login/enrollment for a test account
  (e.g. via `app.fivucsas.com` or the demo) and confirm the message arrives from
  `info@fivucsas.com`. No SMTP-auth error should appear in the logs.
- **SMS OTP** end-to-end (only if SMS is enabled, `SMS_ENABLED=true`): trigger an SMS-OTP flow
  to a verified test number; confirm delivery and a `200` from Twilio in the logs. The Twilio
  Console **Monitor → Logs → Messaging / Verify** also shows the attempt with the new credential.

### Rollback

- The old Twilio Auth Token stays valid until you delete/replace it — keep it briefly so you can
  revert `TWILIO_AUTH_TOKEN` in `.env.prod` and re-run `up -d` if the new one misbehaves.
- For SMTP, Hostinger password change is immediate; if mail breaks, re-set the password in hPanel,
  update `MAIL_PASSWORD`, and `up -d` again.
- Keep a one-line backup of the prior values before editing (e.g. `cp .env.prod .env.prod.bak`,
  stored only on the host, never committed) so rollback is a copy-back + `up -d`.

---

## Runbook 3 — DKIM for `fivucsas.com` outbound email

**Why it matters:** DKIM signs outbound mail so receivers (Gmail/Outlook) can verify it really
came from `fivucsas.com` and wasn't altered. Together with SPF and DMARC it sharply improves
deliverability of OTP / transactional email and reduces spoofing. This is a **DNS + email-provider**
action — it cannot be done from the app. (Historical note: the old Hostinger DKIM CNAMEs were
NXDOMAIN, see `CHANGELOG.md`; this runbook re-enables it cleanly. Tracked as Phase F item F1.)

### Step-by-step

1. **Enable DKIM at the mail provider (Hostinger).** hPanel → **Emails** → the `fivucsas.com`
   domain → **DNS / Email configuration** (or **DKIM** panel). Hostinger generates a selector
   (commonly `hostingermail` or `default`) and gives you either:
   - a **CNAME** record (Hostinger-managed key) — e.g.
     `hostingermail1._domainkey.fivucsas.com  CNAME  hostingermail1.dkim.mail.hostinger.com.`
     (and possibly `…2`, `…3`); **or**
   - a **TXT** record containing `v=DKIM1; k=rsa; p=<PUBLIC_KEY>`.

   Use whatever the panel shows — do not invent the selector or key.

2. **Add the record(s) at the DNS authority for `fivucsas.com`.** If DNS is managed at Hostinger,
   the panel may add them automatically — confirm they appear. If DNS is managed elsewhere
   (registrar / external DNS), copy the exact host + value from step 1 into that DNS zone.

3. **Confirm SPF + DMARC alignment** (DKIM is most effective with these):
   - SPF TXT on `fivucsas.com`: include Hostinger, e.g. `v=spf1 include:_spf.mail.hostinger.com ~all`.
   - DMARC TXT on `_dmarc.fivucsas.com`: start in monitor mode,
     `v=DMARC1; p=none; rua=mailto:info@fivucsas.com`, then tighten to `p=quarantine`/`p=reject`
     after a clean reporting window.

### Verify success

- DKIM record resolves (replace `<SELECTOR>` with the actual one, e.g. `hostingermail1`):
  ```bash
  dig +short TXT  <SELECTOR>._domainkey.fivucsas.com
  dig +short CNAME <SELECTOR>._domainkey.fivucsas.com   # if Hostinger used a CNAME
  ```
- SPF / DMARC sanity:
  ```bash
  dig +short TXT fivucsas.com         | grep -i spf1
  dig +short TXT _dmarc.fivucsas.com
  ```
- **End-to-end:** send a test from `info@fivucsas.com` to a check service such as
  [mail-tester.com](https://www.mail-tester.com/) (send to the address it gives you, then read
  the score) — it reports `DKIM: pass`, `SPF: pass`, `DMARC: pass`. Or send to a Gmail account,
  **Show original**, and confirm `DKIM: PASS (signed by fivucsas.com)`.

### Rollback

- DKIM is non-destructive: receivers that don't see a DKIM signature simply fall back to SPF.
  To roll back, delete the DKIM TXT/CNAME record(s) in DNS — mail still flows (just unsigned).
- Keep DMARC at `p=none` until DKIM+SPF both pass for several days; only then raise the policy.
  If legitimate mail starts getting quarantined after tightening, drop DMARC back to `p=none`.

---

## Runbook 4 — JWT issuer/audience soak completion

**Why it matters:** The `prod` Spring profile **fails fast on boot** if
`APP_SECURITY_JWT_AUDIENCE` is blank — and a blank value in `.env.prod` *overrides* the
`:fivucsas-api` default baked into `application-prod.yml`, so leaving the var empty is **worse**
than omitting it. This exact mistake crash-looped prod for ~11 minutes on 2026-05-28. The minter
(`JwtService`) and the parser/validator use the **same** value, so issuer and audience must stay
in lockstep. See the operator note in `identity-core-api/CLAUDE.md` ("Operator reality").

### Confirm both are set and consistent (the "soak" check)

1. On the host, confirm the audience is **non-blank** in prod env:
   ```bash
   grep -E '^APP_SECURITY_JWT_AUDIENCE=' /opt/projects/fivucsas/identity-core-api/.env.prod
   # expected: APP_SECURITY_JWT_AUDIENCE=fivucsas-api   (NOT an empty value)
   ```
   If the line is `APP_SECURITY_JWT_AUDIENCE=` (blank) → set it to `fivucsas-api` and recreate
   the container (see "Apply" below). If the line is **absent**, the `:fivucsas-api` default
   applies — but pinning it explicitly is recommended so the intent is visible.

2. Confirm the container is up and did **not** fail the boot guard:
   ```bash
   docker logs --tail 80 identity-core-api 2>&1 | grep -i "jwt.audience"
   # a clean boot has NO "CRITICAL SECURITY ERROR: ...jwt.audience is blank"
   ```

3. Confirm minted tokens actually carry the expected `iss` and `aud` (decode a live token's
   payload — header/payload are base64url, not secret):
   ```bash
   # Obtain a token via a test login, then decode the middle (payload) segment:
   echo "<ACCESS_TOKEN_PAYLOAD_SEGMENT>" | tr '_-' '/+' | base64 -d 2>/dev/null | python3 -m json.tool
   # expect: "aud": "fivucsas-api"  and a stable "iss"
   ```
   Validation consistency is implicitly proven because the running API accepts its own freshly
   minted token on an authenticated endpoint (e.g. `/auth/me`) — mint and parse share the value.

### How to safely change issuer/audience in lockstep (only if ever needed)

1. Change the value in **one** place of truth: `APP_SECURITY_JWT_AUDIENCE` (and the issuer
   property) in `.env.prod`. Because the minter and parser both read the same property, they
   move together — never edit a minter constant without the matching parser config.
2. Roll-forward safely for already-issued tokens: tokens minted with the **old** `aud` will fail
   validation after the switch. Either (a) do the change during a low-traffic window and accept
   that outstanding short-TTL access tokens (15 min in prod) expire naturally, or (b) temporarily
   widen the accepted-audience set to include both old and new before retiring the old value.
3. Apply and watch the boot guard (it rejects a blank value):
   ```bash
   cd /opt/projects/fivucsas/identity-core-api
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
   docker logs --tail 80 identity-core-api 2>&1 | grep -i "jwt"
   ```
   Rehearse on staging first (`identity-core-api/docs/RUNBOOK_STAGING.md`).

### Verify success

- Container healthy, no `jwt.audience is blank` in logs.
- A fresh login → token whose payload shows `"aud": "fivucsas-api"` and the expected issuer.
- An authenticated call (e.g. `GET /auth/me` with the new token) returns `200` — proving
  mint/validate agreement on the live host.

### Rollback

- Revert `APP_SECURITY_JWT_AUDIENCE` (and issuer) in `.env.prod` to the previous value and
  `up -d` again. Keep `.env.prod.bak` before editing so rollback is a copy-back + recreate.
- **Never** leave the var as an empty string on rollback — that re-triggers the fail-fast boot
  loop. Either set the prior concrete value or delete the line entirely.

---

## Runbook 5 — iBeta PAD Level-1 certification submission (planning)

**Why it matters:** iBeta is an independent, NIST/NVLAP-accredited lab that runs ISO/IEC 30107-3
Presentation Attack Detection (PAD) evaluations. A **PAD Level-1** pass is the credible,
third-party proof that the face-liveness defends against common presentation attacks (printed
photos, screen replays, simple masks). It is the headline external-validation milestone for the
biometric stack and is referenced as an ongoing item in `ROADMAP.md` and `spoof-detector/ROADMAP.md`.

> **Honest framing:** this is an **external, paid, scheduled engagement** with iBeta — it is not
> something we run ourselves or complete in software. This runbook is a planning checklist so the
> operator can engage the lab; it does not certify anything by itself.

> **Scope note (important):** two liveness implementations exist. Production `/verify` uses the
> **UniFace MiniFASNet passive** backend in `biometric-processor` (`LIVENESS_BACKEND=uniface`,
> `LIVENESS_MODE=passive`). The research/paper pipeline lives in the `spoof-detector` submodule
> (current self-measured ISO 30107-3 grade is **Grade C**, and its iBeta package is *currently
> scoped to the Python pipeline*, with a re-scope to the browser bundle as a planned iteration —
> see `spoof-detector/ROADMAP.md`). **Decide and state explicitly which system is the
> "system under test" (SUT) before engaging iBeta** — they certify a specific, frozen build, not
> a moving target.

### High-level checklist

1. **Pick and freeze the SUT.** Choose the exact system + version to certify (production
   `biometric-processor` UniFace MiniFASNet passive **or** the `spoof-detector` pipeline). Tag the
   exact commit / model artifact (model file + SHA256) so the lab evaluates a frozen build.
2. **Define the PAD scope.** Level-1 covers low-cost artefacts: printed photos, photo on a screen,
   video replay, and basic masks. Confirm the attack instrument set with iBeta in scope of
   ISO/IEC 30107-3 (they enumerate the species and counts).
3. **Engage iBeta commercially.** Contact iBeta (`ibeta.com`), request a quote/SOW for an
   ISO/IEC 30107-3 PAD Level-1 evaluation of a face presentation-attack-detection system. Expect
   an NDA, a statement of work, scheduling, and a fee. This is the long-lead, operator-only step.
4. **Provide the access/artifacts the lab needs.** Typically:
   - a **testable build/API** — for us, a deployable endpoint or container that exposes the
     liveness decision (e.g. a hosted `/verify`-style endpoint or the `spoof-detector` CLI/bundle)
     plus an API key and documented request/response contract;
   - the **decision threshold and outputs** (live/spoof verdict + score) and how to read them;
   - **documentation** — model description, what the system claims to detect, and our internal
     ISO 30107-3 metric methodology (`spoof-detector/src/evaluate.py` computes APCER/BPCER/ACER);
   - a **point of contact** for the test window and any environmental constraints (lighting,
     camera, capture device) the lab should mirror.
5. **Run the evaluation window.** iBeta presents the attack species, records APCER/BPCER, and
   reports against the Level-1 pass criteria. Be prepared to retest after fixes if a species fails.
6. **Receive and publish the report.** On a pass, iBeta issues a report/letter. Record the result
   and version in `spoof-detector/README.md` / `ROADMAP.md` and update the project status.

### Verify success

- A signed iBeta PAD Level-1 report/letter naming the exact SUT version and the attack species
  covered. Until that document exists, the item is **not** complete regardless of internal scores.
- Internal pre-check before paying for the lab window: our own ISO 30107-3 harness
  (`spoof-detector/src/evaluate.py`) should already show acceptable APCER/BPCER on a realistic
  attack set, so the paid run isn't wasted. (Today the self-measured grade is Grade C, APCER ~30% —
  budget for hardening before submission.)

### Rollback

- Nothing in production changes from engaging iBeta — there is no system rollback.
- If the engagement is paused or the SUT must change, simply do not submit; re-freeze a new SUT
  version and restart at step 1. Do not advertise "iBeta certified" anywhere until the signed
  report is in hand.

---

*Maintenance: when any hostname, env-var name, secret name, or workflow path referenced above
changes, update this runbook in the same PR (per the project's keep-docs-updated rule).*
