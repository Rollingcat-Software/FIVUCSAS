# 4. TECHNICAL APPROACH AND IMPLEMENTATION DETAILS

Chapter 3 described *what* FIVUCSAS is and how its parts fit together. This chapter
descends one level deeper and reports *how* the system was actually built. We begin with
the concrete tools we adopted and why, then the data structures that move biometric and
identity data through the platform, and the algorithms we implemented (from the
eye-aspect-ratio liveness test all the way to the OAuth 2.0 / OpenID Connect
authorization-code exchange). From there we cover the operating-system and concurrency
machinery that lets a single virtual machine serve many tenants safely, the network
protocols that bind the services together, and finally the finite-state machines and
multi-tenant isolation guarantees that keep one customer's data invisible to another.
Every detail here was read from the production source tree at the time of writing; where
an older planning document disagreed with the shipped code, we followed the code. The
chapter is, in effect, a working synthesis of the undergraduate Computer Engineering
curriculum: operating systems, computer networks, databases, distributed systems, and
machine learning all appear in it not as topics but as load-bearing parts of a deployed
service.

## 4.1 Hardware and Software Requirements and Tools

FIVUCSAS runs on a single Hetzner Cloud **CX43** virtual private server: 8 virtual CPUs,
16 GB of RAM, 150 GB of disk, and Ubuntu 24.04. The instance has **no GPU**. That one fact
shaped a surprising number of downstream decisions. Every machine-learning model in the
pipeline was chosen to be CPU-safe, and a hard startup gate (`ALLOW_HEAVY_ML=false`)
refuses to boot the biometric service with GPU-only backends such as RetinaFace, ArcFace,
or YOLOv8-large, so that a careless configuration change can never silently degrade
latency or crash the host. We treat the modest hardware budget as a design discipline
rather than a limitation: a face-verification SaaS that performs acceptably on eight
commodity cores is a far more reproducible and defensible artifact than one that quietly
assumes an accelerator.

The platform is a polyglot microservice system, and each language and framework earns its
place. Table 4.1 summarizes the principal tools.

[[TABLE: Principal tools and frameworks, with the rationale for each choice]]

| Layer | Tool / version | Why it was chosen |
|---|---|---|
| Identity service | **Spring Boot 3.4.7 / Java 21** [CITE:springboot] | Mature security ecosystem (Spring Security 6.4), first-class JPA, records and virtual-thread-capable runtime; the natural home for transactional IAM logic |
| Biometric service | **FastAPI / Python 3.12** [CITE:fastapi] | Direct access to the Python ML ecosystem (DeepFace, MediaPipe, OpenCV, ONNX Runtime); async I/O and automatic OpenAPI generation |
| Web dashboard & hosted login | **React 18.3 + TypeScript 5.5** [CITE:react] | Component model, strong typing, large ecosystem (MUI, React Router, react-hook-form, i18next) for an admin SPA and a hosted OIDC login page |
| Mobile & desktop clients | **Kotlin Multiplatform + Compose** [CITE:kmp] | One shared business-logic module compiled to Android, JVM desktop, and (planned) iOS; native NFC and biometric APIs where they matter |
| Relational + vector store | **PostgreSQL 17 + pgvector** [CITE:postgresql,pgvector] | One engine for both ACID identity data and high-dimensional embedding similarity search; no separate vector database to operate |
| Coordination / cache | **Redis 7.4** [CITE:redis] | Sub-millisecond store for OTPs, OAuth codes, rate-limit counters, distributed locks, and a pub/sub event bus |
| Edge / reverse proxy | **Traefik v3.6.12** [CITE:traefik] | Automatic TLS via Let's Encrypt, Docker-label service discovery, file-provider middleware for security headers and IP allowlisting |
| Containerization | **Docker + Docker Compose** [CITE:docker] | Reproducible, hardened (`read_only` rootfs, `cap_drop: ALL`), digest-pinned deployments across all backend services |
| DB migrations | **Flyway** [CITE:flyway] | Versioned, repeatable schema evolution (V0–V84) checked into source control |

Three details need clarifying, because earlier planning documents pointed
elsewhere and we followed the shipped reality. First, the production **edge is Traefik v3,
not NGINX**. The "API gateway" described in the original analysis document was a
development-era plan, and the only NGINX on the host serves branded error pages and the
static login SPA. Second, the mobile and desktop clients are **Kotlin Multiplatform**, not
Flutter as the specification originally proposed; Compose Multiplatform let us share a
single domain layer across Android and desktop and reuse native security primitives such as
Android Credential Manager for FIDO2 and the OS keystore for token storage. Third, on the
modeling side, the face recognizer in production is **Facenet512** producing
512-dimensional embeddings, not the 2622-dimensional VGG-Face embedding sketched in the
specification. We found Facenet512 to be both lighter on CPU and more than adequate at the
verification thresholds we operate at.

Developer tooling and standards round out the picture: IntelliJ IDEA and PyCharm for the
backends, VS Code for the front ends, Git/GitHub for version control with branch protection
and pull-request review, Maven for the Java build and Gradle for the Kotlin clients, and a
GitHub Actions continuous-integration pipeline (covered in Chapter 5) that gates every
merge on roughly **4,400 automated tests** across five test technologies.

## 4.2 Data Structures

A multi-tenant biometric platform depends heavily on its choice of data structures, because
the same byte of data (a face embedding, a one-time code, a refresh token) must be cheap to
write, fast to search, and impossible to leak across a tenant boundary. We describe the
ones that carry the most weight.

**Dense embedding vectors.** The central biometric data structure is a fixed-length vector
of 32-bit floats. A face embedding is a `vector(512)` produced by Facenet512; a voice
embedding is a 256-dimensional Resemblyzer speaker vector; the client-side geometry
"embedding" is a 128-dimensional landmark-distance vector that is recorded for offline
analysis but, by the D2 design decision, never used to make an authentication decision. All
of these are stored in PostgreSQL columns of pgvector's native `vector` type, which is what
makes approximate-nearest-neighbour search possible inside the relational database itself.
A small but important refinement is that the face store is **dual-column**: the plaintext
`embedding` column is the searchable index surface, while an `embedding_ciphertext` column
holds the same vector encrypted with Fernet (AES-128-CBC + HMAC-SHA-256) under a versioned
key (`key_version`) so that biometric templates are protected at rest and the key can be
rotated without re-enrolling every user. Voice enrollments additionally maintain a
**centroid** (`AVG(embedding)::vector` over a user's individual enrollments) so that
verification compares a probe against a quality-weighted average rather than a single noisy
sample.

**Token buckets.** Rate limiting is implemented with the classic **token-bucket** data
structure via the Bucket4j library [CITE:bucket4j]. Each rate-limit purpose (login, MFA
step, biometric call, GDPR export, per-tenant token minting) is a bucket with a capacity
and a refill rate; a request consumes a token and is rejected with HTTP 429 when the bucket
is empty. The buckets are keyed by IP, user, or tenant in size-bounded concurrent maps
(capped at 10,000 entries) that a scheduled sweep evicts every five minutes, so the
structure cannot grow without limit under a flood of distinct keys.

**Caches and ephemeral records in Redis.** Short-lived security state is modeled as
key/value records in Redis, each with a deliberately chosen time-to-live: OAuth 2.0
authorization codes (`oauth2:code:`, 10 minutes, single-use), email/SMS OTPs and their
attempt counters (5 minutes), TOTP used-code replay markers (`totp:used:`, 120 seconds),
QR cross-device sessions (5 minutes), number-matching approve-login sessions (2 minutes),
step-up challenges (5 minutes), and anti-replay nonces (`antireplay:nonce:`, 5 minutes).
Treating these as TTL-bounded records rather than rows in a relational table means they
expire automatically, never need a cleanup job, and survive a service restart without
leaving stale security tokens behind.

**Domain value objects and DTOs.** On the Java side the domain layer is built from rich
**value objects** (`Email`, `FullName`, `HashedPassword`, `PhoneNumber`, `IdNumber`,
`NfcSerial`, `TenantId`, `UserId`) that validate their own invariants at construction time,
so an invalid email address or a malformed BCrypt hash can never enter the domain. These
are mapped to and from request/response **DTOs** (`application/dto/{command,query,response}`)
at the application boundary, keeping the wire format decoupled from the persistence model.
The persistence model itself is 31 JPA `@Entity` classes; several use a deliberate state
pattern (`revokedAt`/`expiresAt` timestamps on `NfcCard` and `OAuth2Client`) and one
(`RefreshToken`) implements Spring Data's `Persistable<UUID>` with an explicit `isNew()`
flag so that manually assigned UUID primary keys insert correctly rather than being mistaken
for merge candidates.

**Registries and handler maps.** Both the login subsystem and the verification pipeline are
organized around a **strategy-plus-registry** structure: a list of handler beans is injected
and folded into a `Map<AuthMethodType, Handler>` (for login and MFA) or a
`Map<StepType, Handler>` (for the KYC pipeline). Adding a new authentication factor is then a
matter of adding one handler class; the dispatch map wires it automatically. This is the data
structure that keeps the "ten-plus authentication methods" claim maintainable rather than a
sprawling switch statement.

## 4.3 Algorithms

This section documents the algorithms we implemented, grouped by the problem each solves.
Liveness and anti-spoofing are treated first because they are the project's research core;
face matching, vector search, and quality assessment follow; and the security algorithms
(JWT, RBAC, OAuth/OIDC, MFA) are gathered in Section 4.4.

### 4.3.1 Active Liveness Detection: the Biometric Puzzle

The signature contribution of FIVUCSAS is an **active, challenge–response liveness test**
we call the *Biometric Puzzle*. Rather than passively guessing whether a face is real, the
server issues a short, randomized sequence of physical actions (blink, smile, open mouth,
raise eyebrows, turn left, turn right) and verifies that the subject actually performed
them, in order, within tight time bounds. A printed photo cannot blink on cue; a pre-recorded
video cannot satisfy a sequence it was never told in advance. This is the temporal,
genuine-motion defense that the project specification promised, and it draws directly on the
landmark-geometry approach of Soukupová and Čech [CITE:soukupova2016-ear] and on Google's
MediaPipe Face Landmarker [CITE:mediapipe].

The server code lives in `app/application/use_cases/generate_puzzle.py`,
`active_liveness_manager.py`, and `verify_puzzle.py`, exposed through
`/liveness/generate-puzzle`, `/liveness/verify`, and `/liveness/verify-challenge`. Face
geometry is scored against MediaPipe's **478-point** landmark mesh (and, when available, its
blendshape coefficients).

**Randomized challenge sequence.** `GeneratePuzzleUseCase` builds each puzzle freshly with
`random.randint` and `random.choice`. A difficulty configuration controls both the number of
steps and the per-step deadline: EASY is 2–3 steps at 7.0 s each, STANDARD 3–4 steps at
5.0 s, and HARD 4–5 steps at 4.0 s. Two anti-pattern rules harden the randomization against
prediction and against impossible physical demands: incompatible adjacent pairs such as
(TURN_LEFT, TURN_RIGHT) are forbidden from immediately following one another, and the same
action is never repeated twice in a row. Each generated puzzle is persisted with a
time-to-live of `timeout_seconds + 60`, so a stale puzzle cannot be replayed.

**Eye Aspect Ratio (EAR) for blink.** Blink detection uses the Eye Aspect Ratio over the
six MediaPipe eye landmarks (left `[362, 385, 387, 263, 373, 380]`, right
`[33, 160, 158, 133, 153, 144]`). The EAR is the ratio of the average of the two vertical
eyelid distances to the horizontal eye width:

[[EQ: Eye Aspect Ratio (EAR)]]

$$\text{EAR} = \frac{\lVert p_2 - p_6 \rVert + \lVert p_3 - p_5 \rVert}{2\,\lVert p_1 - p_4 \rVert}$$

When the eye is open the EAR sits near its baseline; when it closes the numerator collapses
and the EAR drops sharply. We capture a baseline while `avg_ear > 0.2` and register a blink
as the falling-then-rising transition through the threshold `ear_threshold = 0.21`. The real
implementation is faithful to the formula above:

```python
def _calculate_ear(self, points, eye_indices):
    p1 = np.array(points[eye_indices[0]]); p4 = np.array(points[eye_indices[3]])
    p2 = np.array(points[eye_indices[1]]); p6 = np.array(points[eye_indices[5]])
    p3 = np.array(points[eye_indices[2]]); p5 = np.array(points[eye_indices[4]])
    vertical_1 = np.linalg.norm(p2 - p6)
    vertical_2 = np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)
    if horizontal == 0:
        return 0.0
    return float((vertical_1 + vertical_2) / (2.0 * horizontal))
```

**Mouth Aspect Ratio (MAR) for smile and open-mouth.** The mouth signal is the ratio of
vertical lip opening to mouth width over four landmarks (corners 61 and 291, upper-lip
center 13, lower-lip center 14):

[[EQ: Mouth Aspect Ratio (MAR)]]

$$\text{MAR} = \frac{\lVert \text{lower\_lip} - \text{upper\_lip} \rVert}{\lVert \text{right\_corner} - \text{left\_corner} \rVert}$$

A smile fires when `MAR > 0.4` *and* the smile ratio (current MAR over the captured baseline
MAR) exceeds 1.3; the second condition guards against people whose neutral mouth already
reads wide. An open-mouth action fires at `MAR > 0.5`.

**Head pose for the turn challenges.** Yaw is approximated geometrically from the horizontal
offset of the nose tip (landmark 1) relative to the midpoint of the two ear landmarks (234
and 454): a deviation greater than `0.15` is a left turn, less than `-0.15` a right turn.
Eyebrow-raise uses the brow-to-eye vertical distance against a `0.08` threshold. When
MediaPipe blendshapes are present we prefer them directly (`eyeBlinkLeft/Right > 0.5`,
`mouthSmileLeft/Right > 0.4`, `jawOpen > 0.4`, brow blendshapes `> 0.3`), which is both more
robust and cheaper than re-deriving geometry.

**Hand-gesture challenges.** The challenge vocabulary spans two body channels. Alongside the
facial actions above, the server can request nine hand-gesture challenges: finger counting,
tracing a template shape with the index finger, waving, a palm flip, a finger tap, a pinch, a
hand-covers-face "peek-a-boo", finger arithmetic, and a hold-position task. MediaPipe Hands runs
on the client and streams 21-point hand-landmark sequences to the server, where
`active_gesture_liveness_manager.py` re-scores each gesture from the raw landmark geometry
(finger-extension ratios for counting, a sign change on the palm-normal proxy for the flip, and
dynamic-time-warping distance against a JSON shape-template catalog for tracing). Widening the
library across two independent body channels shrinks the chance that an attacker holds a
pre-recorded clip matching the exact sequence the server happens to draw.

**Scoring and anti-replay.** `VerifyPuzzleUseCase` requires each step to clear
`MIN_STEP_CONFIDENCE = 0.6` and last at least `MIN_STEP_DURATION_SECONDS = 0.5`, and the
overall pass threshold is **60%** (`PASS_THRESHOLD = 0.6`). Replay is blocked on several
axes at once: timestamps must be monotonically increasing (with a 100 ms tolerance), the
puzzle must still exist and not be expired, an already-completed puzzle is rejected, and a
capped number of submitted frames are re-run through passive liveness as a spot-check. A
deliberately lightweight `/verify-challenge` endpoint exists for the browser training
surface, with relaxed structural-only bounds, precisely so that the React puzzle component
cannot be made to "pass" on the client alone; the authoritative verdict is always the
server's. At heart this is a small finite-state and signal-detection algorithm in which a
randomized challenge, a set of geometric thresholds, and a strict temporal budget combine
to make genuine, on-cue human motion the only thing that can satisfy it.

### 4.3.2 Passive Anti-Spoofing

Active challenges are powerful but they ask something of the user; passive anti-spoofing runs
silently on a single frame and is therefore always-on. FIVUCSAS layers several passive
detectors. In production the authoritative one is **UniFace MiniFASNet** [CITE:minifasnet], a
compact convolutional anti-spoofing network run through ONNX Runtime on CPU
(`LIVENESS_BACKEND=uniface`, `LIVENESS_MODE=passive`). Because loading the ONNX model is
expensive and the runtime is hardened (`read_only` rootfs, dropped capabilities), the service
shares **one process-wide ONNX session** (`_get_shared_minifasnet()`) across requests rather
than reloading per call.

Alongside the neural detector, a classical computer-vision detector
(`TextureLivenessDetector`) computes interpretable cues with no network at all
[CITE:opencv]: **texture** energy as the variance of the Laplacian (a printed photo is
flatter than live skin), **color** distribution naturalness, a **frequency-domain** analysis,
and a **moiré-pattern** score that catches the interference fringes a camera produces when it
photographs a screen. These are fused linearly,
`score = 0.35·texture + 0.25·color + 0.25·frequency + 0.15·moiré`, and the frame is judged
live when the combined score clears the threshold.

The full research stack lives in the standalone **spoof-detector** library (deployed for
in-browser experimentation at amispoof.fivucsas.com), where thirteen Python analyzers (twenty-six
in the TypeScript browser port) feed a `HybridFusionEvaluator` that weights
MiniFASNet against flash-reflection, moiré, and device-replay signals with a decision
threshold of 0.45, and a multi-class fuser that classifies an attack into a taxonomy
(`STATIC_IMAGE`, `VIDEO_REPLAY`, `MASK_3D`, `HEAVY_MAKEUP`, `AR_FILTER`, `DEEPFAKE_INJECT`).
The library also implements the ISO/IEC 30107-3 presentation-attack metrics (APCER, BPCER,
and ACER [CITE:iso30107-3]) that Chapter 5 uses to report evaluation results. An important
design property is that the anti-spoofing pipeline is **fail-soft**: every layer is wrapped
in exception handling so a bug in a detector can never hard-block a legitimate user by
crashing; it can only decline to add evidence.

The way this wires into authentication is precise. On `/verify` (and, since the 2026-05
hardening, on `/enroll`) the server runs a **mandatory passive-liveness gate** first: if the
frame is judged not-live, or its liveness score is below `0.4`, the request is
rejected with HTTP 400 `LIVENESS_FAILED` before any matching happens. A single-frame EAR veto
(both eyes closed at threshold 0.18 is a photo signal) and the optional anti-spoof pipeline
layers can additionally escalate to HTTP 403 `ANTISPOOF_BLOCKED` when block enforcement is on.
Multi-image enrollment is **fail-closed**: a single non-live frame rejects the whole batch.

### 4.3.3 Face Embedding and Similarity Matching

Face verification is one-shot metric learning [CITE:schroff2015-facenet]. Rather than
training a classifier per user, we map every face into a 512-dimensional vector with
**Facenet512** via the DeepFace library [CITE:deepface-lib], after detecting and aligning the
face server-side with **MTCNN** [CITE:zhang2016-mtcnn,challapalli2024-mtcnn]. Two faces belong
to the same person when their embeddings are close in this space; recognition reduces to a
distance comparison.

We measure closeness with **cosine distance** on L2-normalized embeddings. Cosine similarity
is the dot product of the unit vectors, and we work in the complementary distance so that
zero means identical:

[[EQ: Cosine distance for face matching]]

$$d_{\cos}(A, B) = 1 - \frac{A \cdot B}{\lVert A \rVert \, \lVert B \rVert}$$

The implementation normalizes both vectors, takes their dot product, and clamps the result
to handle floating-point noise:

```python
emb1_norm = self._l2_normalize(embedding1)
emb2_norm = self._l2_normalize(embedding2)
cosine_similarity = np.dot(emb1_norm, emb2_norm)
cosine_distance = np.clip(1.0 - cosine_similarity, 0.0, 1.0)
```

A probe matches when the distance falls **below** a threshold; a lower threshold is stricter.
Production uses `VERIFICATION_THRESHOLD = 0.4`. Two refinements are worth spelling out. First,
because biometrics drift with age, an **adaptive threshold** loosens the gate to 0.55 for
stored templates older than two years (`VERIFICATION_THRESHOLD_AGED`), and a configuration
validator enforces that the aged threshold is never *stricter* than the standard one, a guard
added after an earlier inversion bug. Second, the comparator is deliberately consistent across
modalities but with the correct polarity in each: face verify uses cosine *distance* with a
`<` test, while voice verify uses cosine *similarity* with a `>= 0.65` test, and the two must
not be confused.

### 4.3.4 1:N Identification with pgvector

Verification answers "is this the person they claim to be?" (1:1). Identification answers "who
is this, out of everyone enrolled?" (1:N), and naively that means comparing the probe against
every stored embedding, linear in the size of the gallery. We avoid that cost by pushing the
search into the database with **pgvector** [CITE:pgvector], which adds a native `vector` type
and approximate-nearest-neighbour (ANN) index to PostgreSQL. The 1:N face search endpoint
(`/search`) issues a query using pgvector's cosine-distance operator `<=>`, and the database
returns the closest matches without a full scan.

The production index is an **IVFFlat** index built with `vector_cosine_ops` and `lists = 100`
(`CREATE INDEX … USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`). IVFFlat
partitions the vector space into clusters at build time and probes only the nearest clusters
at query time, trading a controllable amount of recall for a large speed-up. This is the same
inverted-file idea that underlies GPU ANN systems such as FAISS [CITE:faiss], here available
inside the relational store we already operate. (An HNSW index exists on a legacy table and as a commented-out
alternative in the operative migration; the production index on `face_embeddings` is IVFFlat.) Every search is
**tenant-scoped**: the query is constrained to the caller's tenant and a server-side cap bounds
the maximum acceptable distance, so identification can never reach across a tenant boundary.
This is where databases and machine learning meet in the platform (classical index theory
applied to high-dimensional learned features), and it is what makes 1:N identification fast
enough to run inside the same transactional store that holds the identity data.

### 4.3.5 Image Quality Assessment

Garbage in, garbage out: a blurred or badly lit face produces an unreliable embedding, so
every enrollment and verification frame passes a quality gate first
(`quality_assessor.py`). The overall quality score on a 0–100 scale is a weighted sum of three
sub-scores (blur, lighting, and face size):

[[EQ: Composite image-quality score]]

$$Q = 0.4 \cdot \text{blur} + 0.3 \cdot \text{lighting} + 0.3 \cdot \text{face\_size}$$

Blur is measured as the variance of the Laplacian (sharp images have high-frequency content
and thus high variance); lighting is mean brightness; face size scores how much of the frame
the face occupies. A best-effort head-pose penalty multiplies the score by 0.7 when the
estimated yaw exceeds 30° or pitch exceeds 25°, and a frame with Laplacian variance below 5
(essentially unusable) is hard-rejected outright. The operational thresholds are tuned to
admit real-world webcam frames without admitting junk: enrollment uses a floor of 40 and
verification a slightly stricter 50, values arrived at empirically because over-strict gating
frustrated genuine users far more than it stopped attackers.

## 4.4 Authentication, Authorization and Security

If liveness is the project's research heart, the identity service is its engineering heart.
This section documents the cryptographic and protocol-level algorithms that make FIVUCSAS an
authentication platform rather than a face-matching demo. The corresponding security
architecture is shown in [[FIG:security_arch | Security architecture: JWT signing/verification, RBAC, TLS termination, and layered rate limiting]].

### 4.4.1 JWT, RBAC and Password Security

**Password storage.** Passwords are hashed with **BCrypt at work factor 12** [CITE:bcrypt]
(`new BCryptPasswordEncoder(12)`), an adaptive, salted scheme whose cost can be raised as
hardware improves. A `HashedPassword` value object validates the BCrypt format, a
`PasswordHistory` entity prevents reuse, and invite/temporary passwords are generated from a
`SecureRandom` source.

**JSON Web Tokens.** Access tokens are JWTs [CITE:jwt-rfc7519] minted by `JwtService` (jjwt
0.12.6). The service supports two signing algorithms side by side: a legacy symmetric **HS512**
and an asymmetric **RS256** used for OIDC. Production pins RS256 and a `@PostConstruct` check
**fails fast at boot** if the production profile is active but the algorithm is not RS256.
Because a historical HS512 secret once leaked, HS512 verification is **off by default**: any
HS512-tagged token is rejected unless an operator explicitly opens a rollback window. A
`kid` (key-id) revocation list provides defense in depth. A `Locator<Key>` reads the JWS `kid`
header and routes verification to the matching key, rejecting unsigned tokens and unknown or
algorithm-mismatched key ids, which closes the classic algorithm-confusion forgery class.
Access tokens live 15 minutes in production and carry `iss` and `aud` claims that the parser
requires; refresh tokens live 24 hours. Crucially, the token records *how* the user
authenticated: following RFC 8176, `VerifyMfaStepService` accumulates an **`amr`** (authentication
methods reference) array (`pwd`, `otp`, `sms`, `face`, `voice`, `hwk`, and so on) so a relying
party can see that genuine multi-factor authentication occurred rather than merely that a token exists.

**Role-Based Access Control.** Authorization is enforced with Spring's method security
(`@EnableMethodSecurity` + `@PreAuthorize`) backed by a custom `RbacPermissionEvaluator`. The
authority model is deliberately two-tier: a `user_type` platform tier
(`ROOT > TENANT_ADMIN > TENANT_MEMBER > GUEST`) is the sole source of platform-level authority,
while `role` is purely within-tenant RBAC across 48 fine-grained permissions. The former global
`SUPER_ADMIN` was renamed `ROOT` and granted all permissions in a controlled migration. This
separation is what lets a tenant administrator manage their own users without ever gaining
visibility into another tenant, and it is enforced by the same `@PreAuthorize` checks on every
controller method.

### 4.4.2 OAuth 2.0 / OpenID Connect and Hosted Login

FIVUCSAS is "hosted-first": the primary way a third-party application integrates is the
**redirective OpenID Connect authorization-code flow**, the same pattern used by Auth0
Universal Login, Okta, Microsoft Entra, Keycloak, and Türkiye's e-Devlet. A tenant calls
`FivucsasAuth.loginRedirect(...)`, the browser navigates top-level to
`verify.fivucsas.com/login` by way of `/oauth2/authorize`, the user completes MFA, and the
browser returns to the tenant's `redirect_uri` with `?code=…&state=…`, which the tenant
exchanges at `/oauth2/token`. Choosing a top-level redirect over an embedded iframe was a
deliberate response to real browser constraints: Web NFC, WebAuthn, password-manager autofill,
Safari's Intelligent Tracking Prevention, and the death of third-party cookies all behave badly
inside a frame. The OIDC discovery document (`/.well-known/openid-configuration`) and JWKS
(`/.well-known/jwks.json`) are public so any standards-compliant client can self-configure.

The flow follows the relevant RFCs faithfully [CITE:oauth2-rfc6749,oidc-core]. Authorization
codes are single-use, stored in Redis under `oauth2:code:` with a 10-minute TTL, deleted on
first exchange, and matched exactly against the registered `redirect_uri` and `client_id`.
Confidential clients must present a valid `client_secret` at the token endpoint regardless of
PKCE (PKCE is not a substitute for client authentication), and secret rotation is supported
through a grace window. The userinfo endpoint rejects ID tokens to prevent token-type confusion.

Public clients (mobile apps, SPAs, desktop loopback clients) are protected by **Proof Key for
Code Exchange** [CITE:pkce-rfc7636]. The client generates a random `code_verifier`, sends its
SHA-256 hash as the `code_challenge` at authorization time, and presents the original verifier at
token time; the server recomputes the hash and compares. The `S256` method is mandatory for
public clients (`plain` is rejected per RFC 7636 and RFC 8252). The verification follows the
RFC's `BASE64URL(SHA-256(code_verifier))` to the letter:

```java
private boolean verifyCodeChallenge(String codeVerifier, String codeChallenge, String method) {
    if ("S256".equalsIgnoreCase(method) || method.isEmpty()) {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
        String computed = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        return codeChallenge.equals(computed);
    } else if ("plain".equalsIgnoreCase(method)) {
        return codeChallenge.equals(codeVerifier);
    }
    return false;
}
```

The matching JavaScript SDK generates PKCE in the browser with `crypto.subtle.digest`, stores the
verifier/state/nonce in `sessionStorage`, validates `state` on return (CSRF defense) and the
id_token `nonce` (OIDC replay defense), and refuses any `redirect_uri` that is not HTTPS, an
RFC 8252 loopback, or a registered custom scheme, blocking `javascript:`, `data:`, and `file:`
schemes outright.

### 4.4.3 Multi-Factor Authentication and Step-Up

Authentication in FIVUCSAS is not a single password check but an **adaptive, multi-step engine**.
A tenant administrator composes a login flow as an ordered list of layers, where each layer is a
set of acceptable methods plus a "required" flag (the `SEQUENTIAL` vs `CHOICE` step types; CHOICE
means "satisfy any one of these"). The N-step flow is driven by `POST /auth/mfa/step`, and the
JWT is withheld until every required layer is satisfied, at which point the accumulated `amr`
claim records the full set of factors used. Ten-plus factors plug into this engine through the
handler registry: `PASSWORD`, `EMAIL_OTP`, `SMS_OTP`, `TOTP`, `FACE`, `VOICE`, `FINGERPRINT`
(delivered via WebAuthn platform authenticators), `HARDWARE_KEY`, `QR_CODE`, `NFC_DOCUMENT`, plus
the cross-device additions `PASSKEY` (discoverable WebAuthn) and `APPROVE_LOGIN` (number matching).

Each factor carries its own anti-replay algorithm. **TOTP** (time-based one-time passwords)
marks a verified `(userId, timeStep)` pair as consumed in Redis with an atomic
`SET key 1 EX 120 NX`, so the same code cannot be replayed within its validity window, and the
secret is encrypted at rest with AES-GCM-256. **OTP** codes store an attempt counter alongside the
code and delete the code once the counter reaches five wrong guesses, capping the brute-force budget. **WebAuthn/passkeys**
[CITE:webauthn] are validated with the Yubico library against an explicit origin allowlist, with
manual `rpIdHash` (SHA-256) comparison and `signCount` monotonicity to detect cloned authenticators.
**Approve-login** uses Redis-backed number matching where the match number is a zero-padded string
and an unknown email returns a decoy session, so the endpoint reveals nothing about which accounts
exist. **Step-up** re-authentication for sensitive operations uses an ECDSA signed-nonce device
challenge with a 5-minute TTL. The same `MfaStepRenderer` component renders every factor's UI on
both the dashboard and the hosted login page, so a new method appears on both surfaces at once.

## 4.5 Operating-System and Concurrency Details

A single eight-core VPS serving many tenants is, fundamentally, an exercise in the operating-systems
curriculum: scheduling, mutual exclusion, idempotency, and the careful use of asynchronous I/O.

**Asynchronous and synchronous concurrency.** The biometric service is built on Python's
`async`/`await` event loop under Uvicorn/Gunicorn: I/O-bound work (database round-trips, Redis
calls) yields the loop so the service can interleave many in-flight requests on few OS threads,
while CPU-bound model inference is dispatched so as not to stall the loop. The identity service uses
Spring's thread-per-request model with `@Async` (`AsyncConfig`) for fire-and-forget work and a
synchronous `RestClient` for its calls to the biometric service. The latter is deliberate, because the
verification decision must be made before the response is returned.

**Mutual exclusion and single-replica jobs.** Scheduled jobs must not double-run if the service is
ever scaled to multiple replicas, so every `@Scheduled` method is guarded by **ShedLock**
(`@SchedulerLock`), a distributed lock backed by the database. The nightly GDPR purge
(`SoftDeletePurgeJob`, daily 03:30), the 15-minute guest-invitation expiry, and the 5-minute
rate-limit bucket eviction all acquire the lock first; a rolling deploy that briefly runs two
instances cannot run the purge twice. In-memory fallbacks (used when Redis is briefly unavailable)
are built from `ConcurrentHashMap`, `AtomicInteger`, and `AtomicLong` with CAS guards and bounded
size, the classic lock-free concurrency primitives.

**Idempotency and exactly-once consumption.** Several flows must be exactly-once even under crashes
or retries. The MFA-to-OAuth handoff marks the MFA session **consumed before** minting the
authorization code and deletes it in the **same database transaction**, so a crash leaves the session
poisoned rather than replayable. Redis authorization codes are deleted on first exchange. The TOTP
`SET … NX` is the atomic single-use primitive. Refresh-token rotation implements RFC 6749 §10.4
reuse detection: tokens rotate within a `family_id`, and presenting a stolen sibling triggers a
family-wide revocation that runs in `Propagation.REQUIRES_NEW` so the revocation **commits even when
the offending outer transaction rolls back**. This is a subtle but essential transactional-isolation detail
that a naive implementation gets wrong, and one that only became visible to us under deliberate
adversarial review.

**Idempotent inserts and replay defense.** `RefreshToken implements Persistable<UUID>` so that
manually assigned primary keys insert rather than silently no-op as merges, and an `AntiReplayFilter`
enforces an `X-Request-Nonce` (5-minute Redis window) on every biometric and NFC enroll/verify/search
call so a captured request cannot be replayed.

**Hardened runtime.** At the OS-container boundary, every backend container runs with a `read_only`
root filesystem, `no-new-privileges`, and `cap_drop: ALL` (re-adding only the few capabilities a
`gosu` UID-100 privilege drop needs), with writable paths granted only through explicit `tmpfs` and
named volumes. The biometric image is digest-pinned with a frozen dependency lock because a floating
rebuild once segfaulted the MiniFASNet ONNX preload under precisely this hardened runtime, a concrete
reminder that least-privilege OS configuration and native ML libraries interact in non-obvious ways.

## 4.6 Networking and Protocols

FIVUCSAS is a distributed system, and its correctness depends on the contracts between its parts as
much as on the code inside them. The network architecture and request routing are shown in
[[FIG:network_arch | Network architecture: TLS termination at Traefik, public vs. internal routing, and the API-key-protected biometric service]].

**TLS everywhere at the edge.** All public traffic terminates at Traefik v3, which redirects port 80
to 443 and obtains certificates automatically from Let's Encrypt. Traefik discovers services from
Docker labels and applies file-provider middleware globally: HSTS, `X-Content-Type-Options`,
`X-Frame-Options: DENY`, a scoped `Permissions-Policy` (camera/microphone/WebAuthn allowed only on
verify.fivucsas.com), and rate limiting. An IP allowlist gates the administrative surfaces
(`/swagger-ui`, `/v3/api-docs`, `/actuator`) so they return 403 to the public internet, and a
hardening change set `forwardedHeaders.trustedIPs` to empty so Traefik overwrites the
`X-Forwarded-For` header with the real peer IP, closing a per-IP rate-limit bypass.

**REST contracts between services.** The identity service and the biometric service communicate over
**REST/JSON**. The biometric service has **no public route**: it is reachable only on the internal
Docker `backend` network at `http://biometric-api:8001`, and every `/api/*` call must carry an
`X-API-Key` header enforced by middleware, so the only client that can reach it is the identity API.
Each service publishes an OpenAPI contract (Swagger for the Java API, FastAPI's automatic schema for
the Python service), making the contract machine-readable and testable.

**The OIDC redirect protocol.** As detailed in Section 4.4.2, third-party login is a browser-mediated
redirect protocol: authorize request → hosted login → MFA → authorization-code redirect → back-channel
token exchange. The data-flow of the verification pipeline that this protocol guards is shown in
[[FIG:dataflow_verification | Data flow of the verification pipeline, from client capture through liveness, embedding, and decision]].

**WebSocket proctoring.** Real-time session monitoring is not request/response but a persistent
bidirectional stream: the biometric service exposes a WebSocket endpoint (`/ws/live-analysis`) and the
web client connects with `socket.io-client`, streaming frames for continuous verification and
receiving incident events. This is the project's use of a stateful application-layer protocol where
HTTP's request/response model would be a poor fit.

**NFC and the eMRTD protocol.** Document-based identity verification reads the contactless chip of an
electronic passport or national ID card following ICAO Doc 9303 [CITE:icao9303]. The Android client
performs the on-device chip dialogue over `IsoDep` APDUs (Basic Access Control, secure messaging, and
data-group reads), while the **passive-authentication** cryptography is server-authoritative. The
client submits the EF.SOD security object and the data groups, and the biometric service's
`POST /nfc/verify-authenticity` runs the standard three-step passive-authentication chain:

1. each data-group hash must match the value signed in the SOD;
2. the SOD's CMS SignedData signature must verify under the embedded Document Signer certificate; and
3. that Document Signer certificate must chain to a trusted CSCA root in the operator's trust store.

The whole check is **fail-closed**: an empty trust store, an expired certificate, or any mismatch
rejects the document. This is pure-Python cryptography with no ML, and it is the cleanest example in
the system of an international networking and security standard implemented end to end.

## 4.7 Finite State Machines

Many of the platform's workflows are long-lived and must be reasoned about as **finite-state machines**
(FSMs): a session, an enrollment, a verification, or a user account is always in exactly one defined
state, and only specific transitions are legal. Modeling them explicitly, rather than as ad-hoc
boolean flags, is what makes the system auditable and prevents illegal states such as "verified but
never enrolled" or "consumed token reused." Four FSMs anchor the design.

The **session finite-state machine** governs an authentication session from creation through the
MFA steps to completion, expiry, or revocation. It is the FSM that the consume-then-mint idempotency
of Section 4.5 enforces: a session in the `COMPLETED`/`CONSUMED` state can never transition back to a
usable one. The full lifecycle appears in [[FIG:fsm_session | Session finite-state machine: creation, MFA progression, completion, expiry, and revocation]].

The **verification finite-state machine** drives the identity-verification (KYC) pipeline through its
ordered steps (document scan, data extraction, face match, liveness check, and so on), with
transitions for a passed step, a failed step, a step requiring manual review, and overall
completion or rejection, as illustrated in [[FIG:fsm_verification | Verification finite-state machine: per-step progression with pass, fail, manual-review, and terminal states]].

The **biometric-enrollment finite-state machine** models a face or voice enrollment from initial
capture through quality assessment and liveness gating to a persisted, active template, or to a
rejection that re-prompts capture. The fail-closed multi-image enrollment of Section 4.3.2 is one of
this machine's transition rules; [[FIG:fsm_enrollment | Biometric-enrollment finite-state machine: capture, quality/liveness gating, persistence, and re-enrollment]] depicts the complete machine.

The **user-account finite-state machine** tracks the account lifecycle (pending, active, locked,
suspended, and soft-deleted), including the lockout transition after repeated failed logins and the
GDPR soft-delete state that the nightly purge job eventually finalizes, shown in [[FIG:fsm_user | User-account finite-state machine: pending, active, locked, suspended, and soft-deleted states]].

Modeling these as explicit state machines made each transition a single, testable method and
put the illegal states beyond the reach of the code: a session in `COMPLETED`, an enrollment
that failed its liveness gate, or a soft-deleted account cannot silently slip back into a usable
state, because no transition out of those states is written.

## 4.8 Multi-Tenant Data Isolation

The hardest non-functional guarantee in a SaaS platform is that one tenant can never see another's
data; proving it is a distributed-systems and database problem in equal measure. FIVUCSAS
enforces isolation in depth, at several layers, so that a failure in any one does not breach the
boundary.

**Application-layer tenant context.** A `TenantContext` thread-local is established by
`TenantContextFilter` at the start of each request and then **re-bound from the verified JWT** by
`TenantBindFromAuthFilter` *after* authentication, so a forged `X-Tenant-ID` header cannot swap a
caller into another tenant; only a `ROOT` platform-tier user keeps the legitimate cross-tenant
override.

**Persistence-layer filtering.** The operative isolation is a Hibernate `@Filter`. A global
`@FilterDef("tenantFilter")` is applied as `tenant_id = :tenantId` on the nine tenant-scoped entities
(`AuditLog`, `AuthSession`, `MfaSession`, `UserEnrollment`, `VerificationSession`, `OAuth2Client`,
`UserDevice`, `AuthFlow`, `UserSettings`), automatically constraining every derived query. Role definitions widen the
filter to `(tenant_id = :tenantId OR tenant_id IS NULL)` so global roles stay visible, and the
cross-tenant identity entities (`Identity`, `IdentityEmail`, `IdentityTenantBiometricConsent`)
deliberately carry **no** filter because they are platform-level by design. A `TenantFilterBypass`
exists for the user-centric `/my` self-service endpoints, which must resolve a user under a foreign
tenant scope. One caveat about the shipped reality belongs here, because it matters for any reader
auditing the isolation: PostgreSQL **Row-Level Security** policies were authored in SQL (migration
V25 and others) but found **inert in production**. The isolation that actually runs is therefore the
Hibernate `@Filter` plus the tenant-scope resolver, not Postgres RLS.

**Search-layer scoping.** Vector search inherits the same discipline: the 1:N pgvector search of
Section 4.3.4 always constrains to the caller's tenant, and cross-tenant biometric search is forbidden
outright.

**Proof by test.** Isolation is a CI gate, not an assertion. A set of Testcontainers
integration tests (`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`, `IdentityBiometricConsentIT`,
and others) run against a real PostgreSQL+pgvector and Redis on every pull request, and the pipeline
parses the test report to **assert that these named isolation tests actually executed**, a guard against
a security test being silently skipped. Isolation is therefore mechanically re-verified on every
merge rather than merely claimed, which is the strongest guarantee the platform can make about the
boundary that matters most in a SaaS.
