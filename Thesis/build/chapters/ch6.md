# 6. BENEFITS AND IMPACT

A graduation project should also be judged by whom it serves and what it sets in
motion. FIVUCSAS, the Face and Identity Verification Using Cloud-based SaaS
platform, began as an answer to a concrete, painful problem: identity proofing and
authentication remain fragmented, password-bound, and dangerously easy to spoof, while the
specialist software that could fix this stays locked behind enterprise procurement that
small organizations cannot reach. This chapter steps back from the architecture and the
code to ask harder questions. Who benefits, and how? What did the work contribute to
the scientific record? What is its economic, commercial, and social weight? Could it seed
future projects? And, given that the platform reads electronic travel documents over
NFC and matches the holder's live face against the chip, what is its bearing on national
security? We answer each in turn, taking care to distinguish what was actually
delivered and measured from what remains a reasonable expectation or a target for future
evaluation.

## 6.1 Benefits and Implications

The most direct beneficiaries of FIVUCSAS fall into two groups that the project deliberately
served at the same time: the **end users** who must prove who they are, and the **service
providers** (tenants) who must trust that proof. The Project Specification framed this
two-sided value from the outset, and the delivered system bears it out.

For **end users**, the platform replaced the brittle ritual of remembering passwords and
carrying access cards with authentication that is both stronger and lighter. A person can
log in with their face, a one-time code, a passkey, a hardware security key, a voice
sample, or by reading the chip in their national identity card or passport. A tenant
administrator chooses which of these to require, so the security level matches the
sensitivity of the resource rather than defaulting to a single weak factor. The same
person manages their own data through a self-service profile: they can list their
biometric enrollments, review recent activity, see and revoke sessions on other
devices, and export or request deletion of their personal data. The benefit to the
user goes beyond "fewer passwords": a verifiable, controllable
identity that the user as well as the provider can inspect and act on. This matters
because biometric data is uniquely sensitive (it cannot be reset like a password), and a
platform that asks for a face owes its users transparency in return.

For **service providers**, FIVUCSAS lowered the barrier to deploying modern, multi-factor,
anti-spoofing authentication from a multi-month engineering programme to a single
integration. A tenant does not implement face matching, liveness detection, OAuth 2.0,
token issuance, rate limiting, or KVKK-compliant data handling; it redirects its users to
a hosted login page or embeds a widget and consumes a standards-compliant OpenID Connect
identity token in return [CITE:oauth2-rfc6749,oidc-core]. The implication is economic as
well as technical: the provider lowers its operational cost (no specialist security team
for the auth surface), reduces its breach exposure (credentials and biometric templates
never live in the tenant's database), and gains a competitive feature that would otherwise
be the preserve of large institutions: strong, liveness-protected identity verification. The multi-tenant design makes this realistic at small scale, because the
platform's fixed cost is amortized across every tenant rather than rebuilt by each.

There is a third, quieter beneficiary that the original specification did not name but the
project served all the same: the **integrating developer**. Because the platform exposes
its capabilities as a clean, documented OIDC contract with a published SDK rather than a
bespoke API per feature, a developer can wire identity verification into an existing
application without becoming a biometrics expert. The hosted-first integration model (the
same pattern used by Auth0 Universal Login, Okta, Microsoft Entra, and Türkiye's own
e-Devlet) means the hardest and most security-critical parts of the flow happen on
infrastructure the developer never has to harden. This is a real implication for software
quality at large: when secure authentication is easy to adopt correctly, more applications
adopt it correctly, and the baseline of digital trust rises.

A frank accounting of implications must also note the responsibilities the platform takes
on. Holding biometric templates for many tenants concentrates risk; the platform answers
this with encryption of stored embeddings, strict tenant isolation enforced and re-tested
on every merge, and a separation of the authentication decision onto the server where it
cannot be tampered with from an untrusted browser. These are not incidental features;
they are the conditions under which the benefits above are legitimate rather than reckless.

## 6.2 Scientific Impact

If the project has a single scientific centerpiece, it is the **Biometric Puzzle**, an
active, challenge-response liveness-detection scheme that the platform implemented end to
end rather than merely proposing. Conventional active liveness asks a user to blink or turn
their head, a fixed routine that a sufficiently prepared attacker can pre-record and replay.
The Biometric Puzzle instead issues a *randomized* sequence of facial and gestural
challenges from a defined challenge set, then scores the response server-side against the
specific challenge that was issued. Because the challenge is unpredictable and bound to a
short-lived session, a pre-recorded video cannot anticipate the challenge it will be asked
to answer. The implementation grounds this idea in concrete, measurable
signals: eye-aspect-ratio for blink detection following the landmark-based formulation of
Soukupová and Čech, mouth-aspect-ratio for smile and mouth-open challenges, and head-pose
estimation for turn challenges, with the eye-aspect-ratio blink threshold fixed at 0.21
in production [CITE:soukupova2016-ear,mediapipe]. A rigorous analysis of such a scheme's
accuracy and spoofing resistance, which the evaluation roadmap in Section 7.3 scopes, is
the kind of contribution that could anchor a future publication.

A second, more systemic scientific contribution is the **reproducible evaluation posture**
the project adopted around anti-spoofing, a posture that matters because the field is
plagued by unreproducible claims. The platform's passive defenses combine a
learned model (UniFace MiniFASNet, run as a shared ONNX session) with classical
computer-vision detectors that need no GPU: texture analysis, moiré-pattern detection,
frequency-domain analysis, color-distribution checks, screen-replay detection, and an rPPG
(remote photoplethysmography) analyzer, fused under a conservative verdict policy in which
either backend voting "spoof" wins [CITE:minifasnet,opencv]. These were exposed as a
standalone, inspectable library and a browser-based tester so that their behavior can be
examined rather than taken on faith. Crucially, this thesis reports presentation-attack
results in the vocabulary of the international standard (APCER and BPCER in the
ISO/IEC 30107-3 sense) and labels every figure as measured on a specific test set or as a
target, never as a universal accuracy claim [CITE:iso30107-3]. The project also declined to
publish the unverified "100% accuracy" fuser figure pending a reproducibility review (see
Section 5.8).

Beyond liveness, the project is a worked, public demonstration of how to assemble mature
research components (MTCNN face detection, a FaceNet-style 512-dimensional embedding with
cosine-similarity matching, MediaPipe's 478-point face landmarker on the client, and
approximate nearest-neighbour search over those embeddings in PostgreSQL via pgvector)
into a coherent, multi-tenant production pipeline rather than an isolated notebook
experiment [CITE:zhang2016-mtcnn,schroff2015-facenet,pgvector,deepface-lib]. The
engineering decisions that made this work are documented design knowledge that other
researchers and student teams can reuse and critique: performing the authentication
decision on the server because the browser is untrusted, treating client-side facial
geometry as a log-only signal, and modeling authentication and verification as explicit
finite-state machines whose illegal transitions simply do not exist in code. That
transferable design record, as much as any single algorithm, is the project's scientific
yield.

## 6.3 Economic, Commercial and Social Impact

Economically, FIVUCSAS delivered a working prototype with genuine commercialization
potential, exactly as the specification projected. The platform is structured as a
multi-tenant Software-as-a-Service, which is the pre-condition for a subscription or
usage-based revenue model: tenants are onboarded through self-service, isolated from one
another, and metered on a shared infrastructure whose marginal cost per tenant is low.
This is the cost structure that makes Software-as-a-Service commercially viable, and the
platform is built to it: self-service tenant creation, DNS-based email-domain verification,
guest invitation and revocation, and an embeddable SDK that a paying customer can integrate
in an afternoon.
The cost story for the customer is equally concrete: identity verification, anti-spoofing,
and standards-compliant token issuance are consumed as a service instead of being rebuilt,
which converts a large, risky capital project into a predictable operating expense.

On the commercial side, the differentiator is a combination the market rarely offers small
buyers at once: liveness-protected biometric verification, document and chip reading, twelve
selectable authentication methods (the ten canonical login factors plus the two
cross-device additions), and a hosted OIDC integration, packaged so that an organization
without a security team can adopt it. The platform was deployed to production across a
public landing site, a tenant dashboard, a hosted login origin, an embeddable widget, a
demonstration tenant, and a live anti-spoofing tester, demonstrating that the offering runs
in production rather than only in a build. To be clear about market traction: the system
is a deployed prototype with demonstration tenants, and broad commercial adoption, formal
certification, and a priced go-to-market remain future work. The commercial *foundation*,
however, does exist: a running, multi-tenant, standards-based platform.

Socially, the impact runs along three lines the specification identified and the build
made real. First, **safer everyday authentication**: by making strong, anti-spoofing,
multi-factor identity verification cheap to adopt, the platform pushes against the password
reuse and card cloning that underlie a large share of account-takeover and identity-theft
harm, contributing in a modest way to reducing cybercrime [CITE:verizon2024-dbir,itrc2023].
Second, **digital transformation and inclusion**: the same hosted identity layer can serve
e-government portals, banking, healthcare, education, and transport (precisely the public-
facing services named in the problem statement), and its bilingual Turkish/English
interface and accessibility-minded design lower the barrier for the populations those
services must reach. Third, and inseparable from the first two, **data dignity**: because
the platform treats biometric data as the uniquely sensitive category it is (encrypting
stored templates, requiring explicit per-tenant biometric consent, isolating tenants, and
giving every user export and deletion controls), it advances the social norm that strong
authentication and strong privacy are not opposites but requirements of the same system,
in line with KVKK Law No. 6698 and the GDPR [CITE:kvkk6698,gdpr]. A platform that
collected faces without those guarantees would have a *negative* social impact; the
project's deliberate design choices are what make its social impact a benefit.

## 6.4 Potential Impact on New Projects

FIVUCSAS was built, from the start, to be a foundation others can build on, and its
structure makes that more than aspiration. The platform is an end-to-end, working
reference for a stack that student and research teams frequently want but rarely see
assembled correctly: a hexagonal-architecture Spring Boot service and a FastAPI machine-
learning service behind a Traefik edge, PostgreSQL with pgvector and Redis for state,
Kotlin Multiplatform clients sharing logic across Android, desktop, and the web, and a
React dashboard, all wired through OAuth 2.0/OIDC with PKCE
[CITE:springboot,fastapi,kmp,react,traefik,postgresql,redis,pgvector,pkce-rfc7636]. A new
project does not have to rediscover how these pieces fit; it can study a system where they
already do.

The most reusable contributions are the patterns rather than any one feature. The decision
to make the authentication verdict server-authoritative and to treat untrusted client
signals as log-only is a directly transferable security stance for any biometric system. The
explicit finite-state-machine modeling of authentication, verification, session, and
enrollment lifecycles is a software-engineering template that makes correctness testable.
The multi-tenant isolation strategy is a pattern any SaaS project can adopt:
application-layer tenant context re-bound from the verified token, persistence-layer
filtering, search-layer scoping, and CI gates that assert the isolation tests actually ran. And the
project's evaluation discipline, reporting presentation-attack performance against the
ISO/IEC 30107-3 vocabulary and refusing to publish irreproducible numbers, is a methodology
new projects can inherit wholesale [CITE:iso30107-3].

Concretely, the specification anticipated that the work could inspire follow-on initiatives,
and the architecture leaves clear seams for them. New biometric modalities slot into the
existing pipeline the way voice already did alongside face. The pluggable, configurable
authentication flows invite research into *adaptive* and risk-based authentication, where
the required factors respond to context. The standalone anti-spoofing library and its
browser tester are a ready substrate for further presentation-attack-detection research.
And the documented but not-yet-realized roadmap items (Kubernetes orchestration, formal
presentation-attack-detection certification, and model retraining pipelines) are
well-defined entry points for a successor team. The platform is, in short, less a finished
artefact than a starting line, which is the most useful thing an undergraduate project can
be for the projects that come after it.

## 6.5 Impact on National Security

National security was never the framing of FIVUCSAS, but the capabilities the project
delivered place it squarely on the terrain of identity, cyber, and border security, and the
case is worth making plainly because it rests on shipped code rather than ambition.

The most direct connection is **border and travel-document security**. The platform's
mobile client reads electronic Machine-Readable Travel Documents (electronic passports and
Türkiye's electronic national identity card) over NFC, using the chip-access protocols
defined by ICAO Doc 9303: it performs PACE (using the EF.CardAccess parameters), reads the
document data groups and the security object, and the *server* verifies the document's
authenticity through passive authentication rather than trusting the phone
[CITE:icao9303]. The biometric service exposes the matching endpoints,
`POST /nfc/mrz` and a server-authoritative `POST /nfc/verify-authenticity` that fails
closed, and the asn1crypto library parses the eMRTD ASN.1 and CMS structures that passive
authentication depends on. The security significance is precise: this combination lets a
checkpoint confirm that a presented travel document is a genuine, unaltered, government-
issued chip, *and* that the live person presenting it is the person bound to that chip, by
matching the holder's liveness-protected face against the chip's stored portrait. That is
the core trust operation of automated border control, and the project implemented its
constituent parts.

The second connection is **identity-fraud and impersonation resistance** in the broader
sense that underpins both civil and national security. Document fraud, synthetic identities,
and presentation attacks (printed photos, replayed videos, masks, screen replays) are the
tools of everything from benefit fraud to infiltration. The platform's defence-in-depth
against exactly these attacks (the active Biometric Puzzle, the passive learned-plus-
classical anti-spoofing stack with its conservative spoof-wins verdict policy, and the
watchlist-check step type in the KYC pipeline) is the same machinery a state or a regulated
institution needs to keep forged and stolen identities out of trusted systems
[CITE:iso30107-3,minifasnet]. By raising the cost of impersonation, the platform contributes
to the integrity of the identity layer on which secure public services rest.

The third connection is **cyber-security of critical digital services**. The public services
named in the problem statement (e-government, banking, healthcare, transport) are critical
national infrastructure in everything but name, and the dominant route to compromising them
is credential-based account takeover. By providing a hardened, standards-compliant, multi-
factor identity layer with server-side decisioning, strict tenant isolation, rate limiting,
and audited sessions, FIVUCSAS strengthens precisely the attack surface that adversaries
target most [CITE:owasp-top10,verizon2024-dbir]. A national digital ecosystem in which
strong authentication is cheap and standard is a more resilient one.

We are equally clear about what does **not** apply and what is not claimed. FIVUCSAS is a
civilian, commercial platform; it is not an intelligence, weapons, or classified-systems
project, and no aspect of it touches military or signals-intelligence domains. Its border-
security relevance is the *building blocks* of automated document and identity checking, not
a deployed, accredited border-control installation. Formal certification (for both the
presentation-attack detection under ISO/IEC 30107-3 and the document-reading chain under
the ICAO regime) is explicitly future work, and we do not present the prototype as a
certified system. Nor do we claim any operational deployment by a security authority. The statement we can
stand behind is narrower and more concrete: the project produced, tested, and ran the
technical components that identity, border, and cyber security depend upon, to a standard
appropriate for an undergraduate engineering project. In doing so it demonstrated, in code,
how a cloud-native SaaS platform can serve national-security-relevant ends without
abandoning the privacy and transparency that a democratic society requires of any system
that asks to read its citizens' faces and documents [CITE:kvkk6698,gdpr,icao9303].
