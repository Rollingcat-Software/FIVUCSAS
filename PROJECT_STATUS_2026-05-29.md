# FIVUCSAS — Project Status & Jobs Board (2026-05-29)

Single living snapshot of what's done, what to test, and what's open. Supersedes ad-hoc session notes; see git history + CLAUDE.md for detail.

---

## ✅ Shipped this session (2026-05-29) — live + merged

| Item | Where | Status |
|---|---|---|
| Dark-mode "black box" MFA code inputs fixed | web-app #108 | Live (app.fivucsas), user-verified |
| Auth-flow edit data-loss bug (delete→create) hardened to create-first | web-app #108 | Live |
| AuthFlowBuilder dropped-default bug (`initialIsDefault`) | web-app #108 | Live |
| Marmara default login → PASSWORD + pick-one {EMAIL_OTP, TOTP, QR_CODE} | prod DB | Live (rollback runbook in identity-core-api/docs) |
| **Card model → Ayşenur's 12.3 MB YOLOv8n** (client) | web-app #109 + bucket | **Live + user-verified working** |
| Card detection made **client-only** (server fallback removed) | web-app #111 | Live (CI) |
| Card model server side (best.onnx in repo, best.pt dropped) | biometric-processor #116 | Merged — **bio container rebuild NO LONGER NEEDED** (server card path removed) |
| Launcher rollout finished (demo subpages, landing download/poster) | FIVUCSAS #77 | Live |
| `amispoof` → **"Am I Spoof?"** display rebrand (launcher tile, page hero/titles, landing labels) | web-app #110, spoof #66, FIVUCSAS #78 | Live |
| Verify launcher — landing + integrator explainer only (NOT active auth) | web-app #111 | Live + verified per-surface |

---

## 🔬 What to test now (all live)
1. **Card detection** — scan a Turkish ID / passport / student / driver / academic card on app.fivucsas → detects correctly + loads ~4× faster (12 MB vs 51 MB). ✅ confirmed working.
2. **"Am I Spoof?"** label shows in the launcher app-switcher on every site, on amispoof.fivucsas hero, and landing CTA/footer.
3. Launcher present on demo.fivucsas (+ dashboard/callback), fivucsas.com/download.html, /poster/ ; old grey suite bars gone.
4. (Verified) dark-mode MFA inputs; Marmara pick-one login.

---

## 🟠 Open tasks / roadmap

### P1 — finish what's in flight
- [ ] Update parent `CLAUDE.md` card-detection note (still says "nano not delivered" + describes a server fallback that no longer exists) + memory. (doc only)
- [ ] OPTIONAL cleanup: the now-unused backend `/biometric/card-detect` endpoint (identity-core-api proxy + bio YOLO) can be removed — card detection is client-only as of web-app #111. Harmless if left.
- [ ] Poster (`landing-website/public/poster/files/*.html`) — check for any remaining lowercase "amispoof" display text (minor).
- [x] ~~bio container rebuild for card model~~ — NOT needed; server card path removed (#111).
- [x] ~~verify.fivucsas launcher decision~~ — done: landing + explainer only (#111).

### P2 — held PRs (need work before merge)
- [ ] web-app **#90** — server-side puzzle validation; its 2 backend routes are unshipped (soft-passes on 404).
- [ ] biometric-processor **#105** — DeepFace load-failure vs spoof verdict; needs rebase (`liveness_errors.py` already on main).
- [ ] spoof-detector **#54** (flash-temporal replay probe) + **#56** (readiness gate, stacked) — paper-section rebase + pilot-table integrity.
- [ ] spoof-detector `learned-fuser` branch — **NO-merge** flag (100% / ACER 0.00% on 120-video subset → reproducibility review first).

### P2 — quality / tests
- [ ] biometric-processor pre-existing failing unit tests (baseline rot) — e.g. `test_light_challenge_service.py` (liveness). Not blocking; CI red on bio.
- [ ] Re-request Copilot review on recent PRs (it errored out on #108/#109/#116 — Copilot infra, not our code).

### P3 — operator / infra backlog (from 2026-05-11 handoff + audits)
- [ ] DNS A record (TurkTicaret), Twilio/SMTP rotation, APK keystore, Stripe, iBeta, Hetzner self-hosted runner GitHub-side scope fix, V57-A pg_partman.
- [ ] GDPR/KVKK data export + purge gap (audit 2026-04-16).
- [ ] DKIM; parent Dependabot #28.
- [ ] spoof-detector paper integrity (unreproducible CI / untraced calibration table).

---

## Notes
- **Hostinger CI auto-deploys web-app from `main` on merge** — prefer that over manual `rsync` from local (stale-tree risk). Static sites (landing/bys-demo/amispoof/links) deploy via `scp`/`rsync` per CLAUDE.md.
- Client ONNX models are gitignored + served from the `app.fivucsas.com/models/` bucket; integrity guarded by `web-app/public/models/manifest.json` SHA256 (`fetch-models.mjs` at build).
- Launcher source of truth: `web-app/public/launcher.js` → bucket `app.fivucsas.com/launcher.js`; shared by every suite site.
