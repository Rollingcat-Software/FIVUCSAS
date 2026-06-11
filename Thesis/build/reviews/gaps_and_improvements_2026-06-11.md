# Gaps & Improvements Audit — FIVUCSAS Thesis (2026-06-11)

**Deadline context:** softcopy due Sat 13 June 2026 22:00 (advisor + Kübra Uludağ format check).
**Scope:** builds on — and does not repeat — `compliance.md`, `quality.md`, `references_audit.md`,
`accuracy.md` and the 2026-06-06 pass recorded in `README_THESIS.md`. Everything below is **new or
newly-true** (several earlier "verified ✓" claims no longer hold against the *assembled* artifacts).
**Method:** full read of the Guide (all 8 pages, text-extracted), the assembled
`FIVUCSAS_Thesis.md` (2,563 lines), the chapter sources, and direct inspection of the
**submission file `FIVUCSAS_Thesis.docx`** via python-docx; PSD/ADD lineage and Ch4/Ch5
completeness verified by two delegated comparison passes; mechanical sweeps for citation order,
figure/table referencing, tense, and AI-tell density.

Priorities: **P0** = must fix before 13 June · **P1** = should fix · **P2** = nice to have.

---

## A. GUIDE / RULE COMPLIANCE GAPS

### A-1 (P0) — All 5 equations render as RAW LaTeX SOURCE in the submission .docx
- **Evidence:** `FIVUCSAS_Thesis.docx` contains **zero** Word math (OMML) objects
  (`oMath` count = 0). The equation bodies are literal text, e.g. the paragraph after
  "(Equation 4.1)" reads: `$$\text{EAR} = \frac{\lVert p_2 - p_6 \rVert + \lVert p_3 - p_5 \rVert}{2\,\lVert p_1 - p_4 \rVert}$$`
  and Equation 5.1's *label paragraph itself* is `$ \mathrm{ACER} = \dfrac{\mathrm{APCER} + \mathrm{BPCER}}{2} $\t(Equation 5.1)`.
- **Guide rule (p. 6):** equations must be indented, numbered by chapter ("(Equation 4.1)",
  parentheses required, number right-justified). The *numbers* exist (4.1–4.4, 5.1, emitted by
  `assemble.py:309`), but the visible math is LaTeX gibberish — an instant format-check fail and
  the single most visible defect in the file.
- **Fix:** replace each LaTeX block with a real Word equation (Insert → Equation, or render to
  EMF/PNG at assembly). Sources: `build/chapters/ch4.md:168,194,276,330` (`[[EQ:...]]` markers)
  and `ch5.md:376`. Keep the existing right-tab "(Equation x.y)" numbering. Also clean the four
  stray empty-code artifacts the markers leave in the readable MD
  (`FIVUCSAS_Thesis.md:721,749,833,889` — lines ending in a bare ``` `` ```).

### A-2 (P0) — Dangling sentence fragment "Figure 2.4" in §2.3.1
- **Evidence:** the paragraph ends `"…Dependabot kept dependencies current (weekly, grouped).
  Figure 2.4"` — a verb-less fragment, present in **both** `FIVUCSAS_Thesis.md:180` and the
  docx (paragraph 149).
- **Fix (1 line, ch2.md):** `"…(weekly, grouped). The development-and-deployment environment and
  the CI/CD context are shown in Figure 2.4."`

### A-3 (P0) — Figures 4.4–4.7 (the four FSM diagrams) are never referenced in text
- **Evidence:** mechanical sweep of the assembled text: every other figure (2.1–4.3) has an
  in-prose "shown in Figure x.y" reference; the four §4.7 FSM figures have captions only. (The
  earlier `compliance.md` §1 asserted "every figure placement is also referenced in prose" — that
  was true of the `[[FIG:]]` markers then, but is **no longer true** of the assembled document.)
  Every-figure-must-be-cited is the standard format-check rule and the document is otherwise
  consistent about it — the inconsistency itself will be noticed.
- **Fix:** one clause per FSM paragraph in `ch4.md` §4.7, e.g. "…can never transition back to a
  usable one, as shown in Figure 4.4." (likewise 4.5, 4.6, 4.7).

### A-4 (P0) — Markdown backticks leak into the .docx as literal characters
- **Evidence:** ≥8 docx paragraphs contain raw `` ` `` characters, e.g.
  "Web admin dashboard (\`app.fivucsas.com\`)…", "Hosted login (\`verify.fivucsas.com\`)…",
  "1,569 \`@Test\` methods…", "888 \`def test_\` functions…", "JWTs [24] minted by \`JwtService\` (jjwt 0.12.6)" — plus a code
  block pasted with backticks intact. Obvious tooling residue in the submission file.
- **Fix:** patch `assemble.py`'s inline-code handling to emit a monospace run (or strip the
  ticks), rebuild, and re-grep the docx for `` ` `` until zero.

### A-5 (P0) — One verbatim PSD sentence survives in Ch1 (professor: "birebir değil")
- **Evidence (delegated lineage pass):** Ch1 §1.1 — *"identity is fragmented across the physical
  and digital worlds, and across the ecosystems that own each fragment"*
  (`FIVUCSAS_Thesis.md:34`) is character-identical to the PSD's problem statement, and is in
  present tense. Everything else sampled was properly paraphrased and tense-converted.
- **Fix (1 sentence):** e.g. *"a person's identity remained fragmented across physical and
  digital systems, each fragment owned by a different vendor's ecosystem."* Cheap insurance
  against a Turnitin self-match with the already-checked PSD.

### A-6 (P1) — No table is ever referenced by number (all 25 tables)
- **Evidence:** mechanical sweep: Tables 2.1–C.2 are all introduced with "the table below",
  "summarized below", "the summary below…", never "Table 3.5 …". "Below" breaks whenever Word
  reflows a table onto the next page, and most format checkers expect numbered references for
  tables exactly as for figures.
- **Fix:** convert the lead-ins to numbered references ("Table 5.6 lists the k6 thresholds…").
  Since chapter sources use `[[TABLE: caption]]` markers, either hand-edit the assembled docx
  (25 edits) or add table-counter cross-references to the assembler.

### A-7 (P1) — Present-simple leftovers in the revised-from-PSD/ADD chapters (tense check)
Future tense is fully eliminated (zero "will / is going to" matches in ch1–ch3 + ch6 — verified),
and Ch2 even announces "we report the project in the past tense". But the professor's instruction
also names **geniş zaman** (present simple), and system-description present survives in patches:
- `ch2.md:106` — "demonstrating that the platform **is** economically viable to operate" (→ *was*).
- `ch2.md:116` — "Socially, the platform **strengthens** authentication security and **improves**
  user experience…" (→ *strengthened / improved*).
- `ch2.md` §2.3.2 Sustainability — "New biometric models or auth methods **can be swapped** in…"
- ch3 §3.1.1, FR paragraphs — "The system **authenticates** users…", "Verification **compares** a
  freshly captured sample…", "Tenants **are** first-class entities…", "Isolation **is enforced**
  in depth…" (`FIVUCSAS_Thesis.md:313–323`).
- ch3 §3.2.3 — "The platform **is operated** through four distinct surfaces…".
- ch6 §6.3 — "the platform **pushes** against the password reuse…", "it **advances** the social
  norm…".
**Fix:** either convert these (safest, matches the email literally), or keep the
"describing the delivered system in present" convention *consistently* and be ready to defend it
verbally — currently the chapters mix both within single sections, which reads as drift rather
than policy. At minimum convert the Ch2 examples (Ch2 is the chapter that promises past tense).

### A-8 (P1) — Reference-list format deltas vs the Guide's examples (pp. 7–8)
`references_audit.md` checked key *resolution*; the remaining issues are *format*:
- **Web entries missing the Year element.** Guide web format = author/source, *title*, **Year**,
  URL, accessed date. Refs **3–9, 12, 14, 16, 17, 19–23, 30, 31(has year ✓), 48(✓), 51, 52** mostly
  omit the year (e.g. [3] Spring Boot, [4] FastAPI, [8] pgvector, [14] MediaPipe, [16] MiniFASNet,
  [21] Traefik, [30] k6, [51] Testcontainers, [52] Playwright). Add a year (documentation edition
  or "2026") before the URL.
- **Ref [50] uses "et al."** ("Challapalli, S. S. A., et al.") — the Guide format lists every
  author (surname-initials for the first, initials-surname for the rest); no other entry uses
  et al. List the authors.
- (Minor) "Date accessed: June 2026" lacks a day; the Guide's example uses a full date
  ("15 Aralık 2012"). Harmless, but a pedantic checker may flag it.
- **Verified PASS (no action):** in-text citation first occurrences run strictly 1→52 with no
  gaps and no out-of-order introductions; multi-cites use the Guide's `[12,13]` shape; Ch5 title
  is "SOFTWARE TESTING" (correct software-oriented variant); abstract = **275 words** (in the
  150–300 band); acknowledgements present; appendices A/B/C labeled by ascending letter + title
  with `page_break_before` set.

### A-9 (P2) — Appendix "cover page" strictness
Guide p. 8: "A cover page must precede each appendix." The docx starts each appendix on a new
page with the heading "APPENDIX A — …" but there is no separate cover *page* per appendix. Most
format checks accept heading-on-new-page; ask Kübra Uludağ. If a strict cover page is wanted,
insert a page containing only "APPENDIX A" + title before each appendix body.

### A-10 (P2) — Bracketed landmark arrays can be mistaken for citations
§4.3.1 prose contains `[362, 385, 387, 263, 373, 380]` and `[33, 160, 158, 133, 153, 144]`
(`FIVUCSAS_Thesis.md:716–718`) — the same `[n, n, …]` shape as citations, and a naive
order-of-citation checker (like the one used in this audit) trips on them. Consider
"(landmarks 362, 385, 387, 263, 373, 380)".

### A-11 (P2) — Equation layout after the A-1 fix
When re-inserting real equations, match the Guide's layout exactly: equation indented, number
right-justified on the same line. The current label-line + separate body arrangement should
collapse to one line per equation where feasible.

---

## B. CONTENT GAPS / COMPLETENESS

The delegated Ch4/Ch5-vs-codebase pass confirms the chapters are genuinely comprehensive — the
hexagonal split, multi-tenancy/@Filter/TenantFilterBypass, all 10+2 auth methods, N-step MFA,
OAuth2/OIDC/PKCE, JWT kid-rotation, refresh-token family reuse detection, Biometric Puzzle with
equations and real code, passive PAD, pgvector IVFFlat, NFC eMRTD passive auth (fail-closed),
FSMs, hardened runtime, CI/CD, the 4,386-test inventory, and the isolation meta-assertion gate
are all present and accurate. The PSD/ADD lineage pass found **no missing required topic**
(scope, assumptions, KPIs, six realistic constraints, KVKK/GDPR, all four impact types,
limitations §7.2.2, future work §7.3 all present). Remaining gaps:

### B-1 (P1) — Ch5 contains almost no *executed* results; the Guide explicitly asks for them
Guide p. 4: "Results of tests/scenarios are given as part of the section." Ch5's honesty about
targets-vs-measured is exemplary, but the only executed evidence is the pytest bare-host baseline
("647 passed, 1 skipped, 1 xfailed; 50 passed/111 skipped"). Cheap, real additions before Saturday:
- The **green identity-API unit run** (2026-06-07: 1,670 run / 0 failures / 0 errors / 67 skipped,
  JDK 21) as one sentence + row in §5.3 or §5.10.
- A **per-repo CI status line** (all four pipelines green, dates) in §5.2.
- One **measured k6 baseline run** against staging: `load-tests/BASELINE_TESTING_GUIDE.md` and
  `demo-baseline-results.sh` already script exactly this. Even a single smoke-scale run with real
  p95s, labeled "single-host staging baseline, not a capacity claim," converts Table 5.6 from
  all-targets into targets-plus-one-measurement and removes the chapter's softest spot.

### B-2 (P1) — The team's REAL face-recognition evaluation (LFW/AgeDB/CFP-FP) is absent
Ch5 §5.8.3 and §7.2.2 say accuracy "is not formally measured" — yet Ayşenur's LFW/AgeDB/CFP-FP
evaluation exists (held off-repo; bio benchmark harness PR #137; explicitly established as her
real eval, not fabricated). If the numbers can be reproduced/attached by Saturday, a small
"controlled evaluation of the recognition backbone" table in §5.8 (clearly labeled
dataset-benchmark, not production audit) directly fills the Guide's experimental-results
expectation with data the team already owns. If not included, no change — the current honest
framing stands.

### B-3 (P2) — Thin-but-acceptable implementation topics (only if time permits)
From the coverage matrix: voice pipeline detail (Resemblyzer centroid + the ≥0.65 similarity
polarity) ~3 sentences in one place; identity & account-linking / per-tenant biometric-consent
Model A named but not explained; passkey/approve-login cross-device *flows* compressed to one
sentence each; PWA network-first service worker unmentioned; pg_partman audit partitioning one
clause. Each is a 1-paragraph add in ch4; none is required by the Guide.

### B-4 (P2) — Risk-management and project-plan material is reframed, not restated
PSD §9.2 risks/Plan-Bs and the 8-phase management plan appear only as Gantt figures (2.2/2.3) and
design rationale; the thesis reframes risks as §7.2.2 limitations. The Guide does not require a
risk chapter, so this is a style choice — but if the advisor grades against the PSD, a 6-row
"risk → outcome" table in §2.2 would close it.

### B-5 (P2) — Per-author contribution statement
The Guide does not require one, but three-author theses are commonly asked "who did what" at
defense, and the PSD had a division-of-responsibilities section. A 3–4 line statement (e.g. in
Acknowledgements or a short front-matter note) is cheap; confirm with the advisor whether it is
wanted before adding.

### B-6 (P2) — Two numeric reconciliations
- **Vitest count:** thesis says **1,025** (Tables 3.6, 5.3, §5.3, §5.10); the 2026-06-06
  verification in `README_THESIS.md`/CLAUDE.md says **1,029** and claims "same numbers cited in
  the thesis". Reconcile (counting method footnote or update) so the defense story is internally
  consistent.
- **"29 REST controllers"** (ch3/ch4/App. B) vs the api repo doc's "25 controllers" — the thesis
  figure was code-verified in `accuracy.md`'s sweep era; just confirm it still matches HEAD.

---

## C. HUMANIZATION / AI-TELL SWEEP

The 2026-06-06 pass genuinely worked: the classic vocabulary is essentially gone
(delve 0, leverage 0, seamless 0, furthermore 0, moreover 0, "comprehensive" 1, "robust" 7 across
~29k words — fine). What remains are **structural** tells. Density stats (per chapter,
mechanical):

| Signal | ch1 | ch2 | ch3 | ch4 | ch5 | ch6 | ch7 | total |
|---|---|---|---|---|---|---|---|---|
| em-dashes / 1000 words | 10.0 | 11.3 | 7.9 | 7.3 | 5.9 | **15.0** | 8.7 | — |
| "rather than" | 2 | **19** | 9 | 10 | 14 | 10 | 6 | 70 |
| "not merely …" | 1 | 1 | 2 | 1 | 2 | 2 | 0 | 9 |
| "not X … but Y" contrastive | 0 | 0 | 3 | 3 | 3 | 3 | 1 | ~13 |
| bold-lede paragraphs (`**X.** …`) | 0 | 31 | 16 | 27 | 0 | 0 | 19 | **93** |
| "deliberate(ly)" | 0 | 4 | 4 | 9 | 3 | 2 | 2 | 24 |
| honesty meta-words (candid/plainly/defensible/"we are careful/clear/equally") | 0 | 0 | 0 | 2 | 6 | 3 | 7 | 18 |
| sentences > 60 words | 3 | 19 | 9 | 32 | 23 | 11 | 16 | 113 |

### C-1 (P1) — The "rhetorical contrast" template is the dominant remaining tell
"not X but Y" / "not merely" / "rather than" appear ~90 times combined; several sections chain
them ("…rather than reloading per call", "…rather than offered as a standalone model",
"…rather than a hardware-locked product" — all within Ch2 §2.4.3–2.4.4). Rewrite roughly half
into plain assertions. Examples:
- ch4 §4.2: "lives or dies by the data structures it chooses" → "depends heavily on its data
  structures".
- ch6 §6.1: "The benefit to the user is therefore not merely 'fewer passwords'; it is a
  verifiable, controllable identity…" → "The user gains more than fewer passwords: an identity
  they can inspect, control, and revoke."
- ch5 §5.10: "are not optional polish but essential" → "proved essential".
- ch1 §1.1: "This fragmentation is not merely inelegant — it multiplies attack surface…" →
  "This fragmentation multiplies attack surface, frustrates auditing, and makes
  organization-wide trust impossible to reason about."

### C-2 (P1) — Self-congratulatory honesty meta-rhetoric (extends quality.md CC-1/CC-2)
The refrain survives in new wording: "We prefer a smaller, defensible claim to a larger,
unverifiable one" (§5.8.3); "that restraint is itself a small methodological contribution"
(§6.2 — praising one's own honesty is itself a tell; cut the clause); "Reporting these gradations
precisely … is itself a measure of the thesis's integrity" (§2.2 — cut); "We record this rather
than conceal it" (§5.2); "a candid thesis names the cost of each choice as plainly as its
benefit" (§7.2); "That is a candid and, we think, respectable place … to stand" (§7.2.2 — cut
"and, we think, respectable"). Keep the *substance* (targets vs measured labels) and delete the
self-description; one such sentence in §5.8.3 may stay, the rest should go.

### C-3 (P1) — Em-dash overuse, worst in Ch6 (15.0/1000w) and Ch2 (11.3)
`quality.md` CC-4 flagged this; it was only partially addressed. Target: halve em-dashes in ch6
and ch1–ch2 by converting parenthetical dashes to commas/parentheses or splitting sentences.
Example (ch6 §6.1): "authentication that is both stronger and lighter. A person can log in with
their face, a one-time code, a passkey, a hardware security key, a voice sample, or by reading
the chip in their national identity card or passport — and a tenant administrator chooses…" →
end the sentence at "passport." and start "A tenant administrator chooses…".

### C-4 (P2) — Perfectly uniform bold-lede paragraph batteries (93×)
Ch2/Ch3/Ch4/Ch7 sections render as unbroken runs of `**Topic sentence.** body…` paragraphs —
machine-regular rhythm. Vary ~1 in 3: drop the bold from short paragraphs, merge two related
ones, or open with the finding instead of the label (e.g. §4.5 "**Hardened runtime.** At the
OS-container boundary…" → "At the container boundary, every backend service runs read-only…").

### C-5 (P2) — Aphoristic section-openers cluster in Ch5–Ch7
"A multi-tenant biometric authentication platform earns trust in two ways…" (ch5), "A graduation
project is judged not only by what was built but by whom it serves and what it sets in motion"
(ch6), "No engineering decision is free…" (ch7.2), "Garbage in, garbage out" (ch4.3.5). One or
two land well; four in a row patterns. Rewrite the ch6 opener to a plain statement of the
chapter's job (the Guide's four-impact list) and keep the others.

### C-6 (P2) — Repeated signature phrases
"A printed photo cannot blink on cue; a pre-recorded video cannot satisfy a sequence it was never
told" (§4.3.1) reappears nearly verbatim in §7.1 ("a printed photo or a replayed video cannot
satisfy it") and §6.2 ("a replayed video of the user performing yesterday's blink does not
satisfy today's puzzle"). Keep the best one (§4.3.1); paraphrase or shorten the echoes.

---

## D. WRITING QUALITY

### D-1 (P1) — §7.1 re-narrates Ch3/Ch4 with full version numbers (extends quality.md 7-1)
Still ~1,100 words re-listing Spring Boot/Java 21, MTCNN, Facenet512, IVFFlat, Redis TTLs,
Traefik, BCrypt-12, etc. A conclusion should compress, not re-cite. Cut to ~600 words by removing
versions and pointing at chapters ("the architecture of Chapter 3", "the liveness design of
§4.3"). This also reduces the 4× repetition of the VERIFICATION_THRESHOLD=0.4 sentence
(ch2 §2.2, ch3 FR-3, ch4 §4.3.3, ch5 §5.8.3 — keep ch4 + ch5, trim the others to "the production
threshold (§4.3.3)").

### D-2 (P1) — Duplicate inventory table (Table 3.6 ≡ Table 5.3)
Identical module/files/counts table appears in §3.2.4 and §5.3. The Guide puts the test *plan* in
3.2.4 and *results* in Ch5. Replace Table 3.6 with one sentence ("the realized inventory,
~4,386 authored cases, is reported with its counting methodology in Table 5.3") — also fixes the
awkward self-reference "confirming the planned inventory of §3.2.4" in Table 5.3's caption.

### D-3 (P2) — Longest-sentence pass
113 sentences exceed 60 words (worst: ch4 = 32, ch5 = 23). The three worst offenders to split:
the Ch4 opening paragraph's chapter-roadmap sentence (~95 words), §3.2.2's ER-enumeration
sentence (~90 words, the parenthetical table-list), and §5.5's E2E-coverage enumeration
(~80 words). Each splits naturally into 2–3 sentences or a short list.

### D-4 (P2) — Terminology drift: "ten canonical + two cross-device" vs "twelve" vs "Ten-plus"
Abstract: "a dozen selectable login factors—ten canonical methods plus two cross-device
additions" ✓; ch6 §6.3: "twelve selectable authentication methods — the ten canonical login
factors plus the two cross-device additions" ✓; but ch4 §4.4.3 says "Ten-plus factors plug into
this engine" and ch7 §7.2.1 "the twelve authentication methods". Standardize on the
"ten canonical + two cross-device (twelve in total)" formula everywhere; replace "Ten-plus".

### D-5 (P2) — Cross-chapter echo of the isolation-meta-gate story
The "CI parses the surefire XML and asserts the isolation tests actually executed" point is told
in §3.2.4, §4.8, §5.1, §5.4, §5.9 and §6.4 (six tellings). It deserves two: full detail in §5.9,
one-line mentions elsewhere with a pointer.

### D-6 (P2) — Figure 3.7 repeats Figure 2.1 (same image, `arch_overview`)
Intentional per README ("overview vs architecture"), but with figures now hard-referenced, a
reader will notice the identical diagram twice. Either accept (note in §3.3.1 "reproduced from
Figure 2.1 for reference") or swap Figure 3.7 for the C4/container-level diagram from the
diagrams gallery.

### D-7 (P2) — Footnote style (`[^locust]`, §5.6)
The Markdown footnote renders fine in the MD, but verify it became a real Word footnote in the
docx rather than literal `[^locust]` text; if the assembler doesn't support footnotes, inline it
as a parenthetical.

---

## Verified-pass summary (no action needed)

- Chapter structure 1–7 matches the Guide's software-oriented layout exactly (incl. 2.3's six
  realistic constraints, Ch6's four impact types, §7.2 advantages **and** disadvantages).
- Citations [1]–[52]: first occurrences strictly increasing, no gaps, no orphans.
- Abstract 275 words (150–300 band); ToC/LoF/LoT are auto fields (refresh on open — keep the
  README's Ctrl+A + F9 instruction in the submission checklist).
- Zero future-tense leftovers in ch1–ch3/ch6; PSD/ADD coverage complete; no other verbatim
  passages found beyond A-5.
- Honesty posture (targets vs measured, "100%" disavowal, iOS not delivered, RLS inert) remains
  consistent and code-accurate.

## Suggested fix order for the remaining ~2 days

1. A-1 equations → real Word math (highest-visibility format fail).
2. A-2 Figure 2.4 fragment; A-3 FSM figure references; A-5 verbatim PSD sentence. Rebuild docx.
3. A-4 backtick leakage (assembler fix, same rebuild).
4. A-6 table references + A-8 reference years (mechanical, ~1 h).
5. B-1 executed-results additions (unit-run line + optional k6 baseline run); B-2 if the LFW/
   AgeDB/CFP-FP numbers are attachable.
6. C-1/C-2/C-3 targeted humanization edits in ch2, ch5.8–5.10, ch6, ch7 (~2 h).
7. A-7 tense conversions in ch2 (minimum) → full ch3/ch6 sweep if time allows.
8. Final: rebuild, refresh fields in Word, spell-check (Guide requirement), grep docx for
   `` ` ``, `$$`, `[[`, `Figure 2.4` regression.
