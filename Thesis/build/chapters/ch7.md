# 7. CONCLUSION AND FUTURE WORK

## 7.1 Summary and Conclusions

This thesis set out to answer a deceptively simple question: can high-accuracy face
verification, robust anti-spoofing, and strict multi-tenant isolation be engineered into a
single, deployable Software-as-a-Service platform — rather than remaining scattered across
proprietary cloud APIs, device-bound vendor silos, and research-grade models that never leave a
benchmark? Over two semesters we designed, built, deployed, and tested **FIVUCSAS** (Face and
Identity Verification Using Cloud-based SaaS). The working system answers in the affirmative,
qualified by the limitations enumerated in the next section.

What we delivered is a running, multi-tenant, cloud-native identity platform, not a prototype on
a laptop. At its core sit two backend microservices that divide the problem cleanly along the
seam that matters most. The **Identity Core API** (Spring Boot on Java 21, organized as a
hexagonal, ports-and-adapters codebase [CITE:cockburn-hexagonal]) owns authentication,
authorization, tenant administration, OAuth 2.0 / OpenID Connect, and every security-policy
decision; it is the system of record and the sole authority over the auth verdict
[CITE:oauth2-rfc6749,oidc-core]. The **Biometric Processor** (FastAPI on Python, laid out in
the same clean layers) carries the compute-intensive work: face detection with MTCNN
[CITE:zhang2016-mtcnn], 512-dimensional embedding with Facenet512 [CITE:schroff2015-facenet] via
the DeepFace framework [CITE:serengil2020-lightface,deepface-lib], passive liveness with the
UniFace MiniFASNet ONNX model [CITE:minifasnet], voice speaker embeddings, document and eMRTD
reading [CITE:icao9303], and the anti-spoofing pipeline drawn from a dedicated `spoof-detector`
library. The two services communicate over an internal REST contract guarded by an API key. The
biometric processor has **no public route** and is reachable only on the internal Docker network,
which keeps the most sensitive surface off the open internet entirely.

Around this backend we built the parts that make a capability into a product. Faces are stored as
Facenet512 embeddings in **PostgreSQL with the pgvector extension** [CITE:postgresql,pgvector],
indexed with IVFFlat using the cosine operator class and matched by cosine distance, with an
encrypted ciphertext column kept as the canonical store of record alongside the searchable vector.
**Redis** [CITE:redis] did far more than caching: OAuth authorization codes, one-time
passwords, replay markers, step-up challenges, distributed rate-limit counters, and job
coordination all lived there under carefully chosen TTLs. **Traefik** [CITE:traefik] terminated TLS
at the edge and routed by Docker labels, with an admin-IP-gated surface for Swagger and actuator
and hardened forwarded-header handling. The whole deployment ran on a single Hetzner CX43 VPS
under Docker Compose [CITE:docker,dockercompose], every application container hardened with a
read-only root filesystem, dropped Linux capabilities, and `no-new-privileges`. The schema itself
evolved through 84 Flyway migrations [CITE:flyway] (the V0–V84 range, with V13 unused) — an auditable record of the
platform's growth from a core IAM schema to identity linking, account-level biometric consent,
partitioned audit logs, and discoverable passkeys.

The project's signature contribution is its approach to **liveness**. Rather than trust a single
still frame, FIVUCSAS combined a server-authoritative passive check (UniFace MiniFASNet, backed by
a classical texture, moiré, frequency, and color detector and a single-frame Eye-Aspect-Ratio veto
as defense in depth [CITE:soukupova2016-ear,opencv]) with an **active challenge–response mechanism,
the Biometric Puzzle**. The puzzle asks the user to complete a randomly generated sequence of facial
actions (blink, smile, turn, open mouth, raise eyebrows, and more), each scored against MediaPipe
FaceLandmarker geometry [CITE:mediapipe] using Eye- and Mouth-Aspect-Ratio and landmark-derived
head-pose thresholds, with incompatible action pairs blocked and a per-step confidence and duration
floor enforced server-side; the unpredictability of the server-verified sequence is what
defeats static and replayed media. This rests on an explicit, documented
architectural decision: **the browser is untrusted, and the authoritative auth decision is made on
the server**. Under that decision (D2) the client-side geometry embedding is recorded for offline
analysis but never decides the verdict.

On the client side we delivered multiple surfaces over a shared design: a React administration
dashboard [CITE:react]; a **hosted login experience** at `verify.fivucsas.com` that follows the same
redirective-OIDC pattern as Auth0 Universal Login, Okta, Microsoft Entra, and e-Devlet, complete with
PKCE (S256) [CITE:pkce-rfc7636]; an embeddable authentication widget and a zero-dependency JavaScript
SDK for inline step-up; and a **Kotlin Multiplatform / Compose** [CITE:kmp] client. We are precise
about platform delivery. **Android shipped as a full native client** (signed public releases with
native MFA, on-device NFC document reading, and a standalone TOTP authenticator). The **JVM desktop
client shipped** as a hosted-first OAuth loopback application with OS-native secure token storage and
`.deb`/`.msi` installers. **iOS was not delivered**: the shared module compiles for iOS targets, but
the platform implementations are stubs, and the app remains future work blocked on Apple Developer
enrollment. The PSD-era plan to build the clients in Flutter was abandoned in favor of Kotlin
Multiplatform, and we report that as the reality.

Security was treated as a first-class, tested property rather than a coat of paint. BCrypt at work
factor 12 protected passwords [CITE:bcrypt]; production access tokens were RS256-signed JWTs with
issuer and audience binding, key-id routing that closed algorithm-confusion forgeries, and RFC 8176
`amr` accumulation that recorded genuine N-factor evidence [CITE:jwt-rfc7519]; WebAuthn / passkeys
used the Yubico server library with an explicit origin allowlist [CITE:webauthn]; two complementary
rate-limiting layers (a Redis sliding window and Bucket4j token buckets [CITE:bucket4j]) failed closed
on sensitive paths; and refresh tokens rotated within a family with reuse detection. Multi-tenant
isolation — the hardest SaaS guarantee — was enforced in depth (JWT-rebound tenant context plus a
Hibernate `@Filter` on the tenant-scoped entities) and, crucially, **re-verified on every pull
request** by Testcontainers integration tests that the CI pipeline asserted had actually executed
[CITE:testcontainers].

The engineering process itself is part of the result. The platform was backed by roughly
**4,400 authored automated test cases across five technologies** — JUnit 5, Vitest, Playwright, the
Kotlin/JUnit suite, and pytest [CITE:playwright] — exercised by per-repository CI pipelines, with
load scenarios in k6 [CITE:k6] and static security scanning via Bandit, pip-audit, gitleaks, and
Dependabot. We are equally clear about what those numbers do *not* mean: a large green test suite is
not the same as a measured accuracy benchmark. The performance figures in our load configuration are
**design targets**, not measured production results, and the headline anti-spoofing figure that
appeared on an early project poster was never independently reproduced and is therefore not claimed
here (see §5.8). The conclusion we stand behind is narrower and more defensible, and it is the
thesis statement of this entire document: a complete, secure, multi-tenant biometric verification
platform — with active liveness, vector face search, strict tenant isolation, and a developer-grade
OIDC integration story — can be built and operated end-to-end by a small team on commodity, CPU-only
infrastructure.

## 7.2 Advantages and Limitations

No engineering decision is free; this section names the cost of each choice alongside
its benefit. This section weighs the principal methods we adopted.

### 7.2.1 Advantages of the Chosen Methods

**A microservices split along the right seam.** Separating identity logic (Spring Boot) from the
machine-learning workload (FastAPI) [CITE:richardson2018-microservices,newman2021-microservices] let
each side use the language and runtime best suited to it — a mature JVM security ecosystem on one
side, the Python ML stack on the other — and let the heavy biometric service be resource-capped,
hardened, and kept entirely off the public internet. The clean boundary made the codebase easier to
reason about and test, and it leaves a clear path to scaling the two services independently.

**Hexagonal architecture paid for itself.** Organizing both services as ports and adapters
[CITE:cockburn-hexagonal,evans2003-ddd] meant that swapping an SMS provider, a cache, or a biometric
backend was a matter of writing a new adapter, not surgery on the domain. The Strategy-plus-Registry
pattern used for login handlers, MFA step handlers, and verification-pipeline handlers made the
twelve authentication methods and the ten verification steps genuinely pluggable, and ArchUnit
boundary tests froze the most important architectural invariants so they cannot silently rot.

**Server-authoritative liveness with an active challenge.** Placing the auth decision on the server
and combining passive liveness with the active Biometric Puzzle is, we believe, the project's
strongest design choice. It directly addresses the presentation-attack threat that defeats naive
"match a photo" systems, and the log-only client embedding (decision D2) means a compromised or
spoofed browser cannot manufacture a positive verdict. The anti-spoofing pipeline is deliberately
**fail-soft** so that a bug in a detector can never hard-block a legitimate user, while the passive
gate and EAR veto remain always-on.

**pgvector instead of a separate vector database.** Storing embeddings in PostgreSQL with pgvector
[CITE:pgvector] kept the entire data model — relational identity data and biometric vectors — in one
ACID-compliant, backup-and-restore-as-one system, avoiding the operational burden of a second
specialized datastore [CITE:faiss]. For a platform of this scale on a single VPS, that simplicity was
the right trade.

**Hosted-first OIDC integration.** Adopting the redirective hosted-login pattern that the entire
identity industry has converged on solved a cluster of real browser problems at once — Web NFC and
WebAuthn cross-origin restrictions, Safari ITP, and third-party-cookie deprecation — and gave tenants
a familiar, low-effort integration via a small SDK and standard OAuth 2.0 / OIDC endpoints
[CITE:oauth2-rfc6749,oidc-core,pkce-rfc7636].

**Defense in depth, and proof by test.** Multiple independent layers (JWT-rebound tenant context plus
Hibernate `@Filter`, fail-closed rate limiting, single-use replay-proof tokens, refresh-token family
revocation) mean no single failure breaches the tenant boundary, and the isolation guarantee is
re-checked on every merge rather than asserted once [CITE:testcontainers]. The hardened container
runtime and the 84-step auditable migration history extend the same discipline to operations.

### 7.2.2 Limitations of the Chosen Methods

**The deployment is a single point of failure.** The live system runs on one Hetzner CX43 with
single shared PostgreSQL and Redis instances and a single Traefik edge. The parent compose file
describes a two-replica, read-replica, multi-region layout, but that is a plan, not the running
deployment. There is no horizontal auto-scaling and no automated failover — adequate for a graduation
prototype and a controlled demo, but not for a production SLA.

**CPU-only hardware constrained the model choices.** Because the CX43 has no GPU, the platform
deliberately blocks GPU-hungry backends (RetinaFace, ArcFace [CITE:deng2019-arcface], heavier YOLO
variants [CITE:yolov8]) at boot via `ALLOW_HEAVY_ML=false`. MTCNN, Facenet512, and UniFace MiniFASNet
are all CPU-safe and were chosen partly for that reason. This keeps the system runnable but means the
platform is not using the current state-of-the-art recognition model, and the enrollment path is
ML-bound and comparatively slow.

**Accuracy is not formally measured.** This is the most important caveat. The thesis does not
report measured False Accept / False Reject rates for face verification, nor certified APCER / BPCER /
ACER figures for the anti-spoofing pipeline. The ISO/IEC 30107-3 metric harness exists in code
[CITE:iso30107-3], and a CASIA-FASD micro-benchmark exists in the test suite, but a rigorous,
independently reproduced evaluation on standard datasets was not completed. The performance targets in
the k6 configuration (login p95 < 300 ms, verification p95 < 500 ms) are **design targets**, not
benchmarked production numbers, and the early poster's "100% accuracy" claim is explicitly not cited
as a result (see §5.8).

**The anti-spoofing pipeline ships several layers opt-in.** Several of the richer spoof-detection
layers (device risk, usability gate, full fusion, cut-out detection) default to off in production; the
always-on path is the passive-liveness gate plus the EAR veto. The full multi-analyzer fusion is
therefore more demonstrated than continuously enforced, and the threshold calibration would need
controlled retuning before a high-assurance deployment.

**Some capabilities are partial, dormant, or removed.** Rather than imply full delivery, we list them
plainly:

- **PostgreSQL Row-Level Security** policies were authored in early migrations but found **inert** in
  production; the operative isolation is the Hibernate `@Filter` plus JWT-rebound tenant context (see
  §4.8).
- The **OIDC pairwise-subject resolver** is shipped but **dormant** behind a default-off flag.
- The server-side **fingerprint biometric was removed** (it was a placeholder); `FINGERPRINT` is now
  delivered only via WebAuthn.
- **Iris recognition** is declared in the enum but **not implemented**.
- Some verification-pipeline handlers (for example, the **watchlist check**) are production fail-fast
  stubs awaiting a real data source.
- The in-browser **card-detection model** (a 12.3 MB YOLOv8n) was trained on a limited corpus and
  generalizes weakly beyond the Turkish ID and Marmara card types it was tuned for.

**iOS was not delivered, and there is no billing.** The platform is multi-tenant in its data model and
isolation, but it has no metering, subscription, or billing subsystem, so it is not yet a commercially
operable SaaS in the revenue sense — only in the architectural one. The iOS client remains stubbed
scaffolding. And while the integration-test gate has been brought toward green, its history of being
hard to keep green on constrained runners means it should not yet be treated as fully trustworthy
without the closing work described in §5.2.

Taken together, these limitations describe a system that is **architecturally complete and operationally
deployed, but pre-certification and pre-commercial**.

## 7.3 Future Work

The limitations above map almost directly onto a concrete roadmap. The following items are ordered
roughly from those that would most improve the platform's credibility to those that would most extend
its reach.

**Formal presentation-attack-detection evaluation and certification.** The highest-value next step is
to turn the existing ISO/IEC 30107-3 metric harness [CITE:iso30107-3] into a rigorous, reproducible
evaluation: run the anti-spoofing pipeline against standard datasets (CASIA-FASD, Replay-Attack, OULU-NPU,
and SiW), report APCER, BPCER, ACER, and EER with bootstrap confidence intervals, and recalibrate
thresholds from the measured operating curve rather than hand-tuned defaults. The same effort should
produce honest FAR/FRR numbers for face verification at chosen operating points. Beyond self-evaluation,
pursuing formal third-party PAD certification (the iBeta / ISO 30107-3 testing path) would let the
platform make assurance claims that a graduation thesis, by itself, cannot.

**Model retraining and an upgrade to ArcFace.** Once GPU capacity is available — whether a GPU node or
a managed inference endpoint — the recognition model should be retrained and upgraded from Facenet512 to
an additive-angular-margin model such as **ArcFace** [CITE:deng2019-arcface], which offers materially
stronger discrimination on hard pairs, with AdaFace [CITE:kim2022-adaface] as a quality-adaptive
alternative worth benchmarking. Because changing the embedding model invalidates every stored
vector, this must be paired with a planned re-enrollment campaign and a dual-write migration window. The
in-browser YOLOv8n card-detection model should likewise be retrained on a broader corpus of
Turkish ID and passport imagery to improve generalization across document types.

**Kubernetes orchestration and horizontal scaling.** To lift the single-VPS ceiling, the deployment
should migrate from single-host Docker Compose to a container-orchestration platform such as Kubernetes,
introducing horizontal pod autoscaling for the stateless services, rolling deployments, automated
failover, and managed or replicated PostgreSQL and Redis — realizing the two-replica, read-replica, and
multi-region topologies that today exist only as aspirational compose blocks
[CITE:richardson2018-microservices]. This would also let the CPU-bound biometric service scale out
horizontally under load instead of being capped on one machine.

**Additional biometric modalities.** The hexagonal handler architecture was built precisely so new
factors slot in as adapters. The voice modality (Resemblyzer speaker embeddings) is wired and can be
matured into a first-class factor; **iris recognition** — declared in the enum but not implemented — is
the most obvious next modality; and gait or behavioral signals could extend continuous-verification
(proctoring) scenarios. Each new modality benefits from the same server-authoritative, log-only-client
discipline established for face.

**Completing platform parity.** Delivering the **iOS client** (currently stubbed and blocked on Apple
Developer enrollment) would complete the mobile story, and a macOS build would follow once code-signing
capability exists. Bringing the integration-test gate to durable green on standard runners, and
maturing the dormant or partial pieces (activating pairwise OIDC subjects where required, replacing the
fail-fast stub handlers with real watchlist and address-proof data sources, making the full
anti-spoofing fusion layers default-on after recalibration), would convert several "demonstrated"
capabilities into "enforced" ones.

**Commercialization: metering and billing.** To become a SaaS in the commercial sense and not only the
architectural one, the platform needs a usage-metering and billing subsystem — per-tenant rate plans,
verification and enrollment quotas, invoicing, and a payment integration — layered on top of the existing
tenant model. The audit-log and rate-limit infrastructure already captures most of the events such a
meter would need, so this is an extension rather than a re-architecture.

**Operational maturity.** Finally, the observability stack should be completed (deploying the configured
Prometheus and Alertmanager alongside the running Grafana/Loki/Promtail), the automated security testing
broadened from Bandit/pip-audit/gitleaks/Dependabot to include the documented-but-not-yet-wired dynamic
scanning (OWASP ZAP), dependency and container scanning (Snyk, Trivy), and a scheduled penetration test,
and the disaster-recovery runbooks exercised in regular drills rather than kept on paper.

Pursued in this order, these steps would carry FIVUCSAS from a deployed, architecturally complete
graduation prototype to a certified, horizontally scalable, commercially operable biometric
identity-verification service — the production-grade destination this thesis set out toward.
