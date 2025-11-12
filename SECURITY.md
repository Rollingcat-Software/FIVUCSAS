# Security Architecture

Comprehensive security implementation for the FIVUCSAS biometric platform.

## Table of Contents

- [Overview](#overview)
- [Threat Model](#threat-model)
- [Security Controls](#security-controls)
- [Data Protection](#data-protection)
- [Authentication & Authorization](#authentication--authorization)
- [API Security](#api-security)
- [Audit Logging](#audit-logging)
- [Compliance](#compliance)
- [Incident Response](#incident-response)

---

## Overview

The FIVUCSAS platform processes **highly sensitive biometric data** (facial embeddings, images) and **personally identifiable information** (PII). Security is paramount to protect user privacy and maintain regulatory compliance.

### Security Principles

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum permissions necessary
3. **Zero Trust** - Verify everything, trust nothing
4. **Data Minimization** - Collect and retain only necessary data
5. **Encryption Everywhere** - Data encrypted in transit and at rest
6. **Audit Everything** - Comprehensive logging of all access

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Threats |
|-------|-------------|---------|
| **Biometric Embeddings** | Critical | Data breach, unauthorized access, tampering |
| **Face Images** | High | Unauthorized access, data breach, privacy violation |
| **User Credentials** | High | Credential theft, brute force, session hijacking |
| **API Keys** | High | Unauthorized service access, data exfiltration |
| **Database Credentials** | Critical | Complete system compromise |
| **Audit Logs** | High | Log tampering, evidence destruction |

### Threat Actors

1. **External Attackers** - Attempting to breach systems for data theft
2. **Malicious Insiders** - Employees/contractors with authorized access
3. **Nation States** - Advanced persistent threats (APTs)
4. **Competitors** - Corporate espionage
5. **Script Kiddies** - Opportunistic attackers

### Attack Vectors

- 🌐 **API Attacks**: Injection, broken authentication, excessive data exposure
- 🔑 **Credential Attacks**: Brute force, credential stuffing, phishing
- 💉 **Injection Attacks**: SQL injection, NoSQL injection, command injection
- 🚪 **Access Control**: IDOR (Insecure Direct Object Reference), privilege escalation
- 🔓 **Cryptographic Failures**: Weak encryption, exposed secrets
- ⚙️ **Misconfiguration**: Default credentials, exposed endpoints, verbose errors

---

## Security Controls

### 1. Secrets Management

**Problem**: Credentials stored in environment variables or configuration files

**Solution**: HashiCorp Vault integration

```python
# Before (INSECURE)
DB_PASSWORD = os.getenv("DB_PASSWORD")  # Exposed in environment

# After (SECURE)
vault_client = VaultClient()
DB_PASSWORD = vault_client.get_secret("database/biometric/password")
```

**Implementation**:
- Vault server with AppRole authentication
- Dynamic database credentials (rotated every 24 hours)
- Encrypted secrets at rest (AES-256-GCM)
- Audit logging of all secret access

**Files**:
- `biometric-processor/app/security/vault_client.py`
- `identity-core-api/src/main/java/com/fivucsas/identity/security/VaultConfig.java`

### 2. Encryption at Rest

**Problem**: Biometric embeddings stored in plaintext in PostgreSQL

**Solution**: Application-level encryption with key rotation

```python
# Encrypt before storing
encrypted_embedding = encrypt_embedding(
    embedding=embedding,
    encryption_key=get_encryption_key(tenant_id),
    algorithm="AES-256-GCM"
)

# Decrypt when retrieving
embedding = decrypt_embedding(
    encrypted_embedding=encrypted_embedding,
    encryption_key=get_encryption_key(tenant_id),
    algorithm="AES-256-GCM"
)
```

**Key Management**:
- Master key stored in Vault
- Per-tenant data encryption keys (DEKs)
- Key rotation every 90 days
- Envelope encryption (KEK wraps DEK)

**Files**:
- `biometric-processor/app/security/encryption.py`
- `biometric-processor/app/repositories/embedding_repository.py` (updated)

### 3. API Rate Limiting

**Problem**: No protection against brute force or DoS attacks

**Solution**: Multi-tier rate limiting

**Limits**:
```yaml
# Per IP address
global:
  requests_per_minute: 60
  requests_per_hour: 1000

# Per tenant
tenant:
  enrollments_per_hour: 100
  verifications_per_minute: 20

# Per user
user:
  login_attempts_per_hour: 5  # Prevents brute force
  password_reset_per_day: 3
```

**Implementation**:
- Redis-based sliding window rate limiter
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- HTTP 429 (Too Many Requests) with Retry-After header

**Files**:
- `biometric-processor/app/middleware/rate_limiter.py`
- `identity-core-api/src/main/java/com/fivucsas/identity/security/RateLimitFilter.java`

### 4. Audit Logging

**Problem**: Insufficient tracking of biometric data access

**Solution**: Comprehensive audit trail

**Logged Events**:
```json
{
  "event_id": "evt_abc123",
  "timestamp": "2025-01-12T10:30:00Z",
  "event_type": "biometric.embedding.accessed",
  "actor": {
    "user_id": 12345,
    "tenant_id": 1,
    "ip_address": "203.0.113.42",
    "user_agent": "Mozilla/5.0..."
  },
  "resource": {
    "type": "face_embedding",
    "id": 67890,
    "user_id": 54321
  },
  "action": "read",
  "result": "success",
  "metadata": {
    "purpose": "verification",
    "correlation_id": "req_xyz789"
  }
}
```

**Audit Events**:
- ✅ Biometric enrollment
- ✅ Biometric verification
- ✅ Embedding access (read)
- ✅ Embedding deletion
- ✅ User login/logout
- ✅ Password changes
- ✅ Permission changes
- ✅ API key creation/revocation
- ✅ Failed authentication attempts

**Storage**:
- PostgreSQL table: `audit_logs` (indexed, immutable)
- Retention: 7 years (regulatory compliance)
- Tamper-proof: Hash chain integrity

**Files**:
- `identity-core-api/src/main/java/com/fivucsas/identity/audit/AuditLogger.java`
- `identity-core-api/src/main/resources/db/migration/V6__Create_audit_logs.sql`

### 5. JWT Refresh Tokens

**Problem**: Long-lived access tokens increase security risk

**Solution**: Short-lived access tokens + refresh tokens

**Token Lifetimes**:
- **Access Token**: 15 minutes (short-lived)
- **Refresh Token**: 7 days (longer-lived, stored securely)

**Flow**:
```
1. User logs in → receives access token (15min) + refresh token (7d)
2. Client uses access token for API calls
3. Access token expires → client calls /auth/refresh with refresh token
4. Server validates refresh token → issues new access token
5. Repeat until refresh token expires or is revoked
```

**Security Features**:
- Refresh tokens stored hashed in database
- Single-use refresh tokens (rotated on each use)
- Device fingerprinting to detect token theft
- Automatic revocation on suspicious activity

**Files**:
- `identity-core-api/src/main/java/com/fivucsas/identity/security/RefreshTokenService.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java` (updated)

### 6. Input Validation

**Problem**: Insufficient validation allows injection attacks

**Solution**: Multi-layer validation

**Validation Layers**:
1. **Schema Validation** (Pydantic, Bean Validation)
2. **Business Logic Validation**
3. **Database Constraints**

**Example**:
```python
# Layer 1: Schema validation
class EnrollmentRequest(BaseModel):
    user_id: int = Field(gt=0, description="User ID must be positive")
    tenant_id: int = Field(gt=0, description="Tenant ID must be positive")
    face_image_url: HttpUrl = Field(..., description="Valid HTTPS URL")

    @validator('face_image_url')
    def validate_image_url(cls, v):
        # Only allow specific domains
        allowed_domains = ['s3.amazonaws.com', 'storage.googleapis.com']
        if not any(domain in str(v) for domain in allowed_domains):
            raise ValueError("Image URL must be from approved storage")
        return v

# Layer 2: Business logic validation
if not tenant_service.has_permission(tenant_id, 'biometric.enroll'):
    raise PermissionDenied("Tenant lacks enrollment permission")

# Layer 3: Database constraints
# ALTER TABLE face_embeddings ADD CONSTRAINT check_dimension CHECK (dimension = 2622);
```

**Protected Against**:
- SQL injection (parameterized queries)
- NoSQL injection (input sanitization)
- Command injection (no shell execution)
- Path traversal (whitelist validation)
- XXE (XML external entity) - JSON only
- SSRF (Server-Side Request Forgery) - URL whitelist

**Files**:
- `biometric-processor/app/validators/` (new directory)
- `identity-core-api/src/main/java/com/fivucsas/identity/validation/` (new directory)

### 7. Database Connection Encryption

**Problem**: Database credentials and data transmitted in plaintext

**Solution**: SSL/TLS for all database connections

**Configuration**:
```python
# PostgreSQL connection with SSL
DATABASE_URL = (
    f"postgresql://{user}:{password}@{host}:{port}/{database}"
    f"?sslmode=require"
    f"&sslcert=/etc/ssl/certs/client-cert.pem"
    f"&sslkey=/etc/ssl/private/client-key.pem"
    f"&sslrootcert=/etc/ssl/certs/ca-cert.pem"
)
```

**Requirements**:
- PostgreSQL: SSL/TLS 1.3
- Redis: TLS enabled (`redis://` → `rediss://`)
- Certificate validation (not self-signed in production)
- Minimum TLS 1.2, prefer TLS 1.3

**Files**:
- `biometric-processor/app/core/database.py` (updated)
- `identity-core-api/src/main/resources/application.yml` (updated)

### 8. RBAC (Role-Based Access Control)

**Current Roles**:
- `SUPER_ADMIN` - Full system access
- `TENANT_ADMIN` - Tenant management
- `USER` - Basic user access

**Enhanced Permissions**:
```yaml
# Fine-grained permissions
biometric.enroll.create    # Create enrollment
biometric.enroll.read      # View enrollment status
biometric.enroll.delete    # Delete enrollment

biometric.verify.execute   # Perform verification
biometric.verify.read      # View verification history

user.create                # Create users
user.read                  # View user info
user.update                # Update user info
user.delete                # Delete users

audit.read                 # View audit logs (sensitive!)
```

**Permission Checks**:
```python
@require_permission('biometric.enroll.create')
def create_enrollment(request: EnrollmentRequest):
    # Only users with this permission can enroll
    ...
```

**Files**:
- `identity-core-api/src/main/java/com/fivucsas/identity/security/PermissionEvaluator.java`
- `identity-core-api/src/main/resources/db/migration/V7__Enhance_rbac.sql`

---

## Data Protection

### Data Classification

| Classification | Examples | Controls |
|----------------|----------|----------|
| **Critical** | Biometric embeddings, passwords | Encrypted at rest, encrypted in transit, access logging |
| **High** | Face images, email addresses | Encrypted in transit, access logging |
| **Medium** | User preferences, enrollment status | Encrypted in transit |
| **Low** | Public profile data | Basic access controls |

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Face Images | Deleted after enrollment | Secure deletion (overwrite) |
| Biometric Embeddings | Until user deletion + 30 days | Crypto shredding (destroy keys) |
| Audit Logs | 7 years | Archive to cold storage |
| Session Tokens | 7 days after logout | Database truncation |

### GDPR Compliance

**Right to Erasure** (Article 17):
```python
@router.delete("/users/{user_id}/biometric-data")
async def delete_biometric_data(user_id: int):
    # 1. Delete face embeddings
    embedding_repo.delete_all_by_user(user_id)

    # 2. Delete face images from S3
    s3_client.delete_objects(prefix=f"users/{user_id}/")

    # 3. Anonymize audit logs (keep for legal but remove PII)
    audit_logger.anonymize_user_logs(user_id)

    # 4. Log the deletion (for compliance)
    audit_logger.log("biometric.data.deleted", user_id=user_id)
```

**Data Portability** (Article 20):
```python
@router.get("/users/{user_id}/biometric-data/export")
async def export_biometric_data(user_id: int):
    # Export in JSON format (NOT the raw embedding, just metadata)
    return {
        "enrollments": [...],
        "verifications": [...],
        "audit_trail": [...]
    }
```

---

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

**Implementation Plan**:
- TOTP (Time-based One-Time Password) via authenticator apps
- SMS backup codes (less secure, optional)
- Recovery codes (10 single-use codes)

**Flow**:
1. User logs in with username/password
2. System challenges for TOTP code
3. User enters 6-digit code from authenticator app
4. System validates code (30-second window)
5. Access granted

**Files**:
- `identity-core-api/src/main/java/com/fivucsas/identity/security/MfaService.java`

### Password Policy

**Requirements**:
- Minimum 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- Not in common password list (10k most common)
- Not similar to username/email
- Password history: Cannot reuse last 5 passwords

**Hashing**:
- Algorithm: **Argon2id** (memory-hard, GPU-resistant)
- Parameters: `m=65536, t=3, p=4` (adjust based on server capacity)
- Salt: 128-bit random salt (unique per password)

### Session Management

**Security Features**:
- Secure cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- Session timeout: 30 minutes of inactivity
- Absolute timeout: 8 hours (force re-login)
- Concurrent session limit: 3 devices per user
- Session invalidation on password change

---

## API Security

### API Authentication

**Methods**:
1. **JWT Bearer Token** (for user authentication)
2. **API Keys** (for service-to-service)
3. **mTLS** (for critical services)

### API Key Management

```python
# Generate API key
api_key = generate_api_key(
    tenant_id=1,
    permissions=['biometric.enroll', 'biometric.verify'],
    expires_in=days(90)
)
# Returns: "fiv_live_abc123...xyz789"
```

**Format**: `fiv_{environment}_{random_32_chars}`
- Prefix identifies FIVUCSAS API keys
- Environment: `test` or `live`
- Random portion: Cryptographically secure

**Storage**: Hashed with SHA-256 (only hash stored in database)

### CORS (Cross-Origin Resource Sharing)

**Configuration**:
```yaml
cors:
  allowed_origins:
    - https://app.fivucsas.com
    - https://dashboard.fivucsas.com
  allowed_methods: [GET, POST, PUT, DELETE]
  allowed_headers: [Authorization, Content-Type]
  max_age: 3600  # 1 hour
  credentials: true
```

**Security**:
- No wildcard origins (`*`) in production
- Explicit origin whitelist
- Credentials flag only with specific origins

---

## Audit Logging

### Log Format

**Structured JSON logging**:
```json
{
  "timestamp": "2025-01-12T10:30:00.123Z",
  "level": "INFO",
  "service": "biometric-processor",
  "event_type": "biometric.enrollment.completed",
  "correlation_id": "req_xyz789",
  "user_id": 12345,
  "tenant_id": 1,
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "resource": {
    "type": "face_embedding",
    "id": 67890
  },
  "action": "create",
  "result": "success",
  "duration_ms": 2345
}
```

### Log Aggregation

**Stack**: ELK (Elasticsearch, Logstash, Kibana) or equivalent

**Retention**:
- Hot storage: 30 days (fast search)
- Warm storage: 6 months (slower search)
- Cold storage: 7 years (archive, compliance)

### Security Alerts

**Automated alerts for**:
- Failed login threshold exceeded (5 in 10 minutes)
- Unauthorized access attempts
- Mass data access (>100 embeddings in 1 minute)
- Permission changes
- API key compromise indicators
- Unusual geographic access patterns

---

## Compliance

### Regulations

| Regulation | Applicability | Requirements |
|------------|---------------|--------------|
| **GDPR** | EU users | Consent, right to erasure, data portability, breach notification (72h) |
| **CCPA** | California users | Right to know, right to delete, opt-out of sale |
| **BIPA** | Illinois users | Written consent for biometric data, retention policy, breach notification |
| **ISO 27001** | Global | Information security management system (ISMS) |
| **SOC 2 Type II** | B2B customers | Security, availability, confidentiality, processing integrity, privacy |

### Data Processing Agreement (DPA)

Required elements:
- Subject matter and duration of processing
- Nature and purpose of processing
- Type of personal data
- Categories of data subjects
- Processor obligations (security, confidentiality, breach notification)
- Sub-processor approval process

### Breach Notification

**Process**:
1. **Detection** (within 24 hours)
2. **Assessment** (severity, scope, affected users)
3. **Containment** (stop the breach)
4. **Notification**:
   - Regulatory authorities (72 hours under GDPR)
   - Affected users (without undue delay)
   - Include: nature of breach, affected data, consequences, mitigation
5. **Remediation** (fix vulnerabilities)
6. **Post-mortem** (lessons learned)

---

## Incident Response

### Incident Response Plan

**Phases**:
1. **Preparation** - Tools, training, playbooks
2. **Detection** - Monitoring, alerting
3. **Analysis** - Determine scope and severity
4. **Containment** - Stop the incident from spreading
5. **Eradication** - Remove threat from environment
6. **Recovery** - Restore systems to normal operation
7. **Post-Incident** - Review and improve

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0 (Critical)** | Data breach, system compromise | Immediate (15 min) | CEO, CTO, Legal |
| **P1 (High)** | Service outage, potential breach | 1 hour | CTO, VP Engineering |
| **P2 (Medium)** | Degraded service, security vulnerability | 4 hours | Engineering Manager |
| **P3 (Low)** | Minor issue, no security impact | 24 hours | On-call Engineer |

### Security Contacts

```
Security Team: security@fivucsas.com
Vulnerability Disclosure: security@fivucsas.com (PGP key available)
Incident Hotline: +1-555-SECURITY (24/7)
```

---

## Security Best Practices

### Development

- ✅ Code reviews required (minimum 2 approvers)
- ✅ Static analysis (SonarQube, Semgrep)
- ✅ Dependency scanning (Snyk, Dependabot)
- ✅ Secret scanning (GitGuardian, TruffleHog)
- ✅ Container scanning (Trivy, Clair)

### Deployment

- ✅ Immutable infrastructure
- ✅ Secrets via Vault (never in code or env files)
- ✅ TLS everywhere (no HTTP in production)
- ✅ Network segmentation (VPC, security groups)
- ✅ Principle of least privilege (IAM roles)

### Operations

- ✅ Security patching (critical patches within 24 hours)
- ✅ Access reviews (quarterly)
- ✅ Penetration testing (annually)
- ✅ Disaster recovery drills (quarterly)
- ✅ Backup testing (monthly)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)
- [GDPR](https://gdpr.eu/)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html)
