# Appendix A — Database Schema Migration Catalog

The Identity Core API database schema was built and evolved exclusively through versioned Flyway migrations [CITE:flyway], applied automatically and in order at service start-up. Every schema change in the project's lifetime is therefore captured as an auditable, replayable script. The complete catalogue of applied migrations is given below; the biometric processor maintains its own separate schema through Alembic.

[[TABLE: Flyway migration catalogue of the Identity Core API schema (V0–V83)]]

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

The biometric processor's vector store (face and voice embeddings, liveness logs) was migrated independently with Alembic across 5 revisions, keeping the compute-intensive biometric schema fully decoupled from the identity schema in line with the microservices boundary.
