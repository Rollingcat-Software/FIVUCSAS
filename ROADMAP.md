# FIVUCSAS - Product Roadmap

## v1.0 MVP (Current - February 2026)

### Completed
- Multi-tenant identity management (users, tenants, roles, permissions)
- 10 authentication methods (Password, Email OTP, SMS OTP, TOTP, QR Code, Face, Fingerprint, Voice, Hardware Key, NFC Document)
- Multi-step authentication flows with configurable step sequences
- Device constraint enforcement (PASSWORD mandatory for APP_LOGIN/API_ACCESS)
- Biometric processor with 46+ endpoints (Face recognition, liveness detection)
- Web admin dashboard (React + TypeScript + MUI)
- Landing website
- Database with 17 Flyway migrations (V1-V17), pgvector for embeddings
- CI/CD pipeline (GitHub Actions)
- Audit logging with async persistence
- Fingerprint step-up authentication (ECDSA P-256, 3 endpoints, deployed)
- i18n (Turkish/English) with i18next
- Analytics dashboard with recharts
- TOTP enrollment dialog in Settings page
- Real-time notification panel
- Twilio SMS gateway (ready for activation)
- Playwright E2E tests (224 tests)
- TestContainers integration tests (24 tests)
- 528+ unit tests across all services
- Spring 2026 presentation slides and speaker notes

### Remaining
- Cloudflare Tunnel for biometric processor (laptop GPU)
- Mobile app E2E integration testing (need Android SDK)
- Coordinate with Aysenur for step-up endpoint integration

---

## v1.1 Biometric Integration (March 2026)

- Full NFC document reader hardware integration
- WebAuthn full CBOR attestation verification
- Biometric enrollment management in web dashboard
- Desktop app kiosk mode finalization

---

## v1.2 Production Hardening (April 2026)

- Load testing with k6/Artillery
- Rate limiting tuning per endpoint
- Redis cluster for HA
- PostgreSQL replication
- NGINX rate limiting and WAF rules
- Security audit and penetration testing

---

## v2.0 Enterprise (May 2026+)

- Multi-region deployment
- SSO (SAML 2.0 / OpenID Connect) integration
- Kiosk mode for desktop enrollment stations
- SDK for third-party integrations
- White-label tenant branding
