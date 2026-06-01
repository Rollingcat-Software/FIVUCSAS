# FIVUCSAS — Operator TODO (things only you can do)

**Date:** 2026-06-01 · before the Thursday/Friday demo.
These are blocked on a human/credential/hardware/decision that I cannot perform. Everything else is on the fix-list in `MASTER_GAP_REGISTER_2026-06-01.md` (I can do those).

## 🔴 Before Thursday (demo-blocking or visible)

1. **Test live OTP delivery — email AND SMS.** Both channels are wired and live (Twilio Verify initialized, SMTP enabled), but I can't *receive* a code to prove delivery. Do one real `verify.fivucsas.com` login that triggers an **email OTP** (check inbox + spam) and one that triggers an **SMS OTP** (real phone). If email lands in spam → DKIM/SPF needs attention. **This is the single most likely live failure on stage.**

2. **Decide & pin the Marmara login flow.** verify.fivucsas.com currently shows *two different* first screens depending on timing (identifier-first vs email+password) — the `engineActive` canary flipping. Decide which one you'll demo and pin Marmara to it so it's stable. I can apply the env change once you choose (identifier-first **or** classic password-first).

3. **npm packages decision.** Docs imply `npm install @fivucsas/auth-js` works, but the packages are **not published** (install → 404), and `@fivucsas/auth-react` doesn't exist. Either: (a) give me an npm org + publish token and I'll publish, or (b) tell me to change the docs to **CDN script-tag only** (I'll do that immediately). Don't let a professor run `npm install` and get a 404.

4. **status page internal-hostname leak** (P1-11). In Uptime Kuma, edit the "Identity API" monitor → turn off **"Show URL on status page"**. (I can attempt this if you give me the Kuma admin login or confirm I may touch the Kuma container's store.)

5. **Mobile demo = use a pre-installed app build.** The signed-APK CI is blocked on the keystore (item below), so don't plan to build/hand out a fresh signed APK on stage. A pre-installed/sideloaded build is fine.

## 🟡 Decisions for the team (truth-in-claims)

6. **Demo script vs. the "do-not-demo" list** (`MASTER_GAP_REGISTER` §4): HARDWARE_KEY (no physical key), iOS app (not built), BYOD (design only), biometric demographics (route 404s), bio "sprint-4" endpoints (internal-only), pairwise OIDC sub (dormant). Decide how to *describe* each truthfully ("supported / on the roadmap / internal capability") rather than demoing them live.

7. **Poster paper metrics** (CASIA AUC, ISO 30107-3 grades, iBeta). These are flagged for integrity review and the "100% / ACER 0%" learned-fuser result is NO-MERGE. Decide what the poster claims; iBeta is "submission pending," not "certified." Don't state them as verified facts if a professor asks for reproducibility.

## 🟢 Provisioning / hardware (post-demo unless you want the capability live)

8. **APK signing keystore** — provision the upload keystore + 4 GitHub Actions secrets so CI can produce signed release APKs. (P1 operator item carried from 2026-05-11 handoff.)
9. **FIDO2 / YubiKey purchase** — to demo HARDWARE_KEY end-to-end.
10. **CSCA trust roots** — only if you want **passport/eID chip** verification to actually work: obtain CSCA root certs (ICAO PKD or national authority) and drop them in `biometric-processor/app/core/csca_trust_store/` (no rebuild — mtime-cache reloads). Without this, passport/eID chip auth stays fail-closed. (Plain campus cards don't need this.)
11. **iOS app** — needs a Mac + Apple developer account (large effort; roadmap).

## ⚪ Hygiene (non-blocking)

12. Twilio/SMTP credential rotation (creds work; rotation is hygiene).
13. `grafana.fivucsas.com` DNS A record (cosmetic).
14. Self-hosted GitHub runner re-pairing (ubuntu-latest fallback works; just don't run CI during the demo).
15. Consider adding Uptime Kuma monitors for `amispoof.fivucsas.com` + `links.fivucsas.com` if they're on the demo path.

---

**What I'm handling (not on this list):** all code/security/data fixes in `MASTER_GAP_REGISTER`, the NFC fix (done), the config-login bypass (done), doc/claim corrections, and the live end-to-end verification per `VERIFICATION_ROADMAP_2026-06-01.md` (I'm authorized to create + clean up disposable test data on prod).
