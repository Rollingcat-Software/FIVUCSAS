# Multi-Tenancy & Flows

One platform, **infinite verification flows**. Each tenant assembles its own login/
verification flow from the methods it enables — which steps, in what order, with which
thresholds — persisted as `auth_flows` + ordered `auth_flow_steps` and assembled at runtime
via `GET /auth/login-config`. **No code change, no redeploy.**

```mermaid
flowchart TB
    classDef cfg fill:#10243f,stroke:#2ba8b3,color:#dbeafe;
    classDef ex fill:#1a1530,stroke:#8a7bd8,color:#e6e0ff;
    ADMIN(["Tenant Admin"]) --> BUILDER["Flow builder<br/>(dashboard / API)"]:::cfg
    BUILDER --> METHODS["Enable tenant auth methods<br/>(any subset of the 10)"]:::cfg
    BUILDER --> FLOW["auth_flows + auth_flow_steps<br/>ordered · per-step method · threshold"]:::cfg
    METHODS --> FLOW
    FLOW --> ENGINE{{"Runtime engine<br/>GET /auth/login-config → assemble"}}:::cfg
    ENGINE --> EX1["BANK · KYC<br/>NFC → Face → OTP"]:::ex
    ENGINE --> EX2["EDUCATION<br/>Liveness → Face"]:::ex
    ENGINE --> EX3["ACCESS<br/>Face → Hardware Key"]:::ex
```

## Tenant isolation

Isolation is enforced by a Hibernate `@Filter(tenantFilter)` applied to the tenant-scoped
entities (User, AuthFlow, AuditLog, MfaSession, UserEnrollment, OAuth2Client, UserDevice,
Role, VerificationSession, AuthSession). Postgres RLS DDL exists (`V25`) but is **inert** —
the app never sets `app.current_tenant_id`, so `@Filter` is the live mechanism.

> User-centric `/my/*` endpoints that legitimately cross a foreign-tenant scope use an
> explicit `TenantFilterBypass`.

## Identity, person & membership

A platform-level **person** (`identities`) can have memberships across tenants. OIDC
subjects are **pairwise** — the same person presents a different `sub` to each tenant, so
identities stay siloed. Per-tenant **biometric consent** (Model A) gates capture and use.

## Templates

Five industry flows ship seeded as starting points: **Fintech KYC**, **Healthcare Basic**,
**Education Age**, **Telecom Onboarding**, **Simple Document**.

See [Multi-tenancy & flows in the gallery](/diagrams.html) and the
[Data Model](./data-compliance) for the tenancy/RBAC ER diagrams.
