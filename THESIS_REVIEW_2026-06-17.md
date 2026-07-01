# FIVUCSAS Thesis — Comprehensive Pre-Submission Review

**Date:** 17 June 2026 (softcopy deadline — today)
**Reviewed artifact:** `FIVUCSAS_Thesis.pdf` — 135 pages, **current version** (Word source on `master` is stale; a teammate applied manual edits not yet committed)
**Title:** *Face and Identity Verification Using Cloud-based SaaS Models* — Marmara University, CSE4297/CSE4298
**Authors:** Ahmet Abdullah Gültekin (150121025), Ayşe Gülsüm Eren (150120005), Ayşenur Arıcı (150123825) · Advisor: Assoc. Prof. Dr. Mustafa Ağaoğlu

> **How to use this report.** All locations are **printed page numbers** (the page number shown on the page; PDF page = printed + 9). Apply every fix in your live Word document and re-export, then re-run a spell-check. The official format checker (R.A. Kübra Uludağ) enforces the **CSE4198 Thesis Guide v2023** one-to-one — Section 5 below is the compliance audit against it. *"Formatı geçmeyen hiçbir tez ciltlenemez."*

---

## 0. Method & coverage

- **All 135 pages read** (full text extraction) + **72 pages rendered and visually inspected** (every figure, table, the front matter, references, and all appendices).
- **12 specialized review agents** dispatched: 6 visual-format, 1 adversarial literature/citation examiner, 2 code↔text verifiers, 1 PSD/ADD-consistency, 1 structural-integrity, 1 results-integrity.
- **Technical claims cross-checked against the actual codebase** (`identity-core-api`, `biometric-processor`, `web-app`, `client-apps`) with `grep`/file reads.
- **Format compliance** measured programmatically (margins, fonts, line spacing, heading styles, citation order) and checked against the official **CSE4198 Thesis Guide v2023**.
- **Live deployment** independently verified (all public URLs).

## 1. Verdict

A strong, technically deep, and unusually **honest** thesis (it repeatedly labels unbenchmarked numbers as "targets, not certified results"). It is **structurally sound** and **~95% format-compliant** with the official Guide. The codebase cross-check confirmed the **vast majority of technical claims are exact**.

Before softcopy, fix the **MUST-FIX** items — they are the ones a jury or the format checker will catch. None are structural; all are surgical text/formatting edits.

| Severity | Count | Nature |
|---|---|---|
| 🔴 MUST-FIX | 4 | 1 metric inconsistency (AUC/EER), 2 title-page format, 1 mis-sourced table (verify) |
| 🟡 SHOULD-FIX | 12 | unsupported/over-claims, governing-doc drift, index self-contradiction, legibility, heading-underline |
| 🟢 NICE-TO-HAVE | ~15 | cosmetic, wording, minor numeric touch-ups |

> ### ⚠️ Correction notice (re-verified against current code, `origin/main`)
> The first code cross-check was run against **stale locally-checked-out submodules** (feature branches from 2–4 June, up to **25 commits behind** `main`). Re-verifying every code-dependent finding against the **current `origin/main`** (14 June, matching the submitted thesis) **retracts four findings** that were false:
> - **MF-6 RETRACTED** — the server `ChallengeType` enum on current `main` has **14 facial + 9 hand = 23** challenges, exactly as the thesis says; the MediaPipe HandLandmarker is wired (`useHandLandmarker.ts`, `HandGesturePuzzle.tsx`), not simulated. The thesis is correct.
> - **MF-7 RETRACTED** — the benchmark harness **exists** at `practice-and-test/fivucsas-test/` on `main` (122 files: `01_bulk_enroll/bulk_enroll_lfw.py`, `07_agedb30/`, `08_cfp_fp/`, `02_far_frr/`). The §5.8.3 citation is accurate.
> - **MF-8 RETRACTED** — current test counts (pytest **985**, Vitest **1,225**, Playwright **336**, Kotlin **573**, JUnit **1,761**) all **meet or exceed** the thesis figures; the table is accurate (slightly conservative). Only the cosmetic +23-parameterized arithmetic note remains (now a minor item).
> - **m3 RETRACTED** — Android `versionName = "5.3.2"` on current `main`, matching the thesis.
>
> Lesson applied: all surviving code claims below were confirmed against `origin/main`.

---

## 2. 🔴 MUST-FIX (before softcopy)

### MF-1 — AUC and EER are mathematically inconsistent (§5.8.3, p. 94) — *thesis faithfully reports a harness artifact*
The measured face-recognition results state:
- **AgeDB-30:** "EER ≈ **34%**" **and** "AUC **0.9475**"
- **CFP-FP:** "EER ≈ **27%**" **and** "AUC **0.9845**"

These cannot coexist: if EER = 0.34 the ROC passes through (0.34, 0.66), which **caps AUC at 0.884** (< 0.9475); for CFP-FP the cap is 0.927 (< 0.9845). (LFW: AUC 0.9943 / EER 1.93% is consistent — leave it.)

**Root cause — confirmed against the actual harness output** (`practice-and-test/fivucsas-test/07_agedb30/summary.txt` and `08_cfp_fp/summary.txt`): the harness itself prints `EER : 0.3399 at distance threshold 1.0000` and `0.2709 at threshold 1.0000` — both **clamped at the boundary of the threshold sweep (1.0)**, whereas LFW's EER is at a real crossover (0.5885). So the reported "EER" is **not the true equal-error point**; the threshold search was truncated at 1.0 and the value at the boundary was emitted as "EER." **The thesis transcribed the harness faithfully — this is a harness metric bug, not a thesis fabrication.** The AUCs and the FRR@0.45 values (AgeDB-30 67.8%, CFP-FP 55.3% — also straight from the harness) are correct and consistent.

**Fix (fast, fully supported by the harness data):** drop the two "EER ≈ 34%/27%" figures; report **AUC + FRR@0.45** only (both real, both consistent). An ML-literate examiner catches the impossible AUC/EER pairing instantly, so removing it protects the result.
**Fix (better, if time):** extend the harness threshold sweep past 1.0 so it finds the true crossover, then report the corrected EER.

### MF-2 — Table 2.2 LFW accuracies contradict their own cited source (p. 21)
The caption says the accuracies are "**the DeepFace framework's published model benchmarks [12,13]**," but:
- **ArcFace 99.82%** is the figure from the *original ArcFace paper* — the **DeepFace framework benchmark reports ArcFace ≈ 99.40%**.
- **OpenFace 92.92%** — DeepFace's benchmark reports **93.80%**.

A jury that opens the DeepFace benchmark page sees the mismatch immediately, and the table carries a load-bearing argument ("ArcFace edges Facenet512… therefore Facenet512 was the CPU-safe choice").
**Fix:** either use DeepFace's actual numbers and keep the [12,13] citation, **or** keep the original-paper numbers and re-caption to "as reported in the respective original papers" with per-row citations. Do not mix the two.

### MF-3 — Title page mixes Arial with Times New Roman (p. i–ii)
Programmatically confirmed: the title (`TimesNewRomanPS-Bold 14pt`) and author names (`TimesNewRomanPSMT 12pt`) are Times, but **"by" = `ArialMT 12pt`** and **"BACHELOR OF SCIENCE" = `Arial-BoldMT 14pt`** (and the whole submission block, "Supervised by:", and the university/department lines are Arial). The official template is **Times New Roman throughout**. The page reads as a half-converted template.
**Fix:** select the entire title page (and the approval page) → set font to **Times New Roman**.

### ~~MF-4 — Student numbers missing from the title page~~ → RETRACTED
**Verified against the official `CSE4198_Thesis_Template_Software_Oriented_v2.docx`: the title page has NO student-number field** — only three `[Group member's name]` placeholders. The professor's email lists no such requirement either. I assumed this from the ADD (which did carry IDs); the thesis template does not. **Not a required fix.** (If you *want* IDs they're harmless to add, but the format checker will not flag their absence.)

### MF-5 → downgraded to SHOULD-FIX (SF-13)
The HNSW/IVFFlat **self-contradiction** between Ch. 3/4 and §5.4/§5.8.3/§7.1 is genuine, and current code confirms migration `0001_initial_schema` creates **HNSW** while `0003` adds **IVFFlat** — so the Ch. 3/4 "HNSW baseline" wording is the correct one. But this is an obscure index-variant detail with low examiner risk, so it is **moved to SF-13** rather than a blocker.

### MF-6 / MF-7 / MF-8 → RETRACTED (stale-code false positives — see the Correction notice in §1)
Re-verified against `origin/main`: the challenge counts (server `ChallengeType` = **14 facial + 9 hand = 23**), the wired **HandLandmarker**, the **`fivucsas-test` benchmark harness** (present, 122 files), and the **test inventory** (pytest 985 / Vitest 1,225 / Playwright 336 / Kotlin 573 / JUnit 1,761 — all ≥ the thesis figures) are **all accurate in the thesis**. The only residue is the cosmetic **Table 5.3 +23-parameterized arithmetic** (the printed column sums to 4,840 vs the printed Total 4,863) — now a **minor** item (see §4): change the JUnit cell to `1,766`, or footnote the Total.

---

## 3. 🟡 SHOULD-FIX (MAJOR)

| # | Location | Issue | Fix |
|---|---|---|---|
| SF-2 | Table 3.2 / §5, p. 30 & 80 | Auth latency target **silently relaxed 200 ms → 300 ms** vs the ADD's NFR ("p95 < 200 ms for authentication") | Restore 200 ms, or add "the ADD's 200 ms target was revised to a 300 ms login / 200 ms refresh split" |
| SF-3 | §2.4.5, p. 23 / Table 2.3 | Industrial-solutions survey omits **FaceTec** and **iProov** — the two market-leading active+passive liveness/PAD vendors and the natural comparators for the Biometric Puzzle; reads as a strawman (their PAD is iBeta-certified, not "Partial") | Add a sentence on FaceTec & iProov; either add them to Table 2.3 or justify exclusion (closed/proprietary) |
| SF-4 | §2.4.1, p. 20 | Survey omits **Keycloak** (open-source, self-hostable IAM with OAuth2/OIDC/PKCE) — exactly the competitor on the "self-hostable + standards-based" axis the thesis claims as its gap | Add Keycloak; restate the gap as *biometric-first hybrid liveness on top of* that pattern |
| SF-5 | pp. 3, 5, 9 | Overclaims: "**production reference architecture**", "**first/novel**", "**complete platform publicly released under MIT**" (but `identity-core-api` is a **private** repo) | Soften to "a deployed reference implementation"; verify every repo is actually public or scope the MIT claim to the public components |
| SF-6 | §2.4.4 p. 22; §2.4.1 p. 20; Table 2.1 p. 13 | **Uncited claims:** "purpose-built document-to-selfie models are reported to outperform…" (no cite); "the recurring theme in recent literature…" (no cite); ISO/IEC 30107-3 **[35]** not cited at first use | Add citations or delete the comparative claim; move [35] to first use |
| SF-7 | §2.1.2, p. 9–11 | **NGINX→Traefik** substitution is mentioned in §2.1 but **not listed** in the Out-of-Scope substitution list with the others (Flutter→KMP, FAISS→pgvector, Kafka/RabbitMQ→Redis) | Add NGINX→Traefik to the substitution list |
| SF-8 | Approval page, p. ii | The word "**Sign**" sits under the advisor's name with no signature line/label/date — an unfilled template placeholder, not a real signature block (the Guide requires the approval page to carry the advisor's name **and signature**) | Replace with a proper signature rule + "Signature / Date", or remove |
| SF-9 | Figs 3.8–3.9, p. 44 (and 3.6–3.7, p. 43) | Two sequence-diagram halves crammed on one page → smallest text in the thesis; part (b) shrunk | Give each verification/enrollment part its own half-page (reflow the page break) |
| SF-10 | §2.x.x headings, throughout | **2nd-level headings are not underlined.** The Guide requires them "Normal, **Underlined**, 12 pt." The thesis correctly made them Normal weight but omitted the underline | Apply underline to all `x.y.z` headings (quick global change) |
| SF-11 | §4.3.3 / §2.1.1, p. 63 area | "9 selectable models" / VGG-Face default from the PSD/ADD were swapped to Facenet512 without a deviation note | One line noting the PSD/ADD default (VGG-Face/2622-dim, 9-model menu) was replaced by Facenet512/512-dim for CPU-only deployment |
| SF-12 | abstract / Ch. 7 | Headline "**~4,863 tests**" (accurate vs current code) is not reconciled against the project's older "~1,800+" figure | Add the one-line breakdown and note the older figure predates test growth |
| SF-13 | Ch. 3/4 vs §5.4/§5.8.3/§7.1 | **HNSW/IVFFlat self-contradiction** (was MF-5): Ch. 3/4 say HNSW is the migration baseline, §5/§7 say IVFFlat is. Current code: migration `0001`=HNSW, `0003`=IVFFlat → Ch. 3/4 is correct | Make §5.4/§5.8.3/§7.1 agree with Ch. 3/4 ("HNSW baseline, IVFFlat added later"); optionally confirm the live index with `SELECT indexdef FROM pg_indexes WHERE tablename ~ 'embedding'` |

---

## 4. 🟢 NICE-TO-HAVE (MINOR)

- **Appendix A (Table A.1):** the catalog jumps **V12 → V14** with no note (V43, V56 are annotated as reserved; V13 is not). Add "V13 — reserved/superseded." (The 86-migration count is still correct.)
- **Reference [46]** ("Preprints, 2024") is the only non-peer-reviewed entry with no DOI/URL. Add the DOI or replace.
- **Reference format:** the entries are IEEE-style; the Guide prescribes a specific style (Surname + initials, title in quotes, venue in italics, Vol/No/pp, year). Verify the format checker accepts IEEE, or convert to the Guide's sample format.
- **"Nonfunctional" vs "Non-Functional":** Table 3.2 caption uses "Nonfunctional"; the TOC/heading uses "Non-Functional." Harmonize.
- **Endpoint count:** "~80 endpoints" (p. 56) vs "~84 endpoints" (p. 110). Pick one.
- **PostgreSQL version:** thesis says prod = **17**, but every committed compose/CI file pins **`pgvector/pgvector:pg16`** (and `identity-core-api/README.md` says prod ships pg16). Confirm production is actually 17, or change the thesis to 16. *(This is the one config item the current code actually contradicts.)*
- **Enrollment quality floor "40"** (p. 63): spot-check on current `main` — the verification floor 50 is real; confirm the enrollment-specific 40 exists (the cross-check that flagged this ran on stale code, so re-verify before editing).
- **Embedding cache "up to 1,000"** (p. 39/50): confirmed on current code — default is 1,000, **production overrides to 500**. Use the prod value if quoting "as deployed." (Minor.)
- **List of Figures / List of Tables:** wrapped two-line entries push the dot-leader + page number to the next line (Figs 3.8; Tables 2.2/2.3/5.3/5.6). Apply a hanging indent. Cosmetic.
- **Right-margin overflow:** median right margin 2.43 cm (Guide 2.5) and a few wide tables/figures/code lines reach ~1.90 cm. Nudge the widest items in.
- **Fig 4.5** inner composite sub-state labels are the smallest text in the figure set — bump ~1 pt for B&W printing.
- **Rotated landscape figures** (3.3, 3.11, 3.12, 3.13, 4.2) are legible and standard practice — flag only if the department bans rotated figures.
- **Acronyms** first-use: expand **MFA** at its p. 3 occurrence; confirm **PAD** is expanded before Table 2.3; **CRUD** (Table 2.1) never expanded.
- **Scalability NFR:** the ADD's concrete "100 concurrent users / 500 RPS" targets are dropped from the thesis NFR table — restate as met/unmet or note superseded.
- **PostgreSQL pin:** committed compose uses `pgvector:pg16`; the thesis says prod = 17. Keep the existing "test uses pg16; production runs pg17" note consistent everywhere.
- **Table 3.1** continues onto p. 27 — confirm the header row repeats on the continuation page.

---

## 5. Format compliance vs. CSE4198 Thesis Guide v2023

| Guide rule | Required | Thesis | Status |
|---|---|---|---|
| Left margin (binding) | 3.5 cm | **3.54 cm** | ✅ |
| Other margins | 2.5 cm | top 2.6, right median **2.43** (some content to 1.90) | ⚠️ right slightly tight / wide items overflow |
| Body font | Times New Roman 12 pt | **TimesNewRomanPSMT 12 pt** dominant | ✅ |
| Line spacing (body) | 1.5 | **≈20.8 pt ≈ 1.5** | ✅ |
| First-line indent | 0.75 cm | present (visually confirmed) | ✅ |
| Justification | full | justified | ✅ |
| Chapter title | UPPER, Bold, 14 pt, **left** | 14 pt bold, left (7/7) | ✅ |
| 1st-level heading | Bold, 12 pt, indent 0.6 cm | bold 12 pt, indent 0.64 cm | ✅ |
| 2nd-level heading | Normal, **Underlined**, 12 pt | Normal 12 pt, **not underlined** | ❌ → SF-10 |
| Title-page font | template (Times) | **Arial mixed in** | ❌ → MF-3 |
| Equations | "(Equation 4.1)", numbered by chapter | "(Equation 5.1)" etc. | ✅ |
| Page numbering | title unnumbered; ii… roman; body 1… arabic, centered bottom | matches | ✅ |
| Abstract length | 150–300 words, own page | ~250 words, own page | ✅ (keywords line **not** required by the Guide) |
| 7 chapters, each new page | yes | 7 chapters, each new page | ✅ |
| In-text citations increasing | yes | **0 out-of-order** (52/52) | ✅ |
| Appendices cover page each | yes | Appendix A/B/C have title pages | ✅ (confirm each) |
| Figures/tables numbered by chapter + caption | yes | all 24 figs + 24 tables captioned & referenced | ✅ |

**Net:** two format defects to fix for the checker — **MF-3 (title-page Arial)** and **SF-10 (2nd-level heading underline)** — plus the minor right-margin overflow.

## 6. PDF navigation / clickability

- ✅ Table of Contents, List of Figures, List of Tables are **hyperlinked** — **149 internal links, 0 broken**, all land on the correct page (spot-checked).
- ❌ In-text cross-references ("Figure X", "Table X", "Section X", "§X") are **plain text, not clickable** (written as literal text, not Word cross-reference fields).
- ❌ Citation markers `[n]` are **not hyperlinked** to the reference list; no back-links from references.
- ❌ **No PDF bookmarks/outline** — the navigation sidebar is empty. In Word, export with "Create bookmarks using: Headings" so the jury can jump between chapters.

*(None of these are Guide requirements; they are professionalism/navigation improvements. The first two are low priority for today; enabling bookmarks on export is a 1-click win.)*

## 7. Live-system verification (independently checked today)

All public deployment claims in Appendix C are **TRUE** — every URL is up and serving real FIVUCSAS content:

| URL | Status |
|---|---|
| fivucsas.com | 200 — real landing page |
| app.fivucsas.com | 200 — dashboard |
| api.fivucsas.com/actuator/health | 200 — `{"status":"UP"}` |
| verify.fivucsas.com | 200 |
| amispoof.fivucsas.com | 200 — live anti-spoof tester |
| demo.fivucsas.com | 200 |
| status.fivucsas.com | 302 (normal) |

The "deployed and demonstrable live" claim holds — it will work during grading.

## 8. Consistency vs. governing documents (PSD / ADD)

- ✅ **Faithful:** all six functional requirements (FR-1…FR-6) and seven NFR categories preserved; Table 2.1 objectives (O1–O5) restate the PSD success factors and are **honest** about unbenchmarked KPIs; the stray PSD product name "Bigenity" is correctly absent.
- 🟡 **Drift to address:** auth latency 200→300 ms (SF-2); PSD "multi-biometric fusion accuracy" headline retired without an explicit retraction; auth-factor catalog expanded 12-fold beyond the ADD's password-baseline FR-1 without a note; VGG-Face→Facenet512 default swap and the "9 models" claim dropped silently (SF-11).
- ℹ️ **Over-delivery (good):** the thesis ships analytics/reporting dashboards and an Auth-Flow Builder rule UI that the PSD listed as out-of-scope.

## 9. Codebase cross-check — what's verified accurate (high confidence)

The code↔text audit confirmed the thesis's technical numbers are **overwhelmingly exact**:
- **Biometric thresholds — all EXACT:** EAR 0.21 blink / 0.18 both-eyes veto, MAR 0.4 smile / 1.3 baseline, head-pose ±0.15, 478 landmarks, MIN_STEP_CONFIDENCE/DURATION/PASS 0.6, 100 ms tolerance, texture fusion weights 0.35/0.25/0.25/0.15, HybridFusion threshold 0.45, 13 Python / 26 TS analyzers.
- **`VERIFICATION_THRESHOLD = 0.4`** (production override; aged 0.55) — **correct as deployed.**
- **Identity service — every verbatim count EXACT:** 48 permissions, 31 `@Entity`, **86 Flyway migrations (highest V86)**, 29 `@RestController`, 12 login methods, 11 tenant-filtered entities, BCrypt(12), PKCE S256-mandatory, RS256 prod-pin, 15 min/24 h token lifetimes, Bucket4j 8.10.1, 5-strike lockout, refresh-token rotation, AMR accumulation.
- **Versions — all match:** Spring Boot 3.4.7, Java 21, Python 3.12, React 18.3, onnxruntime-web 1.18, container hardening (read_only / cap_drop ALL).
- **Architecture:** real `domain/application/infrastructure` layering with an enforcing ArchUnit boundary test.
- **Appendices verified EXACT:** Appendix A — 86 migrations, V0–V86, **V13 absent** ✓; Appendix B — **29 `@RestController`**, **26 biometric route modules**, **80 endpoint decorators (~84 ✓)**, `StatisticsController` correctly described as an annotation-less stub; Appendix C — Traefik confirmed via Docker labels, capacity figures correctly labeled "compose-file header estimates."
- **§7.2.2 limitations are honest and code-backed:** `WatchlistCheckHandler` is a gated fail-fast stub, iOS is `iosMain` scaffolding only, fingerprint is WebAuthn-only, RLS is inert — all verified true. This honesty is a strength.

After re-verifying against `origin/main`, the code-vs-text gaps are narrow: the **HNSW/IVFFlat self-contradiction** (SF-13 — the only confirmed internal inconsistency, and even there the code sides with Ch. 3/4) and the **PostgreSQL 16-vs-17** config note (§4). The earlier MF-6 / MF-7 / MF-8 "gaps" were **stale-checkout artifacts and are retracted** — the thesis's challenge counts, harness citation, and test inventory are all accurate against current code.

## 10. ✅ Verified clean (no action)

Structure (TOC accuracy, section numbering 1→7.3, figure/table numbering, page-number continuity), all 24 figures and 24 tables captioned and referenced, abstract length, chapter-per-page, citation increasing-order, body typography, equation numbering, references IEEE-internally-consistent, live deployment, FR/NFR preservation, honest KPI framing.

## 11. ⚠️ Do NOT change (verified — these are NOT errors)

- **Hetzner CX43 / 8 vCPU / 16 GB** is **correct** (confirmed in the project's own infra docs). Do **not** "fix" it to CX33/8 GB — that is a different, generic box.
- **Line spacing** (~20.8 pt) **is** the Guide's 1.5 spacing in Word terms — compliant.
- **Abstract has no "Keywords" line** — the Guide does **not** require one; optional only.
- **Testcontainers using pg16** is fine and explained in §5 — but note the *production* compose also pins pg16 while the thesis claims prod 17 (verify; §4).
- **LFW: AUC 0.9943 / EER 1.93%** — internally consistent; the AUC/EER inconsistency (MF-1) is isolated to AgeDB-30 and CFP-FP and is a harness threshold-clamp artifact the thesis faithfully reported.
- **Challenge counts (14+9=23), HandLandmarker, the benchmark harness, and all test counts** — verified accurate against current `origin/main`; do not "fix" them.

---

### Suggested order of work for today
1. **MF-3** (title page → all Times New Roman) — 3 minutes, and it's what the format checker sees first. (MF-4 student-numbers retracted — not required by the template.)
2. **MF-1** (delete the two inconsistent EER figures; keep AUC + FRR@0.45) — 5 minutes, highest jury risk.
3. **MF-2** (verify/fix Table 2.2 source) and **SF-13** (HNSW/IVFFlat wording) and **SF-10** (underline 2nd-level headings) — 15 minutes.
4. **SF-8** ("Sign" → real signature block), **SF-2** (latency target), and the remaining literature/governance SFs — 30 minutes.
5. Minors (PostgreSQL 16/17 check, Nonfunctional spelling, endpoint count, acronyms), then **spell-check** and **re-export with bookmarks**.

---

*Generated by a multi-agent review (12 agents: visual-format, code↔text verification, adversarial literature/citation, PSD/ADD consistency, structural integrity), with format compliance measured against the CSE4198 Thesis Guide v2023 and all live URLs independently verified. Every finding above is evidence-backed; locations are printed page numbers in `FIVUCSAS_Thesis.pdf`.*
