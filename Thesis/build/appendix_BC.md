# Appendix B — REST API Surface Reference

This appendix summarizes the public REST surface of the platform as implemented. The Identity Core API exposes 29 `@RestController` classes; all routes are namespaced under `/api/v1/**` except the OpenID Connect discovery and JWKS documents, which live at the standard `/.well-known/**` paths. The Biometric Processor is an internal service (no public route; reachable only on the Docker network and protected by an API key) exposing 26 route modules and roughly 69 endpoints.

## B.1 Identity Core API — principal controllers

[[TABLE: Identity Core API controllers and representative endpoints]]

| Controller | Base path | Representative endpoints |
| --- | --- | --- |
| AuthController | `/api/v1/auth` | `POST /register`, `POST /login`, `POST /login/preflight`, `POST /login/begin`, `POST /refresh`, `POST /logout`, `GET /me`, N-step MFA `POST /mfa/step` |
| OAuth2Controller | `/api/v1/oauth2` | `GET /authorize`, `POST /authorize/complete`, `POST /token`, `GET /userinfo` |
| OAuth2ClientController | `/api/v1/oauth2/clients` | list/create/get, `DELETE /{id}`, `POST /{id}/rotate-secret`, `PATCH /{id}/status` |
| OpenIDConfigController | `/.well-known` | `GET /openid-configuration`, `GET /jwks.json` |
| DeviceController | `/api/v1/devices` | device CRUD + WebAuthn registration/assertion + discoverable passkey |
| NfcController | `/api/v1/nfc` | `POST /enroll`, `POST /verify`, `POST /verify-mrz`, `POST /verify-authenticity` (eMRTD passive auth) |
| BiometricController | `/api/v1/biometric` | face `enroll`/`verify`/`search`, voice `enroll`/`verify`/`search`, `puzzles/verify-challenge` |
| EnrollmentController | `/api/v1/enrollment` | `POST /submit`, `GET /status`, `POST /liveness/challenge`, `POST /liveness/verify` |
| QrController | `/api/v1` | `POST /qr/generate/{userId}`, cross-device `POST /auth/qr/session` + approve |
| ApproveLoginController | `/api/v1/auth/approve-login` | number-matching `POST /session`, `GET /pending`, `POST /session/{id}/decide` |
| OtpController | `/api/v1` | email OTP, SMS OTP, TOTP setup/verify/status |
| StepUpController | `/api/v1/step-up` | `POST /register-device`, `POST /challenge`, `POST /verify-challenge` (ECDSA) |
| VerificationController | `/api/v1/verification` | session lifecycle, `GET /templates`, `GET /flows`, `GET /stats` |
| IdentityLinkController | `/api/v1/identity` | `POST /link/initiate`, `POST /link/confirm`, `POST /unlink` |
| Tenant / RBAC / admin | `/api/v1/**` | `TenantController`, `RoleController`, `UserController` (incl. guest invitations), `AuditLogController`, `UserDataExportController` (KVKK/GDPR export), `AuthFlowController`, `PurgeAdminController` |

A single `GlobalExceptionHandler` (`@RestControllerAdvice`) renders consistent JSON error envelopes across every controller.

## B.2 Biometric Processor — route categories

[[TABLE: Biometric Processor route categories]]

| Category | Purpose |
| --- | --- |
| Health | readiness, liveness, model-status probes |
| Enrollment | face/voice enrollment, multi-image enrollment, deletion |
| Verification | 1:1 verify, verify-with-liveness |
| Search | 1:N identification, batch search |
| Liveness | Biometric Puzzle challenge generation and validation |
| Quality | sample quality assessment and metrics |
| Detection | face detection, landmarks, attributes |
| Embedding | embedding generation and comparison |
| Analytics / Admin | usage statistics, model and cache management |

# Appendix C — Production Deployment and Configuration Reference

This appendix records the production deployment topology of the platform as operated during the project.

## C.1 Host and runtime

The platform ran on a single Hetzner CX43 virtual server (8 vCPU, 16 GB RAM, 150 GB disk, Ubuntu 24.04) under Docker Compose [CITE:dockercompose], with a Traefik v3 reverse proxy [CITE:traefik] terminating TLS and routing to the services. Static client surfaces (the React dashboard build, landing site, and demo) were additionally served from Hostinger shared hosting; the Docker host carried the stateful and compute services.

## C.2 Containerized services

[[TABLE: Production service inventory]]

| Service | Technology | Network exposure |
| --- | --- | --- |
| identity-core-api | Spring Boot 3.4.7 / Java 21 (port 8080) | public via Traefik (`api.fivucsas.com`) |
| biometric-processor | FastAPI / Python 3.12 (port 8001) | internal Docker network only, API-key protected |
| postgres | PostgreSQL 17 + pgvector | internal |
| redis | Redis 7.4 | internal |
| traefik | Traefik v3 edge proxy | public (443/80) |

## C.3 Public endpoints

[[TABLE: Production subdomains]]

| Subdomain | Purpose |
| --- | --- |
| `api.fivucsas.com` | Identity Core REST + OAuth2/OIDC API origin |
| `app.fivucsas.com` | React administration dashboard |
| `verify.fivucsas.com` | Hosted login page + embeddable auth widget |
| `fivucsas.com` | Landing site |
| `demo.fivucsas.com` | Hosted demonstration |
| `amispoof.fivucsas.com` | Browser-based anti-spoofing tester |
| `docs.fivucsas.com` | Developer documentation |
| `status.fivucsas.com` | Uptime monitor |

## C.4 Configuration discipline

All environment-specific parameters (database and Redis credentials, the JWT signing key and access/refresh token lifetimes, the default face model and verification thresholds, and the biometric service API key) were externalized as environment variables and supplied at deployment through an `.env.prod` file, keeping secrets out of source control and allowing the same images to run unchanged across environments.
