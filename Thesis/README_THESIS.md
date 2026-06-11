# FIVUCSAS Graduation Thesis — Deliverables & Finalization Guide

Generated 2026-06-05. Software-Oriented track. ~32,000 words, 7 chapters + 3 appendices,
20 figures, 24 tables, 5 equations, 52 references.

## Files

| File | What it is |
|------|------------|
| **`FIVUCSAS_Thesis.docx`** | **The submission file.** Built into the official `CSE4198_Thesis_Template_Software_Oriented` — title/approval pages filled, abstract, acknowledgements, auto Table of Contents / List of Figures / List of Tables, 7 chapters (each on a new page, arabic page numbers from Chapter 1), real diagrams embedded, References, Appendices A–C. |
| `FIVUCSAS_Thesis.md` | Readable / shareable / citeable master (same content; figures embedded, citations as `[n]`). |
| `00_PROFESSOR_EMAIL_AND_REQUIREMENTS.md` | The professor's email + deadlines + requirements. |
| `build/` | Intermediate artifacts: `facts/` (ground-truth extracted from the real codebase), `chapters/*.md` (per-chapter sources), `reviews/` (compliance + accuracy + quality audits), `bibliography.md`, and the `assemble.py` / `make_md.py` generators. |

## ⚠️ Do this in Microsoft Word before submitting (2 minutes)

1. **Open `FIVUCSAS_Thesis.docx` in Word.** It is set to refresh fields on open; if prompted *"update fields?"* choose **Yes**. Otherwise press **Ctrl+A** then **F9**, and for the Table of Contents choose **"Update entire table."** This populates the Table of Contents, List of Figures, List of Tables, the `Figure x.y` / `Table x.y` numbers, and all page numbers.
2. **Check the cover + approval pages.** Title, the three author names, supervisor, and year are already filled in black (no red placeholders remain). Add the advisor's signature line on the Approval page if your department expects a physical signature.
3. **Spell-check** (the Guide requires it) and skim once in Print Layout.

## Confirm with your advisor / Kübra Uludağ (format check)

- **Template choice.** Built as **Software-Oriented** (it is a deployed multi-tenant SaaS product). If your advisor prefers **Academic-Oriented**, tell me and I will rebuild Chapter 3 / Chapter 5 into that structure.
- **Course code on the cover.** The template's boilerplate line reads **"CSE4197 / CSE4198"**. The professor's email header says **CSE4198/CSE4298** and your PSD/ADD used **CSE4297**. I left the template's line untouched — change it on the cover if Kübra wants a specific code.
- **Margins / binding.** The template encodes the Guide's 3.5 cm binding margin as 2.5 cm + 1 cm gutter; left as-is.
- **One diagram (`arch_overview`) appears in both Chapter 2 and Chapter 3.** That is intentional (overview vs. architecture) but if you prefer it only once, say so.

## Accuracy posture (important for defense)

Every technical claim was grounded in the real codebase (Spring Boot 3.4.7, PostgreSQL 17 + pgvector,
Flyway V0–V83, Facenet512/MTCNN/MediaPipe/MiniFASNet, Traefik, ~4,400 authored tests). FAR/FRR/APCER
and latency numbers are labelled **targets / controlled-test**, never as audited production results, and
the unverified "100 % accuracy" poster claim is **explicitly disavowed**. See `build/reviews/accuracy.md`.

## Submission deadlines (from the professor)

- **Sat 13 June 2026, 22:00** — softcopy to advisor (content) **and** Kübra Uludağ (format). No extension.
- **Mon 22 June 2026, 17:00** — 2 bound hardcopies to the department + final PDF to Kübra.

## Regenerating after edits

Edit the chapter Markdown in `build/chapters/`, then:

```bash
cd /opt/projects/fivucsas/Thesis/build
python3 assemble.py    # rebuild FIVUCSAS_Thesis.docx
python3 make_md.py     # rebuild FIVUCSAS_Thesis.md
python3 verify.py      # structural sanity check
```

Embedded figures are vendored under `build/figures/` (mapped by the figure catalog in
`build/bibliography.md`), so the rebuild is self-contained — no other checkouts needed.

## Poster cross-check + measured results (2026-06-11, round 2)

Compared the v6 poster (PDF text layer + HTML) against the thesis and the code:

- **Added the poster's controlled recognition benchmark to §5.8.3** (user-approved): LFW
  AUC 0.9943 / EER 1.93% / FAR 0.27% @ 0.45 / TAR 95.6%; CFP-FP AUC 0.9845; AgeDB-30 AUC
  0.9475; 1,342 images / 100 identities / 12,062 pairs — labeled controlled-benchmark,
  not production-audited. **Added the measured latency snapshot to §5.6** (~410 ms P95
  verification, ~66 ms auth, ~62 ms JWKS, spot measurements under light load).
- **Added the hand-gesture challenge channel to §4.3.1** (code-verified against
  `gesture_liveness.py` + `active_gesture_liveness_manager.py`): the 9 server-verified
  hand challenges via 21-point MediaPipe Hands landmarks.
- **Fixed a stale accusation in §5.8.3**: the "100% accuracy / ACER 0.00%" figure is NOT
  on the final v6 poster (its only "100%" is "5 random × 20%"); reworded to "early
  promotional material" + noted the final poster does not carry it.
- **Defense notes (poster is printed; thesis is correct, just be ready):** poster says
  "82 migrations V0→V75" (stale; real: 84, V0–V84); poster shows both "30 controllers"
  and "29 controllers" (29 is right); poster's "0.40 passive + 0.60 active, PASS ≥ 65"
  fusion is a simplification — the code uses dynamic weights
  (`passive_weight = 0.40 + 0.34·quality + 0.18·reliability`, enhanced_liveness_detector);
  the "23-action library" IS canonical and code-verified (corrected 2026-06-11 round 3):
  `web-app/src/features/biometric-puzzles/BiometricPuzzleId.ts` defines all 23 (14 face,
  mirrored by `lib/biometric-engine/types` `ChallengeType`, + 9 hand via a real lazily
  loaded MediaPipe HandLandmarker); the bio server's own enum carries 7 face + 9 hand,
  with `active_gesture_liveness_manager.py` re-scoring the hand channel server-side.
  §4.3.1 now describes the full 23-challenge library.

## Content & accuracy + format pass (2026-06-11)

Two audit agents (full reports: `build/reviews/accuracy_2026-06-11.md` + `build/reviews/gaps_and_improvements_2026-06-11.md`) drove this pass; ~130 code-grounded claims re-verified (117 ✅ / 2 ❌ / 11 ⚠️), all findings fixed:

- **Equations now render as native Word math (OMML)** — previously all 5 appeared as raw LaTeX
  text in the docx (instant format-fail). `assemble.py` builds real `m:oMath` objects; the
  blank-line-after-`[[EQ]]` tokenizer bug (which also caused the MD's empty-backtick artifacts)
  is fixed in both generators. `verify.py` now counts OMML objects and flags leftover LaTeX.
- **Backtick leak fixed**: inline code nested in bold (`` **`code`** ``) no longer prints literal
  backticks in the docx.
- **Figures 4.4–4.7** (the four FSM diagrams) are now referenced in text; the §2.3.1 verb-less
  "…(weekly, grouped). Figure 2.4" fragment is a real sentence; the one verbatim PSD sentence in
  Ch1 was rephrased (Turnitin risk).
- **All tables now referenced as "Table x.y"** (was "the table below" everywhere); the Ch3 copy
  of the test-inventory table was dropped (duplicate of Table 5.3) → 24 tables.
- **Counts refreshed to the 2026-06-11 source tree** (post-#209–#211 drift): JUnit **1,595/179**
  (+22 parameterized), Kotlin **561/64** (489 common + 30 instrumented + 25 desktop + 17 JVM —
  the old 568=486+34+25 didn't sum), spoof-vitest 256→**276**, TS analyzers 25→**26**, Flyway
  **84 files V0–V84** (V84 row added to Appendix A; prod still V83), JPA entities 32→**31**,
  tenant-filtered entities 8→**9** (UserSettings), Android **v5.3.1**, bio "roughly 70"
  endpoints. Total: **≈4,405 authored tests across 444 files**.
- **Stale claim killed**: ch7 no longer says the in-browser card model is "an oversized YOLOv8m"
  (the 12.3 MB YOLOv8n has been deployed since 2026-05-29); limitation/future-work re-scoped to
  training-data breadth. Quality-floor adjective fixed (50 is *stricter* than 40, not more
  lenient); OTP deletion happens on the **5th** wrong guess; HNSW wording softened (legacy table
  HAS one; operative `face_embeddings` index is IVFFlat).
- **Executed results added to Ch5**: the 2026-06-07 green run (1,670 run / 0 fail / 67 skipped).
- **References**: 22 web entries gained the Guide-required year; ref's "Challapalli, et al."
  expanded to the full four-author list and the journal name corrected to *Journal of Computer
  Allied Intelligence*.
- **Humanization round 2**: self-congratulatory meta-rhetoric cut ("is itself a measure of the
  thesis's integrity", "that restraint is itself a … contribution", "candid and, we think,
  respectable"), several "not merely / not X but Y" templates flattened, the repeated
  photo-cannot-blink signature phrase deduplicated, ch2/ch6 present-tense leftovers → past.

## Content & accuracy pass (2026-06-06)

- **Formatting** was reverse-checked against the Guide's *Headings / Font / Line-Spacing* rules and corrected:
  chapter titles UPPER/Bold/14pt/**left-justified**/no-underline; level-1 Bold/12pt/0.6cm; level-2 **Normal**/underlined/12pt/1.2cm;
  body justified, 1.5 spacing, **0.75cm** first-line (incl. abstract & acknowledgements); roman→arabic page numbering; ToC/LoF/LoT auto-refresh on open.
- **Every chapter was copy-edited** (conservative humanization pass): AI-tells removed, tense normalized to past, redundancy cut, a stray tool-leakage artifact (`</content>`) removed from ch7, and one internal load-test contradiction fixed (ch5, verified against `load-tests/scenarios/`).
- **All quantitative claims were verified against the live source tree** and reconciled:
  - Tests (authored, clean counts): JUnit **1,591** · pytest **888** · vitest **1,029** · Kotlin **568** · Playwright **336** → the thesis's "≈4,386 / ~4,400 authored tests" is accurate. (`CLAUDE.md`'s "~1,800 / 633 Java" is **stale**.)
  - Flyway: **83** migration files spanning **V0–V83** (V13 unused) — fixed the thesis's earlier "84 migration files".
  - Anti-spoofing analyzers: **13** Python + **25** TypeScript — matches the thesis exactly.
- Build is clean: 7 chapters, 35 H2, 37 H3, 25 tables, 20 figures, 5 equations, 52 references, **0 leftover markers**.

## Website: `fivucsas.com/thesis/` — Coming-Soon page

A branded page (sibling of `/poster/`) lives at `landing-website/public/thesis/index.html`. It exposes **no thesis
prose** — only the public cover, verified stats, and chapter titles — and is set to **`<meta robots noindex>`** plus
`body[data-published="false"]`, so it is safe to deploy *before* submission (no similarity-checker self-match risk).

**Deploy the coming-soon page (Hostinger, fivucsas.com):**
```bash
scp -P 65002 -r /opt/projects/fivucsas/landing-website/public/thesis \
  u349700627@46.202.158.52:~/domains/fivucsas.com/public_html/
```

**To GO LIVE after submission & format/similarity check (one edit + drop files):**
1. Generate the artifacts into the page folder:
   ```bash
   mkdir -p landing-website/public/thesis/files
   cp Thesis/FIVUCSAS_Thesis.pdf  landing-website/public/thesis/files/   # PDF you exported from Word
   cp Thesis/FIVUCSAS_Thesis.docx landing-website/public/thesis/files/
   # (optional) render Thesis/FIVUCSAS_Thesis.md → landing-website/public/thesis/read/index.html
   ```
2. In `index.html`: change `<body data-published="false">` → `"true"` and remove the `noindex` meta.
   The locked "soon" chips hide and the real View/Download/Read links activate automatically.
3. Re-deploy with the same `scp` command above.
