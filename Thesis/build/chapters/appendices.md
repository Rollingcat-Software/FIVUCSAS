# Appendix A: Database Schema Migration Catalog

The Identity Core API database schema was built and evolved exclusively through versioned Flyway migrations [CITE:flyway], applied automatically and in order at service startup. Every schema change over the project's lifetime is therefore captured as an auditable, replayable script. The complete catalog of applied migrations follows; the biometric processor maintains its own separate schema through Alembic.

[[TABLE: Flyway migration catalog of the Identity Core API schema (V0–V86)]]

| Version | Migration |
| --- | --- |
| V0 | Create extensions |
| V1 | Create tenants table |
| V2 | Create users table |
| V3 | Create roles and permissions |
| V4 | Create biometric tables |
| V5 | Create audit and session tables |
| V6 | Create refresh tokens table |
| V7 | Add performance indexes |
| V8 | Add audit log enhancements |
| V9 | Add rate limiting table |
| V10 | Rbac user types and guest lifecycle |
| V11 | Create user settings table |
| V12 | Fix user entity alignment |
| V14 | Fix user settings schema |
| V15 | Seed realistic sample data |
| V16 | Auth flow system |
| V17 | Device stepup public key |
| V18 | Webauthn credentials |
| V19 | Create api keys table |
| V20 | Align tenants with entity |
| V21 | Cleanup and indexes |
| V22 | Nfc card enrollment |
| V23 | Add two factor columns |
| V24 | Oauth2 clients |
| V25 | Add row level security |
| V26 | Verification pipeline |
| V27 | Seed verification flows |
| V28 | Video interview step |
| V29 | Add email otp to default login flow |
| V30 | Adaptive mfa engine |
| V31 | Fix display order zero indexed |
| V32 | Professionalize entity state |
| V33 | Create voice enrollments table |
| V34 | Oauth2 clients confidential |
| V35 | Mfa sessions consumed at |
| V36 | Mfa sessions client id |
| V37 | Oauth2 clients tenant id index |
| V38 | Oauth2 web dashboard public |
| V39 | Encrypt totp secrets |
| V40 | Partition audit logs |
| V41 | Audit logs partition maintenance |
| V42 | Totp secret check encrypted |
| V43 | Noop reserved v43 ships as V48 |
| V44 | Tenant email domains |
| V45 | Tenant admin permissions baseline |
| V46 | Backfill audit log tenant id |
| V47 | Add enrollment scores |
| V48 | Drop biometric data |
| V49 | Tenants deleted at |
| V50 | Refresh tokens family id |
| V51 | Shedlock |
| V52 | Shedlock timestamps tz |
| V53 | Forbid user tenant hard delete |
| V54 | Users phone number e164 |
| V55 | Refresh token hash |
| V56 | Noop reserved for refresh token plaintext drop |
| V57 | Audit logs pg partman |
| V58 | Oauth2 clients secret rotation |
| V59 | Backfill audit logs tenant id |
| V60 | Drop refresh tokens token plaintext |
| V61 | Audit logs tenant id not null |
| V62 | Tenants enforce domain matching |
| V63 | Tenant email domains verified |
| V64 | Domain verification token and default member role |
| V65 | Create identities |
| V66 | Create identity emails |
| V67 | Add users identity id |
| V68 | Create identity tenant biometric consent |
| V69 | Rename super admin role to root |
| V70 | Users identity id not null |
| V71 | Root role all permissions |
| V72 | Webauthn discoverable passkeys |
| V73 | Auth methods usernameless passkey approve login |
| V74 | Approve login not usernameless |
| V75 | Activate voice auth method |
| V76 | Scope tenant admin permissions |
| V77 | Cascade session fks on authflow |
| V78 | Partial unique tenant email soft delete |
| V79 | Canonicalize existing nfc card serials |
| V80 | Oauth2 mobile client |
| V81 | Enforce all methods consent singleton |
| V82 | Oauth2 clients cross tenant |
| V83 | Widen chk enrollment method approve login passkey |
| V84 | User settings tenant id |
| V85 | Refresh tokens client id |
| V86 | Seed puzzle auth method |

The biometric processor's vector store (face and voice embeddings, liveness logs) was migrated independently with Alembic across 5 revisions, keeping the compute-intensive biometric schema fully decoupled from the identity schema, in line with the microservices boundary.

# Appendix B: REST API Surface Reference

This appendix summarizes the public REST surface of the platform as implemented. The Identity Core API exposes 29 `@RestController` classes; all routes are namespaced under `/api/v1/**` except the OpenID Connect discovery and JWKS documents, which live at the standard `/.well-known/**` paths. The Biometric Processor is an internal service (no public route; reachable only on the Docker network and protected by an API key) exposing 26 route modules and 84 endpoints.

## B.1 Identity Core API: Principal Controllers

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

## B.2 Biometric Processor: Route Categories

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

# Appendix C: Production Deployment and Configuration Reference

This appendix records the production deployment topology of the platform as operated during the project.

## C.1 Host and Runtime

The platform ran on a single Hetzner CX43 virtual server (8 vCPU, 16 GB RAM, 150 GB disk, Ubuntu 24.04) under Docker Compose [CITE:dockercompose], with a Traefik v3 reverse proxy [CITE:traefik] terminating TLS and routing to the services. Static client surfaces (the React dashboard build, landing site, and demo) were additionally served from Hostinger shared hosting; the Docker host carried the stateful and compute services.

## C.2 Containerized Services

[[TABLE: Production service inventory]]

| Service | Technology | Network exposure |
| --- | --- | --- |
| identity-core-api | Spring Boot 3.4.7 / Java 21 (port 8080) | public via Traefik (`api.fivucsas.com`) |
| biometric-processor | FastAPI / Python 3.12 (port 8001) | internal Docker network only, API-key protected |
| postgres | PostgreSQL 17 + pgvector | internal |
| redis | Redis 7.4 | internal |
| traefik | Traefik v3 edge proxy | public (443/80) |

## C.3 Public Endpoints

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

## C.4 Configuration Discipline

All environment-specific parameters (database and Redis credentials, the JWT signing key and access/refresh token lifetimes, the default face model and verification thresholds, and the biometric service API key) were externalized as environment variables and supplied at deployment through an `.env.prod` file, keeping secrets out of source control and allowing the same images to run unchanged across environments.
