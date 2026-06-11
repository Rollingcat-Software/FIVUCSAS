# Security & Threat Model

How each common identity attack is countered. Phishing-resistant factors, hybrid liveness
(passive PAD + the active Biometric Puzzle), single-use / rotating secrets, and fail-closed
document authentication are the load-bearing controls.

```mermaid
flowchart LR
    classDef atk fill:#3a1414,stroke:#b9534f,color:#f3d4d4;
    classDef ctl fill:#0e2a1a,stroke:#3a9a73,color:#c9f0dd;
    subgraph A["Attacks"]
        direction TB
        T1["Phishing / credential stuffing"]:::atk
        T2["SIM-swap"]:::atk
        T3["Password-DB leak"]:::atk
        T4["OTP / token replay"]:::atk
        T5["Brute force"]:::atk
        T6["Printed photo / screen replay"]:::atk
        T7["Deepfake / video injection"]:::atk
        T8["Mask / 3D presentation"]:::atk
        T9["Forged ID document"]:::atk
        T10["Cross-tenant data access"]:::atk
        T11["Stolen refresh token (XSS)"]:::atk
    end
    subgraph C["Controls in FIVUCSAS"]
        direction TB
        M1["Passkey / WebAuthn + composable MFA"]:::ctl
        M2["Multi-factor: SMS never the sole factor"]:::ctl
        M3["BCrypt cost 12 + MFA required"]:::ctl
        M4["OTP single-use · TOTP replay marker ·<br/>refresh rotation + reuse→family-revoke · 10min auth-code"]:::ctl
        M5["Account lockout 5 / 15min (423) + rate-limit"]:::ctl
        M6["Passive PAD + screen-replay / Moiré / temporal"]:::ctl
        M7["Active Biometric Puzzle (nonce, random, timestamped)"]:::ctl
        M8["Texture / depth cues + challenge-response"]:::ctl
        M9["ICAO 9303 passive auth, fail-closed"]:::ctl
        M10["Hibernate @Filter + pairwise OIDC sub"]:::ctl
        M11["Short-lived RS256 JWT + rotating refresh + family revoke"]:::ctl
    end
    T1-->M1
    T2-->M2
    T3-->M3
    T4-->M4
    T5-->M5
    T6-->M6
    T6-->M7
    T7-->M7
    T8-->M8
    T8-->M7
    T9-->M9
    T10-->M10
    T11-->M11
```

## Trust boundary

One public edge, exactly one public app, an internal-only ML service, a private data zone.

```mermaid
flowchart TB
    classDef edge fill:#10243f,stroke:#2ba8b3,color:#dbeafe;
    classDef pub fill:#1a2f1a,stroke:#5aa45a,color:#dfeede;
    classDef int fill:#2a2410,stroke:#b9963f,color:#fde9c2;
    classDef data fill:#1a1530,stroke:#8a7bd8,color:#e6e0ff;
    CL["Internet: browser · mobile · OIDC client"] -->|HTTPS| TR["Traefik v3.6<br/>TLS · rate-limit · admin-IP allowlist"]:::edge
    TR -->|"only :8080"| API["Identity Core API :8080<br/>(only public service)"]:::pub
    API -->|"X-API-Key"| BIO["Biometric Processor :8001<br/>INTERNAL ONLY"]:::int
    API --> PG["PostgreSQL + pgvector"]:::data
    API --> RD["Redis 7.4"]:::data
    BIO --> PG
    BIO --> FS["biometric_uploads volume"]:::data
```

## Transport & API posture

`api.fivucsas.com/` returns `401` by design (it is an API origin, not a page);
Swagger / `/v3/api-docs` / `/actuator` are admin-IP gated (`403` for the public); OIDC
discovery is public (`200`). Tokens are RS256 with a pinned audience.

See the full <a href="/diagrams.html" target="_blank" rel="noreferrer">threat model and trust-boundary diagrams</a> in the gallery.
