# NFC / eID / Passport Authentication — Status & Readiness

**Date:** 2026-06-01
**Repos:** identity-core-api (Java), biometric-processor (Python), web-app (React), client-apps (Kotlin-MP)

Covers two things the operator asked about:
1. **Why enrolled student-card NFC login failed as "Verification failed"** — root cause + the fix shipped today.
2. **Is the eID / passport (ICAO chip passive-authentication) pipeline ready?** — readiness assessment + blockers.

---

## 1. NFC student-card login — root cause & fix (SHIPPED)

### Symptom
A correctly **enrolled + active** NFC student card failed login with **"Verification failed for NFC_DOCUMENT"**.

### Root cause
The live login path is `POST /api/v1/auth/mfa/step` → `VerifyMfaStepService` → **`NfcDocumentVerifyMfaStepHandler`**. That handler was **fail-closed by default**:

```java
// NfcDocumentVerifyMfaStepHandler.verify(), before the fix
if (!serialOnlyAuthEnabled) {        // fivucsas.nfc.serial-only-auth-enabled defaults to false
    return MfaStepResult.fail();      // returns BEFORE the card is ever queried
}
```

`fivucsas.nfc.serial-only-auth-enabled` defaults to `false` and was **not set in `.env.prod`**, so it was `false` in prod. The step failed *before* any DB lookup, surfacing the generic `"Verification failed for NFC_DOCUMENT"` and the **misleading** audit reason `nfc_card_not_found_or_not_owned` (the lookup never ran — the card was fine).

This was an intentional **S9 security decision**: a card serial/UID is readable and cloneable (not a secret), so matching it alone was deemed not real authentication, and the factor was switched off pending on-chip authentication.

### Two contributing subtleties
- **The two NFC handlers disagreed.** The legacy `NfcDocumentAuthHandler` (the `AuthMethodHandler` path) *did* canonicalize + look up + succeed for an enrolled card — but the modern `/auth/mfa/step` path never calls it. The fail-closed handler is the live one.
- **A latent canonicalize bug** in the opt-in branch: even with the flag enabled, `NfcDocumentVerifyMfaStepHandler` passed the **raw** `nfcData` to the lookup without `NfcSerial.canonicalize()`. A web tap (`04:a2:..` lowercase-with-colons) would still miss the stored canonical `04A224..` (UPPERHEX, no separators), so web-enrolled cards would *still* fail. (Mobile already sends UPPERHEX, so it would have matched.)

### Decision & fix (why enable serial-only for student cards)
Campus/student cards are plain **MIFARE — UID/serial only, no ICAO chip / EF.SOD** — so chip passive-authentication (the strong path) **can never apply to them**; serial match is the *only* mechanism that can ever authenticate them. NFC is consumed here only as **one factor inside an MFA flow** (never a sole high-assurance factor), which is how real campus door/library/canteen systems already use that same card. The risk (a cloned serial) is documented and **reversible via a kill-switch**.

Shipped in **PR #189** (merged to `main` @ `e6d94e8`, deployed via api rebuild 2026-06-01):
1. `NfcDocumentVerifyMfaStepHandler` now `NfcSerial.canonicalize(nfcData)` before the lookup (web taps match the stored UPPERHEX serial).
2. `FIVUCSAS_NFC_SERIAL_ONLY_AUTH_ENABLED=true` in `.env.prod`.
   **Kill-switch:** unset the var + `docker compose … up -d identity-core-api` to revert to fail-closed — **no rebuild**.
3. Javadoc + `identity-core-api/CLAUDE.md` updated.

---

## 2. eID / passport passive-authentication pipeline — readiness

**Verdict: code-complete server-side, but NOT ready end-to-end — it is currently dormant/unreachable in production and can never apply to plain student cards.**

This is the ICAO 9303 eMRTD "passive authentication" flow: prove a passport/national-eID **chip** is genuine via `EF.SOD → Document Signer (DS) → CSCA` trust chain + data-group hash binding.

### What IS built and real (server-side)
- `biometric-processor` `POST /api/v1/nfc/verify-authenticity` is a **genuine implementation** (`app/domain/services/emrtd_passive_auth.py`, `app/api/routes/nfc.py`):
  - Parses `EF.SOD` (CMS `SignedData` → inner `LDSSecurityObject`).
  - Verifies each provided **DG hash** (DG1 MRZ, DG2 face, …) against the SOD manifest (SHA-1/224/256/384/512).
  - Verifies the **SOD signature** with the embedded DS cert (RSA PKCS1v15/PSS + ECDSA).
  - Verifies the **DS→CSCA** chain (issuer/subject match + cryptographic signature).
  - **Fail-closed**: `is_authentic=true` only when *all three* checks pass. Reason codes: `OK`, `DG_HASH_MISMATCH`, `SIGNATURE_INVALID`, `DS_UNTRUSTED`, `SOD_PARSE_ERROR`, `NO_TRUST_STORE`, `MISSING_DG`, `UNSUPPORTED_ALGORITHM`.
  - Libraries: `asn1crypto` + `cryptography` + `hashlib`. CPU-only.
- The **Android** reader (`client-apps/.../TurkishEidReader.kt`) genuinely performs **BAC/PACE** key derivation + secure messaging and reads `DG1`/`DG2`/`EF.SOD` off a real chip.
- Unit tests cover all verdict outcomes (`tests/unit/.../test_emrtd_passive_auth.py`, `test_nfc_verify_authenticity_route.py`) — but with **self-signed** fixtures.

### Why it is NOT ready end-to-end — blockers

| # | Blocker | Severity | Detail |
|---|---------|----------|--------|
| 1 | **CSCA trust store is empty** | 🔴 Critical | `biometric-processor/app/core/csca_trust_store/` contains only a README — **zero root certs**. Every chip check therefore returns `is_authentic=false / NO_TRUST_STORE`. Nothing can be marked genuine until an operator drops CSCA roots in (`.pem`/`.der`). **No rebuild needed** — it is an mtime-keyed cache that reloads on the next request. Source CSCA roots from the **ICAO PKD** or the **national issuing authority**. |
| 2 | **Chip capture not wired to the live login** | 🔴 Critical | The live `/auth/mfa/step` NFC handler only accepts the serial (`nfcData`), never the SOD/DGs. Android captures SOD/DGs but only on a **developer** screen (`NfcReadScreen`), not in the production login flow. So even with a provisioned trust store, the chip data never reaches the verifier. |
| 3 | **Web cannot read the chip** | 🟡 Inherent | The Web NFC API (`NDEFReader`) can only read the surface UID/serial — no ISO-DEP → no `EF.SOD`. Browser NFC will always be serial-only (platform limitation, not a bug). |
| 4 | **No real eMRTD test fixtures; no Active Authentication** | 🟡 Medium | Tests use self-signed SODs only (no real passport). **Active Authentication / Chip Authentication (anti-clone)** is **not implemented** — the pipeline is Passive Authentication only (proves the DGs are genuine, not that they came from a physical, non-cloned chip). |

> Note: a sub-agent draft referenced a specific Turkish CSCA issuer by name; that detail was **not verified** and is intentionally omitted here — provision CSCA roots from the ICAO PKD or the official national authority.

### What "ready end-to-end" would require
1. Provision CSCA roots into the trust store (operator, no rebuild).
2. Wire the mobile-captured `sod` + `dg{1..N}` into the `/auth/mfa/step` payload and gate the serial lookup on the passive-auth verdict (the legacy `NfcDocumentAuthHandler` already has this SOD-gate shape to mirror). **Do not** add a fail-closed SOD gate to the live handler while the trust store is empty — it would reject any SOD-bearing card.
3. Validate against a real passport/eID SOD fixture (with permission).
4. (Optional, stronger) implement Active/Chip Authentication for anti-clone.

---

## Bottom line

- **Student-card NFC login:** fixed + deployed today — works via serial match (one MFA factor), reversible by kill-switch.
- **eID/passport strong verification:** the server crypto is real and done, but it is **unprovisioned (no CSCA roots) and not wired into production login**, so it does nothing today — and it can never apply to chipless student cards. It is a separate, future track.
