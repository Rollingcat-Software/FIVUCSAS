# Data Model & Compliance

## Schema at a glance

Identity is a Spring/JPA model on PostgreSQL 17, evolved through **82 Flyway migrations**
(V1→V82). Vector data (face embeddings, `voice_enrollments` 256-D) lives in pgvector and is
referenced by `user_id` logically (not a hard JPA FK), so it is intentionally outside the
relational ER lines.

Core tables: `users`, `tenants`, `identities` (person layer), `memberships`, `roles` /
`permissions`, `auth_methods`, `tenant_auth_methods`, `auth_flows`, `auth_flow_steps`,
`user_enrollments`, `nfc_cards`, `user_devices`, `webauthn_credentials`, `refresh_tokens`
(rotation families), `mfa_sessions`, `oauth2_clients`, and a **pg_partman-partitioned**
`audit_logs`.

The <a href="/diagrams.html" target="_blank" rel="noreferrer">Diagram Gallery</a> has the full ER set, now split for readability into
**identity/tenancy/RBAC**, **auth methods & flows**, **enrollments/devices/credentials**,
and **sessions/tokens/clients/audit**.

## KVKK / GDPR — data lifecycle

Consent-gated capture, scoped use, and full data-subject rights.

```mermaid
flowchart LR
    classDef st fill:#10243f,stroke:#2ba8b3,color:#dbeafe;
    classDef right fill:#0e2a1a,stroke:#3a9a73,color:#c9f0dd;
    classDef del fill:#3a1414,stroke:#b9534f,color:#f3d4d4;
    CONSENT["Per-tenant consent<br/>(Model A · granular)"]:::st --> ENROLL["Enroll FACE / VOICE"]:::st
    ENROLL --> STORE["Embeddings at rest<br/>(pgvector + Docker volume)"]:::st
    STORE --> USE["Use: 1:1 verify / 1:N search<br/>(tenant-scoped via @Filter)"]:::st
    USE --> R1["Export data (My Profile / GDPR)"]:::right
    USE --> R2["Revoke consent (stops further use)"]:::right
    USE --> R3["Request deletion"]:::right
    R2 --> PURGE["Purge biometric rows;<br/>users soft-deleted (deletedAt)"]:::del
    R3 --> PURGE
```

## Principles

- **Consent first** — per-tenant biometric consent (Model A) gates capture and use.
- **Siloed identity** — pairwise OIDC `sub` per tenant; `@Filter` tenant isolation.
- **Right to erasure** — never hard-delete `users` (FK-cascaded by ~13 tables incl. WebAuthn/
  NFC/devices/TOTP); `findByEmail` honours `deletedAt IS NULL`. Biometric rows are purged.
- **Auditability** — every security-relevant action lands in the partitioned `audit_logs`
  (`tenant_id NOT NULL`, anon sentinel for unauthenticated events).
