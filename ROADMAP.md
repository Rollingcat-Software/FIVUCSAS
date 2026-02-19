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
- Database with 16 Flyway migrations, pgvector for embeddings
- CI/CD pipeline (GitHub Actions)
- Audit logging with async persistence

### Remaining
- Cloudflare Tunnel for biometric processor (laptop GPU)
- Mobile app E2E integration testing
- Production deployment of updated backend/frontend

---

## v1.1 Biometric Integration (March 2026)

- Fingerprint/voice endpoints in biometric processor
- Full NFC document reader hardware integration
- TOTP enrollment flow with QR code provisioning in dashboard
- SMS gateway integration (Twilio/Vonage)
- WebAuthn full CBOR attestation verification
- Biometric enrollment management in web dashboard

---

## v1.2 Production Hardening (April 2026)

- Playwright E2E test suite (full coverage)
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
- Advanced analytics dashboard (login trends, biometric success rates)
- Real-time notifications (WebSocket/SSE)
- Multi-language support (Turkish, English)
- Kiosk mode for desktop enrollment stations
- SDK for third-party integrations
- White-label tenant branding
