# Pipeline Completeness Audit — 2026-05-07

Read-only end-to-end verification of 12 production-claimed features at HEAD.
No CLAUDE.md / roadmap claims trusted; verdicts derived from code inspection
only. Submodule HEADs as of run: bio + api + web (master-tracking, dirty
index entries listed in run-time `git status`).

## Methodology

For each feature I traced the request path end-to-end (UI step → web service
→ Java controller → service/handler → infrastructure adapter → bio FastAPI
route → repository → DB) and read the load-bearing decision lines. Verdicts
are anchored to file:line. Every "NOT WIRED" / "STUB" claim is corroborated
by a contradiction between the claim and the actual control flow. Severity
labels follow the brief's rubric (P0 = wrong-result-success, P1 =
known-bypass, P2 = missing defense-in-depth, P3 = doc drift).

## Verdict Table

| # | Feature | Verdict | Severity |
|---|---|---|---|
| 1 | Voice auth (Resemblyzer 256-dim) | WORKING | — |
| 2 | NFC document auth | STUB (serial-only; no MRZ/DG1/DG2) | P1 |
| 3 | Anti-spoof verdict in /verify | PARTIAL (vetoed only when liveness conf < 0.85) | P2 |
| 4 | UniFace passive liveness in /verify | WORKING | — |
| 5 | Refresh-token reuse → family revoke | WORKING | — |
| 6 | GDPR data export | WORKING | — |
| 7 | SoftDeletePurgeJob hard-delete | NOT WIRED in prod (feature flag default false) | P2 |
| 8 | WebAuthn registration + assertion | WORKING | — |
| 9 | Audit-log persistence (5 ops) | PARTIAL (password change + user/tenant delete = silent) | P2 |
| 10 | Embedding encryption (Fernet) | BROKEN (write-only — never read back) | P0 |
| 11 | OAuth2 /authorize tenant guard | WORKING | — |
| 12 | Hosted-login MFA full flow | WORKING | — |

---

## Detailed Findings (severity-ordered)

### #10 — Embedding Encryption (Fernet) — **BROKEN, P0**

`pgvector_embedding_repository.py:227,304,766` write `embedding_ciphertext`
in lockstep with the plaintext `embedding` column on every save/centroid
update. `pgvector_voice_repository.py:110,155` do the same for voice. The
ciphertext column is therefore populated.

But on every read path the plaintext column is used:

- `pgvector_embedding_repository.py:382-403` — `find_by_user_id` selects
  `embedding` (plaintext) and converts to numpy.
- `pgvector_embedding_repository.py:418+` — `find_similar` runs `embedding
  <=> $1::vector` cosine search against plaintext.
- `pgvector_voice_repository.py:222-243` and `:313-338` — same pattern.

`grep -rn "decrypt_vector\|cipher.decrypt" biometric-processor/app` returns
exactly one hit: the function definition at
`embedding_cipher.py:75`. **Zero call sites.** The Fernet ciphertext column
is write-only / read-never; an operator who dumped the DB still gets a
fully-functional plaintext recognition store. Encryption-at-rest is a
deception, not a defense. Severity P0 because the feature is *claimed*
to protect biometric-class personal data (GDPR Art. 9) and does not.

**Fix path**: ANN search must continue to use plaintext (pgvector has no
ciphertext-aware operator); but `find_by_user_id` (the 1:1 verify path)
should re-derive the vector from `decrypt_vector(embedding_ciphertext)`,
and `find_similar` should optionally cross-check the closest-match row's
ciphertext on a hit.

### #2 — NFC Document Auth — **STUB, P1**

`NfcController.java:35-71` (enroll) and `:73-108` (verify) accept only a
`cardSerial` string from the client. The frontend `NfcStep.tsx` reads the
NFC chip via Web NFC API and forwards just the serial number
(`NfcEnrollment.tsx:124`, posts `{userId, cardSerial}`). No MRZ. No DG1.
No DG2. No checksum validation. The server stores `cardSerial` and on
verify performs a row lookup.

A bio service `mrz_parser.py` does exist
(`biometric-processor/app/domain/services/mrz_parser.py`) and is wired
into `verification_pipeline.py` — but that is a separate manual-KYC flow,
not the NFC auth method. The NFC AuthMethod's verify-step has zero
contact with the parser.

**Practical impact**: an attacker with a writable NFC card (Mifare
Classic / NTAG215) clones the published serial and is authenticated as
the victim. There is no cryptographic challenge–response with the card
chip, no BAC/PACE handshake, no chip authentication. Severity P1 because
"NFC verified" is presented to relying parties at face value while it
proves nothing about the card holder.

### #3 — Face Anti-spoof in /verify — **PARTIAL, P2**

`check_liveness.py:148-175` reads `detection.antispoof_label /
antispoof_score` from DeepFace, but the spoof verdict is *only* applied
as a veto when the liveness confidence is **below 0.85**:
`if deepface_spoof_detected and liveness_result.confidence <
DEEPFACE_VETO_CONFIDENCE_THRESHOLD` (line 157). If UniFace says the
face is real with confidence ≥ 0.85, an explicit DeepFace `spoof` label
is **ignored** and `is_live` stays True.

`ANTI_SPOOFING_ENABLED=true` is honored (line 151), so the gate exists,
but its effective scope is narrow. UniFace MiniFASNetV2 is competent but
still has FPR > 0 on screen-replay attacks; pairing it with a
high-confidence rejection of a contradicting DeepFace verdict would be
strictly safer.

### #7 — SoftDeletePurgeJob — **NOT WIRED in prod, P2**

`SoftDeletePurgeJob.java:74-90` carries `@Scheduled(cron = "0 30 3 * * *")`
and `@SchedulerLock`. It calls `userRepository.hardDeleteById(userId)`
and `flush()` so FK cascades (V11/V16/V18/V19/V22/V30/V6) execute, and
emits a `USER_HARD_PURGED` audit event. `purgeBatch` issues
`SET LOCAL app.allow_hard_delete = 'on'` to bypass V53's BEFORE-DELETE
trigger (line 147). **The implementation is correct.**

However: `application.yml:26-27` defaults the gate to
`APP_PURGE_SOFT_DELETE_ENABLED:false`, and on every invocation the job
short-circuits at line 84-87 (or line 99 if `purge()` is called
directly). Unless the operator has explicitly set
`APP_PURGE_SOFT_DELETE_ENABLED=true` in `.env.prod` (cannot be verified
from this thread — no SSH key access), the GDPR Art. 17 / KVKK
right-to-erasure obligation is unfulfilled in production. Documentation
implies the job is doing work; runtime evidence in the codebase is that
it is idle by default.

### #9 — Audit-log persistence — **PARTIAL, P2**

5 spot-checks:

1. **Login success / fail** — `AuthenticateUserService.java:78,108,128,131,161,247`
   — emits `logAuthenticationFailed` and `logUserAuthenticated`. WORKING.
2. **MFA step pass / fail** — `VerifyMfaStepService.java:187,206,246,261,294,338,383`
   — emits `logMfaStepFailed`, `logMfaStepCompleted`, `logMfaComplete`. WORKING.
3. **Password change** — `ChangePasswordService.java` has no `auditLogPort`
   field at all. `grep -n "audit" ChangePasswordService.java` returns
   nothing. **Silently NOT logged.** A successful password rotation
   leaves no audit trace. (Reset flow `ResetPasswordService.java:41-94`
   does emit; only the in-session change path is silent.)
4. **Token refresh / revoke** — `RefreshTokenService.java:117-121` emits
   `REFRESH_TOKEN_REUSE_DETECTED` only on the reuse-detection path; a
   normal mint or normal revoke does not write an audit row. The reuse-
   detect line is the WORKING path; routine mint/revoke is silent.
5. **User delete / Tenant create / Tenant delete** —
   `ManageUserService.java` and `ManageTenantService.java` import
   `AuditLogQueryPort` (read) but neither has an `AuditLogPort` field
   (write). User soft-delete and tenant create/delete actions
   **do not emit audit rows**. Forensics on a tenant-removed-by-mistake
   incident would have to fall back to DB triggers (none exist for
   `tenants`) or container logs.

Severity P2 because the audit-log-as-compliance-evidence claim
(SOC2 / ISO 27001 / KVKK 7-year retention rationale, cited at
`SoftDeletePurgeJob.java:39`) leaks holes for three high-stakes
operation classes.

### #1 — Voice auth (Resemblyzer 256-dim) — **WORKING**

- `speaker_embedder.py:51-58` instantiates `resemblyzer.VoiceEncoder` —
  the real GE2E pretrained model, not a stub.
- `speaker_embedder.py:97-106` runs `preprocess_wav` and
  `embed_utterance` to produce a 256-dim L2-normalized vector
  (`VOICE_EMBEDDING_DIM = 256` at line 27).
- `voice.py:114-167` /verify: cosine similarity at line 148, threshold
  0.65 at line 120; clamps `[0,1]` and decides `verified = similarity
  >= VERIFY_THRESHOLD`.
- Centroid weighting: `pgvector_voice_repository.py:134-186` writes
  individual rows + computes `AVG(embedding)::vector(256)` centroid; the
  centroid is read by `find_by_user_id` (line 219-243), with INDIVIDUAL
  fallback if no CENTROID exists yet. Quality-weighted is *advertised*
  but the actual SQL `AVG(embedding)` is unweighted (each enrollment
  contributes equally regardless of `quality_score`). Minor P3 doc
  drift; not flagged as a verdict change.

### #4 — UniFace passive liveness — **WORKING**

`verification.py:104-124` calls `liveness_use_case.execute()`, then
*rejects* the entire request with HTTP 400 LIVENESS_FAILED if either
`is_live == False` or `score < 0.4`. The check runs **before** the
embedding extract / similarity step — so a spoof never reaches the
1:1 matcher. The verdict is genuinely load-bearing. Backend resolves
to UniFace MiniFASNetV2 via `LIVENESS_BACKEND=uniface +
LIVENESS_MODE=passive` per the deployed config.

### #5 — Refresh-token family-revoke (V50) — **WORKING**

`RefreshTokenService.java:107-123` — when a presented refresh token is
already revoked, `revokeFamily(token.getFamilyId(), Instant.now())` runs
and the count is logged to audit
(`REFRESH_TOKEN_REUSE_DETECTED`). Rotation
(`RefreshTokenService.java:213-220`) revokes the parent and mints a
sibling sharing `familyId`, so a single compromised token blows the
entire chain on re-presentation. Behavior conforms to RFC 6749 §10.4
and OAuth 2.0 Security BCP §4.13.

### #6 — GDPR data export — **WORKING**

`UserDataExportService.java:67-86` returns a bundle including:
user core fields, enrollments (metadata only — `enrollmentData`
deliberately stripped at line 129), authFlows, audit logs (max 10k),
verificationSessions, oauth2Clients (only for tenant admins — line
202).

Excluded by design:
- `password_hash`, `two_factor_secret`, backup codes (line 41-44)
- raw biometric vectors (line 80-84 — empty lists for
  `voiceEnrollments` and `biometricEnrollments`)
- session tokens (line 153)
- client secrets (line 218)
- WebAuthn private material (handled at registration time)

Refresh tokens are not enumerated because they are not exposed via this
service at all — the refresh-token table is not a serialize source.

### #8 — WebAuthn registration + assertion — **WORKING**

- Registration: `WebAuthnService.java:70-117` validates clientDataJSON
  type (`webauthn.create`), challenge match, origin allowlist (RFC 6454
  §4 exact-match), then consumes the Redis challenge. P1-3 fix at line
  82-85 prevents null/empty `clientDataJSON` from passing.
- Assertion: `WebAuthnService.java:130-179` validates clientData →
  authenticatorData → presence of `credentialId` + `signature` →
  ECDSA SHA256 signature verify (line 184-215, real `Signature`
  cryptographic verify, not a string compare).
- Sign-counter monotonic check: `validateSignCount` (line 247-258)
  enforces `newCount > storedCount` unless both are zero (spec-permitted
  for privacy-preserving authenticators).
- Origin allowlist: requires `app.webauthn.allowed-origins` env;
  startup logs warn (line 47) if empty, in which case all assertions
  fail-closed.

### #11 — OAuth2 /authorize tenant guard — **WORKING**

`OAuth2Controller.java:142,254` both call `validateAuthorizeRequest(...)`
before code minting (single-step authenticated branch + post-MFA
hosted-complete branch). The shared method at line 321-369 performs:
PKCE S256 enforcement for public clients (line 332-342), user lookup,
and exact tenant-id equality on `user.getTenant().getId() ==
client.getTenant().getId()` (line 359-366). On mismatch:
HTTP 400 `invalid_request` with state echo (RFC 6749 §5.2 shape).

### #12 — Hosted-login MFA full flow — **WORKING**

- `HostedLoginApp.tsx:83-97` parses URL params (`state` is read at
  line 89; not validated client-side — that's the relying party's job
  per RFC 6749, correct).
- After password + MFA, posts to `/oauth2/authorize/complete`
  (`HostedLoginApp.tsx:291-304`) with `mfaSessionToken` + `state`.
- `OAuth2Controller.java:213-241` validates the MFA session: existence,
  not-expired, not-consumed (anti-replay at line 226-230), and
  client-id binding (line 236-241). `OAuth2Service.java:172-200`
  consumes + mints + deletes the session row inside a single
  `@Transactional`, so a crash leaves the session burned.
- Code single-use: `OAuth2Service.java:228-229` deletes the Redis key
  immediately on first /token call. Second presentation hits line 217
  (`stored == null`) and throws `CODE_NOT_FOUND`.
- `redirect_uri` re-validated at exchange: `OAuth2Service.java:279-281`
  exact-match against the `storedRedirectUri` recorded at code mint
  (RFC 6749 §4.1.3). Front-end `assertSafeRedirectScheme`
  (`HostedLoginApp.tsx:347`) adds a defense-in-depth scheme allowlist.

---

## Top Recommendations

1. **Wire the Fernet ciphertext into read paths** in
   `pgvector_embedding_repository.find_by_user_id` and
   `pgvector_voice_repository.find_by_user_id`. Today the encryption is
   security theater — the plaintext column is the source of truth for
   every read. (P0)
2. **Replace NFC serial-only auth with chip authentication.**
   At minimum require a challenge–response signed by the chip's
   per-card key, or move NFC to a verification-pipeline-only feature
   and remove it from the auth methods enum. Cloned-tag attack is
   trivial today. (P1)
3. **Lift the DeepFace anti-spoof veto threshold** from
   `liveness_result.confidence < 0.85` to "always-veto-when-spoof-label-
   set". Honoring the explicit spoof verdict regardless of UniFace's
   confidence is a single-line change in `check_liveness.py:157`. (P2)
4. **Confirm `APP_PURGE_SOFT_DELETE_ENABLED=true` in prod `.env.prod`**.
   The job is wired but feature-flag-default-disabled; without it
   GDPR Art. 17 is unfulfilled. Add a startup banner that logs the
   flag's value at WARN when disabled. (P2)
5. **Emit audit rows from ChangePasswordService, ManageUserService
   (delete), and ManageTenantService (create/delete).** Each is a
   2-line addition (`auditLogPort.logSecurityEvent(...)`) and removes
   three blind spots in the compliance trail. (P2)
