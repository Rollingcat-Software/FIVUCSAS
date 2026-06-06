# FIVUCSAS Graduation Thesis — Deliverables & Finalization Guide

Generated 2026-06-05. Software-Oriented track. ~32,000 words, 7 chapters + 3 appendices,
20 figures, 25 tables, 5 equations, 52 references.

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
