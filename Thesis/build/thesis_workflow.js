export const meta = {
  name: 'fivucsas-thesis',
  description: 'Ground in the real FIVUCSAS codebase, then draft, reference, review and revise the 7-chapter graduation thesis into Markdown',
  phases: [
    { title: 'Ground', detail: 'read identity-core, biometric, clients, infra/tests → fact packs' },
    { title: 'Draft', detail: 'write abstract + 7 chapters from sources + fact packs' },
    { title: 'References', detail: 'audit citations, complete the bibliography' },
    { title: 'Review', detail: 'compliance + accuracy(anti-fabrication) + quality' },
    { title: 'Revise', detail: 'apply all review fixes per chapter' },
  ],
}

const ROOT = '/opt/projects/fivucsas'
const T = ROOT + '/Thesis/build'

const PRE =
  'You are co-authoring the FIVUCSAS undergraduate graduation thesis. BEFORE writing, READ IN FULL: ' +
  T + '/_SHARED_CONTEXT.md (style, accuracy rules, structure, output markers) and ' +
  T + '/bibliography.md (citation keys + figure catalog). Obey the OUTPUT FORMAT and ACCURACY rules exactly: ' +
  'PAST tense; ground every technical claim in the real code / fact packs; NEVER fabricate metrics; ' +
  'use [CITE:key], [[FIG:key | caption]], [[TABLE: caption]], [[EQ: name]] markers; literal heading numbers with # / ## / ###. ' +
  'Write polished, engaging, publishable, humanized Markdown. This is a real graduation thesis — be substantial and specific. '

// ---------------------------------------------------------------- Phase 1: Ground
phase('Ground')
const groundJobs = [
  ['identity_core', 'Identity Core API (Spring Boot)',
    'Read the real code under ' + ROOT + '/identity-core-api (pom.xml, src/main/java, src/main/resources/db/migration, docs). ' +
    'Write a precise factual fact pack to ' + T + '/facts/identity_core.md covering: exact versions (Spring Boot, Java, key deps from pom.xml); ' +
    'hexagonal package structure; the REAL @RestController classes and their endpoints (grep @RestController/@RequestMapping/@GetMapping/@PostMapping); ' +
    '@Entity domain models; application use-case/service classes; security — JWT (jjwt), RBAC, BCrypt work factor, Bucket4j rate limiting, OAuth2/OIDC/PKCE authorization-server, WebAuthn/passkey, approve-login, MFA factors; ' +
    'Flyway migrations V1..V83 — group and summarize what they added and the resulting key tables/columns; Redis caching (keys/TTLs); concurrency/idempotency patterns; notable algorithms & design patterns. Be concrete with real names; note planned-but-absent items.'],
  ['biometric', 'Biometric Processor (FastAPI) + spoof-detector',
    'Read ' + ROOT + '/biometric-processor and ' + ROOT + '/spoof-detector (+ ' + ROOT + '/practice-and-test for NFC/eID). ' +
    'Write ' + T + '/facts/biometric.md covering: versions (FastAPI/Python/DeepFace/MediaPipe/OpenCV/onnxruntime); the REAL API routes (grep APIRouter/@router, count by category); ' +
    'the ML stack actually used in prod (face detection MTCNN; recognition Facenet512 / 512-dim; client MediaPipe FaceLandmarker 478pt + BlazeFace fallback; passive liveness UniFace MiniFASNet); ' +
    'the Biometric Puzzle ACTIVE liveness algorithm (challenge types, EAR/MAR formulas, head-pose yaw/pitch/roll, randomization, thresholds — find the real code); passive anti-spoofing (LBP/moiré/frequency/colour) and the amispoof analyzers + gates in spoof-detector/web; quality assessment metrics + thresholds; ' +
    'pgvector index type (IVFFlat vs HNSW — check Alembic + index SQL); cosine similarity threshold(s); NFC/eMRTD eID reader; embedding storage + log-only client geometry embedding (D2). State clearly what is wired into /enroll and /verify vs standalone. Report ONLY metrics that exist in code/tests/docs — fabricate nothing.'],
  ['clients', 'Web, mobile, desktop, verify, SDK',
    'Read ' + ROOT + '/web-app, ' + ROOT + '/client-apps, ' + ROOT + '/verify-widget. Write ' + T + '/facts/clients.md covering: ' +
    'React 18 dashboard pages/routes; verify.fivucsas hosted login flow; the embeddable auth widget + JS SDK (FivucsasAuth, loginRedirect, OIDC code+PKCE); the auth methods (PASSWORD/EMAIL_OTP/SMS_OTP/TOTP/FACE/VOICE/FINGERPRINT/HARDWARE_KEY/QR_CODE/NFC_DOCUMENT + PASSKEY + APPROVE_LOGIN); ' +
    'identity-verification pipeline step handlers + industry templates; client-side ML (MediaPipe FaceLandmarker/BlazeFace, card detection); KMP shared code (expect/actual), Compose Multiplatform UI; i18n EN/TR. ' +
    'CRITICAL: verify and state the ACTUAL per-platform delivery status honestly — Android, iOS, Desktop (kiosk/admin). Do not overclaim; if iOS/desktop are partial or prototype, say so.'],
  ['infra_tests', 'Infrastructure, deployment, CI/CD, tests',
    'Read ' + ROOT + '/infra, ' + ROOT + '/docs, ' + ROOT + '/load-tests, ' + ROOT + '/monitoring and the *compose*.yml + CLAUDE.md files. Write ' + T + '/facts/infra_tests.md covering: ' +
    'production deployment (Hetzner CX43 specs; Hostinger static hosting; confirm Traefik v3 vs NGINX at the edge from infra/ + compose); Docker Compose prod services/images/resources; the production subdomains/URLs; CI/CD (GitHub Actions + self-hosted runner); Redis caching strategy; monitoring/uptime; disk/ops runbooks. ' +
    'THEN the REAL test inventory — actually COUNT test cases per module: Java JUnit5 (grep -r "@Test" identity-core-api), Vitest (grep -rE "\\b(it|test)\\(" web-app/src), Kotlin (grep -r "@Test" client-apps), Playwright specs, pytest (grep -rE "def test_" biometric-processor). Report real numbers and clarify method-vs-file counts. Cover load-tests (k6/Locust) and security testing (OWASP ZAP). Do NOT trust CLAUDE.md numbers blindly — verify by grepping.'],
]
await parallel(groundJobs.map(([key, label, body]) => () =>
  agent(PRE + '\n\nFACT-PACK TASK (' + label + '):\n' + body + '\n\nUse Read/Grep/Glob/Bash. Write the file, then return ONLY a 5-line summary of the key facts you recorded.',
    { label: 'ground:' + key, phase: 'Ground', agentType: 'general-purpose' })))

// ---------------------------------------------------------------- Phase 2: Draft
phase('Draft')
const chapters = {
  ch1:
    'Write CHAPTER 1 to ' + T + '/chapters/ch1.md. Read sources: ADD §1 + PSD §1–3. Skeleton:\n' +
    '# 1. INTRODUCTION\n## 1.1 Problem Description and Motivation\n## 1.2 Main Goal and Objectives of the Project\n' +
    '1.1 = multi-paragraph motivation (password/card/single-factor-biometric weaknesses; spoofing; fragmented physical+digital identity; the SaaS/B2B2C gap) answering: motivation? why done? worthwhile? what did we build (briefly)? Use real threat stats with [CITE:verizon2024-dbir],[CITE:itrc2023]. ' +
    '1.2 = the main goal, then a BULLETED measurable objectives list (backend microservices; Biometric Puzzle active liveness; high-accuracy face recognition via DeepFace; multi-platform clients; multi-tenant isolated data model). Past tense.',
  ch2:
    'Write CHAPTER 2 to ' + T + '/chapters/ch2.md. Read ADD §1.2,§2 + PSD §5,§7,§9,§4. Skeleton:\n' +
    '# 2. DEFINITION OF THE PROJECT\n## 2.1 Scope of the Project\n### 2.1.1 In Scope\n### 2.1.2 Out of Scope\n### 2.1.3 Constraints\n### 2.1.4 Assumptions\n' +
    '## 2.2 Success Factors\n## 2.3 Professional Considerations\n### 2.3.1 Methodological Considerations and Engineering Standards\n### 2.3.2 Realistic Constraints\n### 2.3.3 Legal Considerations\n' +
    '## 2.4 Literature Survey and Related Work\n### 2.4.1 Identity and Access Management (IAM) Systems\n### 2.4.2 Deep Learning-Based Face Recognition\n### 2.4.3 Liveness Detection and Anti-Spoofing\n### 2.4.4 Identity Document Verification and Standards\n### 2.4.5 Industrial Biometric Solutions\n### 2.4.6 Cloud-Native and Multi-Tenant Architectures\n### 2.4.7 Positioning and Differentiation\n' +
    '2.2: for EACH objective in 1.2 give the KPI and the ACTUAL outcome (past tense). 2.3.2 MUST cover all six: economical, environmental, ethical, health & safety, sustainability, social. 2.3.3: KVKK No. 6698 [CITE:kvkk6698], GDPR [CITE:gdpr], OSS licenses. 2.4: rich related-work with [CITE:...] and at least one comparison [[TABLE:...]]; end with how FIVUCSAS differs.',
  ch3:
    'Write CHAPTER 3 to ' + T + '/chapters/ch3.md. This is SOFTWARE ORIENTED. Read ADD §3,§4,§5 + ALL fact packs in ' + T + '/facts/. Skeleton:\n' +
    '# 3. SYSTEM DESIGN AND SOFTWARE ARCHITECTURE\n## 3.1 Project Requirements\n### 3.1.1 Functional Requirements\n### 3.1.2 Nonfunctional Requirements\n' +
    '## 3.2 System Design\n### 3.2.1 Use Case Diagrams\n### 3.2.2 Class and Entity-Relationship Diagrams\n### 3.2.3 User Interface Design\n### 3.2.4 Test Plan\n' +
    '## 3.3 Software Architecture\n### 3.3.1 Architectural Style\n### 3.3.2 Component Architecture\n### 3.3.3 Data Architecture\n### 3.3.4 Deployment Architecture\n' +
    '3.1.1: FR-1..FR-6 with a [[TABLE:...]] then concise per-FR detail. 3.1.2: NFR table (perf/scalability/reliability/security/usability/maintainability/portability) + detail. ' +
    'EMBED figures: [[FIG:uc_by_actor|...]], [[FIG:domain_model|...]], [[FIG:er_diagram|...]], [[FIG:arch_overview|...]], [[FIG:sys_components|...]], [[FIG:docker_deploy|...]]. ' +
    '3.2.3: REAL dashboard pages + mobile screens (from clients fact pack) with route tables. 3.2.4: real test strategy + coverage table. 3.3: microservices + hexagonal [CITE:cockburn-hexagonal][CITE:richardson2018-microservices]; real component/data/deployment architecture grounded in fact packs (Spring Boot 3.4.7, FastAPI, PostgreSQL 17 + pgvector, Redis 7.4, Traefik). Past tense, real numbers.',
  ch4:
    'Write CHAPTER 4 (the NEW technical heart) to ' + T + '/chapters/ch4.md. Read ALL fact packs + PSD §6 + relevant real code. Be DEEP and specific with real package names, classes, endpoints, schema, code snippets. Skeleton:\n' +
    '# 4. TECHNICAL APPROACH AND IMPLEMENTATION DETAILS\n## 4.1 Hardware and Software Requirements and Tools\n## 4.2 Data Structures\n## 4.3 Algorithms\n### 4.3.1 Active Liveness Detection: the Biometric Puzzle\n### 4.3.2 Passive Anti-Spoofing\n### 4.3.3 Face Embedding and Similarity Matching\n### 4.3.4 1:N Identification with pgvector\n### 4.3.5 Image Quality Assessment\n' +
    '## 4.4 Authentication, Authorization and Security\n### 4.4.1 JWT, RBAC and Password Security\n### 4.4.2 OAuth 2.0 / OpenID Connect and Hosted Login\n### 4.4.3 Multi-Factor Authentication and Step-Up\n' +
    '## 4.5 Operating-System and Concurrency Details\n## 4.6 Networking and Protocols\n## 4.7 Finite State Machines\n## 4.8 Multi-Tenant Data Isolation\n' +
    '4.1: tools/frameworks with brief why-chosen + [CITE:springboot][CITE:fastapi][CITE:react][CITE:kmp][CITE:postgresql][CITE:redis][CITE:docker][CITE:traefik]. ' +
    '4.3.1: real EAR/MAR formulas as [[EQ:...]] [CITE:soukupova2016-ear][CITE:mediapipe]; randomized challenge sequence. 4.3.3: cosine similarity [[EQ:cosine]] + Facenet512 [CITE:schroff2015-facenet][CITE:deepface-lib]. 4.3.4: pgvector ANN [CITE:pgvector]. ' +
    '4.4.2: OAuth2/OIDC/PKCE [CITE:oauth2-rfc6749][CITE:oidc-core][CITE:pkce-rfc7636]. 4.5: async/await, thread pools, mutual exclusion, Redis SET NX idempotency. 4.6: REST contracts, TLS, OIDC redirect, WebSocket proctoring, NFC/eMRTD [CITE:icao9303]. ' +
    '4.7: EMBED [[FIG:fsm_session]], [[FIG:fsm_verification]], [[FIG:fsm_enrollment]], [[FIG:fsm_user]] and describe states/transitions. Include real fenced code/SQL snippets. Tie subsections to undergraduate CS courses (OS, networks, databases, distributed systems, ML).',
  ch5:
    'Write CHAPTER 5 (NEW) to ' + T + '/chapters/ch5.md. Read ' + T + '/facts/infra_tests.md + ' + T + '/facts/biometric.md + ADD §4.4. Skeleton:\n' +
    '# 5. SOFTWARE TESTING\n## 5.1 Testing Strategy and Levels\n## 5.2 Test Environment and Tools\n## 5.3 Unit Testing\n## 5.4 Integration Testing\n## 5.5 End-to-End Testing\n## 5.6 Performance and Load Testing\n## 5.7 Security Testing\n## 5.8 Biometric and Liveness Experimental Evaluation\n## 5.9 Multi-Tenant Isolation Testing\n## 5.10 Results Summary and Discussion\n' +
    'Use the REAL test counts from the fact pack (state them as measured; clarify method vs file). Tools: JUnit5/pytest/Vitest/Testcontainers/Playwright/k6/OWASP ZAP with [CITE:playwright][CITE:k6][CITE:testcontainers][CITE:owasp-top10]. ' +
    'Concrete test-case tables (TC-AUTH/TC-BIO/TC-LIVE...). 5.8: liveness/anti-spoofing evaluation via amispoof — report ONLY what was actually measured; PAD metrics per [CITE:iso30107-3]; label any target-vs-measured explicitly; NEVER cite the unverified "100% accuracy" claim. Honest results + discussion.',
  ch6:
    'Write CHAPTER 6 to ' + T + '/chapters/ch6.md. Read PSD §10. Skeleton:\n' +
    '# 6. BENEFITS AND IMPACT\n## 6.1 Benefits and Implications\n## 6.2 Scientific Impact\n## 6.3 Economic, Commercial and Social Impact\n## 6.4 Potential Impact on New Projects\n## 6.5 Impact on National Security\n' +
    'Cover all four Guide-required impacts (6.2–6.5). 6.5 applies (identity/cyber/border security via eMRTD/NFC) — make the case; if a sub-aspect does not apply, say why. Past/present tense, grounded, no overclaiming.',
  ch7:
    'Write CHAPTER 7 to ' + T + '/chapters/ch7.md. Read all fact packs for an accurate summary. Skeleton:\n' +
    '# 7. CONCLUSION AND FUTURE WORK\n## 7.1 Summary and Conclusions\n## 7.2 Advantages and Limitations\n## 7.3 Future Work\n' +
    'Summarize what was built and the results; give honest advantages AND limitations of the chosen methods; concrete future work (more biometric modalities, Kubernetes orchestration [CITE:richardson2018-microservices], model retraining/ArcFace [CITE:deng2019-arcface], formal PAD certification [CITE:iso30107-3], billing). No fabrication.',
  '00_frontmatter':
    'Write the FRONT MATTER to ' + T + '/chapters/00_frontmatter.md. Read all fact packs + ADD/PSD abstracts. Content:\n' +
    '# ABSTRACT\n(a single, compelling 150–300 word abstract: objective, methodology, what was built, and key conclusions — past tense, no citations, no markers)\n\n' +
    '# ACKNOWLEDGEMENTS\n(a short, sincere paragraph thanking advisor Assoc. Prof. Dr. Mustafa Ağaoğlu, the department, and family.)\n' +
    'Keep the abstract within 150–300 words (count it).',
}
const draftWave1 = ['ch1', 'ch2', 'ch3', 'ch4']
const draftWave2 = ['ch5', 'ch6', 'ch7', '00_frontmatter']
for (const wave of [draftWave1, draftWave2]) {
  await parallel(wave.map((k) => () =>
    agent(PRE + '\n\n' + chapters[k] + '\n\nWrite the file, then return ONLY a 3-line summary.',
      { label: 'draft:' + k, phase: 'Draft', agentType: 'general-purpose' })))
}

// ---------------------------------------------------------------- Phase 3: References
phase('References')
await agent(PRE +
  '\n\nREFERENCES AUDIT. Read every file in ' + T + '/chapters/ and ' + T + '/facts/. Extract every [CITE:key] used. ' +
  'Open ' + T + '/bibliography.md. For ANY cited key missing from the bibliography, APPEND a correct Guide-formatted entry (journal/conference/book/web exactly as the Guide examples; use the real official source — do not invent authors). ' +
  'Then write ' + T + '/reviews/references_audit.md listing: (a) every cited key with a tick if it resolves, (b) keys you added, (c) any citation that supports a claim NOT backed by the fact packs (flag, do not delete). Return ONLY a 3-line summary.',
  { label: 'references', phase: 'References', agentType: 'general-purpose' })

// ---------------------------------------------------------------- Phase 4: Review
phase('Review')
const reviews = [
  ['compliance',
    'GUIDE-COMPLIANCE AUDIT. Read ' + ROOT + '/Thesis/build/_SHARED_CONTEXT.md, the Guide PDF ' + ROOT + '/Thesis/CSE4198_ Thesis_Guide_v2023.pdf, and all ' + T + '/chapters/*.md. ' +
    'Verify: 7 chapters with correct Software-Oriented subsections; ABSTRACT is 150–300 words; every Guide-required question is answered (1.1 motivation questions; 1.2 measurable objectives; 2.1 scope/constraints/assumptions; 2.2 success factor per objective; 2.3 ALL six realistic constraints + legal + methodological standards; 2.4 related work + differentiation; 3 FR/NFR + use-case + class/ER + UI + test plan + architecture; 4 data structures + algorithms + OS/concurrency + networking + FSM; 5 testing levels + results; 6 ALL four impacts incl. national security; 7 future work); PAST tense throughout; every figure/table referenced from the text. ' +
    'Write ' + T + '/reviews/compliance.md as a checklist plus concrete, per-file/per-section fixes (quote each gap). Return ONLY a 3-line summary.'],
  ['accuracy',
    'ADVERSARIAL ACCURACY / ANTI-FABRICATION AUDIT. Read all ' + T + '/facts/*.md and all ' + T + '/chapters/*.md, and spot-check against the real repo with Grep/Read. ' +
    'Hunt for: (1) fabricated or unverifiable METRICS (FAR/FRR/APCER/BPCER/accuracy/latency/throughput/test counts) not backed by code or a real measurement; (2) overclaimed platform delivery (iOS/desktop) or version/model facts contradicting the fact packs; (3) any contradiction between chapters and fact packs; (4) the forbidden unverified "learned-fuser / 100% accuracy / ACER 0.00%" claim. ' +
    'For each issue give: file, section, the exact wrong claim, and corrected/safer wording (e.g. reframe as target or controlled-test). Write ' + T + '/reviews/accuracy.md. Return ONLY a 3-line summary that STARTS with the integer count of issues found.'],
  ['quality',
    'QUALITY / READABILITY REVIEW (graduation committee + journal reviewer lens). Read all ' + T + '/chapters/*.md. ' +
    'Assess narrative flow, engagement (not boring), academic professionalism, terminology consistency, transitions between chapters, and absence of AI-tells/filler/repetition; confirm it reads as ONE coherent humanized document. ' +
    'Write ' + T + '/reviews/quality.md with concrete per-section suggestions: quote weak sentences and give stronger rewrites. Return ONLY a 3-line summary.'],
]
await parallel(reviews.map(([key, body]) => () =>
  agent(PRE + '\n\n' + body, { label: 'review:' + key, phase: 'Review', agentType: 'general-purpose' })))

// ---------------------------------------------------------------- Phase 5: Revise
phase('Revise')
const reviseWave1 = ['ch1', 'ch2', 'ch3', 'ch4']
const reviseWave2 = ['ch5', 'ch6', 'ch7', '00_frontmatter']
const reviseResults = []
for (const wave of [reviseWave1, reviseWave2]) {
  const r = await parallel(wave.map((k) => () =>
    agent(PRE +
      '\n\nFINAL REVISION of ONE chapter file: ' + T + '/chapters/' + k + '.md. ' +
      'Read that file, then read ALL review reports: ' + T + '/reviews/compliance.md, ' + T + '/reviews/accuracy.md, ' + T + '/reviews/quality.md, ' + T + '/reviews/references_audit.md. ' +
      'Apply EVERY fix that targets this chapter: close compliance gaps, CORRECT or soften every unsupported/fabricated claim (accuracy is paramount — never leave an invented number), apply the quality rewrites, fix citations/markers. ' +
      'Keep the strict output format (heading numbers, [CITE]/[[FIG]]/[[TABLE]]/[[EQ]] markers). Overwrite the file. Return ONLY a 3-line summary of what you changed.',
      { label: 'revise:' + k, phase: 'Revise', agentType: 'general-purpose' })))
  reviseResults.push(...r)
}

log('Thesis drafting complete: fact packs + 8 chapter files + bibliography + reviews written to ' + T)
return {
  chapters: ['00_frontmatter', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'].map((c) => T + '/chapters/' + c + '.md'),
  facts: T + '/facts',
  reviews: T + '/reviews',
  revised: reviseResults.filter(Boolean).length,
}
