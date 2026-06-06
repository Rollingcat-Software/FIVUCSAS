# FIVUCSAS Thesis — Shared Authoring Context (READ FIRST)

You are co-authoring an **undergraduate graduation thesis** (Marmara University, Computer
Engineering, CSE4197/CSE4198) for the project **FIVUCSAS — Face and Identity Verification
Using Cloud-based SaaS Models**. The thesis must be **professional, humanized, engaging
(not boring), publishable, shareable, and citeable.** It is written in **English**.

## Project identity (use verbatim on cover/abstract)
- **Title:** FACE AND IDENTITY VERIFICATION USING CLOUD-BASED SaaS MODELS
- **Authors (this order):** Ahmet Abdullah Gültekin (150121025), Ayşe Gülsüm Eren (150120005), Ayşenur Arıcı (150123825)
- **Advisor:** Assoc. Prof. Dr. Mustafa Ağaoğlu
- **Institution:** Marmara University, Faculty of Engineering, Computer Engineering Department
- **Year of graduation:** 2026
- **System name:** FIVUCSAS (Face and Identity Verification Using Cloud-based SaaS)

## Authoritative sources (READ the ones relevant to your chapter)
| What | Path |
|---|---|
| ADD (Analysis & Design Document — source for Ch 1–3, 6; **future/present tense → convert to PAST**) | `/opt/projects/fivucsas/docs/00-meta/ADD_2403.txt` |
| PSD (Project Specification — source for goals, success factors, professional considerations, benefits/impact) | `/opt/projects/fivucsas/docs/00-meta/project-artifacts/PSD_extracted_new.txt` |
| Real production state (the GROUND TRUTH — supersedes ADD/PSD plans) | `/opt/projects/fivucsas/CLAUDE.md` |
| Ground-truth FACT PACKS extracted from the real code (written in Phase 1) | `/opt/projects/fivucsas/Thesis/build/facts/*.md` |
| Guide (format + required content per section) | `/opt/projects/fivucsas/Thesis/CSE4198_ Thesis_Guide_v2023.pdf` (see structure below) |
| Real codebase (read freely with Grep/Read/Glob) | `/opt/projects/fivucsas/{identity-core-api,biometric-processor,web-app,client-apps,spoof-detector,infra,docs,load-tests}` |

## ⚠️ Accuracy & honesty rules (NON-NEGOTIABLE)
1. **Past tense.** This thesis reports a **completed** project. Convert ADD/PSD "the system shall / will / aims to" into "the system **does** / we **implemented** / we **achieved**." Plans that were NOT realized are described as such or as future work.
2. **Ground every technical claim in the real code/fact-packs.** Where ADD/PSD differ from reality, follow **reality**: e.g. Spring Boot **3.4.7** / Java 21; PostgreSQL **17** + pgvector; Redis **7.4**; FastAPI / Python **3.12**; **Traefik v3** edge (the ADD's "NGINX gateway" is dev-era — verify what prod uses); Flyway **V1–V83** (not V1–V9); clients are **Kotlin Multiplatform / Compose** (the PSD's "Flutter" was abandoned — say so if relevant); face model in prod is **Facenet512** (512-dim), detection **MTCNN** server-side + **MediaPipe FaceLandmarker (478pt)** client-side, passive liveness **UniFace MiniFASNet**.
3. **Do NOT fabricate numbers.** Use real measured values from the fact packs/repo. If a metric (FAR/FRR/APCER/BPCER, latency, accuracy) is a *target* or measured only in a *controlled test*, label it exactly that way. Never invent benchmark results. If something was planned but not measured, say "evaluation is ongoing / future work."
4. **Do NOT overclaim delivery.** State platform delivery status accurately (e.g. Android delivered; iOS/desktop status = whatever the fact pack says). The poster/learned-fuser "100% accuracy" claim is UNVERIFIED — never cite it.
5. Prefer the project's documented architecture decisions (hexagonal, server-side auth decision, client geometry embedding is log-only).

## Writing style
- Academic but **alive**: clear topic sentences, concrete detail, varied sentence length, a logical narrative arc. Avoid filler, avoid robotic "Furthermore/Moreover" stacking, avoid empty hype.
- Measured **"we"** plus passive voice, consistent with the ADD/PSD register.
- US English, consistent terminology. Define acronyms on first use.
- Each chapter is substantial (this is a full thesis): aim for the depth a graduation committee expects. Chapters 4 and 5 are the technical heart — be thorough and specific (real package names, classes, endpoints, algorithms, data structures, protocols, schema, test IDs, results).
- Figures and tables are referenced from the text ("as shown in [[FIG:...]]").

## Output format (STRICT — enables deterministic assembly)
Write **GitHub-flavored Markdown** to your assigned file. Use this heading convention with **literal numbers** exactly:
```
# 1. INTRODUCTION                ← chapter (H1): number + UPPERCASE title
## 1.1 First-Level Heading       ← section (H2)
### 1.1.1 Second-Level Heading   ← subsection (H3)
```
(For the abstract/front-matter file, use `# ABSTRACT` etc. — no number.)

**Markers** (the assembler converts these — do not number them yourself):
- **Citations:** `[CITE:key]` using the canonical keys in `build/bibliography.md`. Multiple: `[CITE:key1,key2]`. Need a new source? Add it to `bibliography.md` (Guide format) with a new lowercase-hyphen key, then cite it. Citations are renumbered by first appearance at assembly.
- **Figures:** put the marker on its own line where the figure belongs: `[[FIG:key | Caption text]]` using keys from the figure catalog in `bibliography.md`. The assembler embeds the image + numbers it "Figure C.f" + adds it to the List of Figures.
- **Tables:** put `[[TABLE: Caption text]]` on its own line immediately BEFORE a normal Markdown table. The assembler numbers it "Table C.t" + adds it to the List of Tables.
- **Equations:** ``[[EQ: name]]`` on its own line, followed by the equation in LaTeX-ish `$ ... $` or plain text; numbered per chapter at assembly.
- **Code/CLI snippets:** fenced ```` ```lang ```` blocks are preserved verbatim.

Do not write the chapter number into a Word "List" — just the literal `# 1.` etc. Do not invent
"Figure 4.2" numbers in prose; reference figures/tables by `[[FIG:key]]` / their caption only and
let assembly number them. Keep `[CITE:...]` keys stable so cross-chapter numbering stays correct.

## Thesis structure (Software Oriented) — what each chapter must cover
**Front matter** (file `00_frontmatter.md`): Abstract (150–300 words, its own `# ABSTRACT`), Acknowledgements (`# ACKNOWLEDGEMENTS`, short, sincere).

**1. INTRODUCTION** (`ch1.md`) — revised from PSD/ADD, PAST tense
- 1.1 Problem Description and Motivation — multi-paragraph; answer: motivation? why done? is it worthwhile? what did we do (brief)? Use the password/card/spoofing threat framing + the fragmented physical/digital identity gap.
- 1.2 Main Goal and Objectives of the Project — the main goal, then a **bulleted, measurable** objectives list.

**2. DEFINITION OF THE PROJECT** (`ch2.md`) — revised from PSD/ADD
- 2.1 Scope of the Project — in-scope, out-of-scope, constraints, assumptions. Relationship to prior/open-source work (DeepFace, MediaPipe, pgvector, etc.).
- 2.2 Success Factors — for EACH objective in 1.2, the KPI showing it was satisfied (use PSD §9.1, but report actual outcomes in past tense).
- 2.3 Professional Considerations — (a) methodological/engineering standards (Git/GitHub org, PR review, UML, Gantt, IEEE/ISO, linting, CI) with illustration; (b) Realistic Constraints covering ALL SIX: economical, environmental, ethical, health & safety, sustainability, social; (c) Legal (KVKK No. 6698, GDPR, open-source licenses).
- 2.4 Literature Survey / Related Work — from ADD §2 (IAM, deep face recognition, liveness/anti-spoofing, document/eMRTD, industrial solutions, cloud-native multi-tenant) + the positioning/differentiation. Include comparison tables.

**3. SYSTEM DESIGN AND SOFTWARE ARCHITECTURE** (`ch3.md`) — revised from ADD, grounded in REAL system
- 3.1 Project Requirements → 3.1.1 Functional Requirements (FR-1..FR-6 table + detail), 3.1.2 Nonfunctional Requirements (perf/scalability/reliability/security/usability/maintainability/portability table + detail)
- 3.2 System Design → 3.2.1 UML Use Case Diagram(s), 3.2.2 UML Class and/or DB ER Diagram(s), 3.2.3 User Interface (real pages/screens), 3.2.4 Test Plan (real strategy + coverage)
- 3.3 Software Architecture — architectural style (microservices + hexagonal), component architecture, data architecture (schema/pgvector/Redis), deployment architecture. Data/control flow + modular design.

**4. TECHNICAL APPROACH AND IMPLEMENTATION DETAILS** (`ch4.md`) — NEW, the technical heart, grounded in fact packs/code
- Hardware/software requirements & tools (with brief why-chosen). Then dedicated subchapters for: **Data Structures** used (embeddings/pgvector vectors, token buckets, caches, DTOs); **Algorithms** implemented (Biometric Puzzle liveness w/ EAR/MAR/head-pose & randomized challenge; passive liveness LBP/moiré/frequency/color; face embedding + cosine similarity; 1:N pgvector ANN search; quality assessment; anti-spoofing pipeline; OAuth2/OIDC/PKCE; JWT/RBAC; rate limiting); **Operating-system details** (async/await, multithreading, mutual exclusion, Redis-based locking/idempotency); **Networking** (REST contracts, TLS, OIDC redirect flow, WebSocket proctoring, NFC/eMRTD reads); **Finite State Machines** (auth/verification/session/enrollment state machines — real diagrams exist); and any other course-relevant design (DB, security, distributed systems, ML). Reference real package structures, classes, endpoints.

**5. SOFTWARE TESTING** (`ch5.md`) — NEW
- Test strategy & levels (unit/integration/E2E/performance/security) with real tools (JUnit5, pytest, Vitest, Testcontainers, Playwright, k6/Locust, OWASP ZAP). Real test inventory & counts (from fact pack — verify, don't trust labels). Concrete test cases (TC-AUTH, TC-BIO, TC-LIVE...). Experimental results: liveness/anti-spoofing evaluation (amispoof), face-verification behavior, performance/load test outcomes, multi-tenant isolation tests, security testing. Label measured vs target clearly. Comparison with related work where honest.

**6. BENEFITS AND IMPACT** (`ch6.md`) — from PSD, past/present tense
- Benefits/Implications (who benefits, how). Then ALL FOUR impacts: (i) Scientific, (ii) Economic/Commercial/Social, (iii) Potential Impact on New Projects, (iv) Impact on National Security (cyber/border/identity security — applicable here). If one doesn't apply, explain why.

**7. CONCLUSION AND FUTURE WORK** (`ch7.md`)
- Summarize the project & results, advantages/disadvantages of the chosen methods, honest limitations, and concrete future work (additional biometric modalities, Kubernetes orchestration, model retraining, formal PAD certification, etc.).

**References** are assembled separately from `[CITE:...]` keys. **Appendices** (optional) handled at assembly.
