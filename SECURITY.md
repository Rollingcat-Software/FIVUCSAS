# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@rollingcatsoftware.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Update Policy

- Critical vulnerabilities: Patch within 48 hours
- High severity: Patch within 1 week
- Medium severity: Patch in next release
- Low severity: Tracked in backlog

## Security Considerations

### Authentication
- JWT tokens with HS256 signing and automatic rotation
- BCrypt password hashing (12 rounds)
- Multi-factor authentication (10 methods supported)
- Rate limiting on all authentication endpoints

### Biometric Data
- Face embeddings stored as vectors (not raw images)
- Voice embeddings stored as 256-dimensional vectors
- All biometric data encrypted at rest
- Tenant-level data isolation with row-level security

### Data Protection
- HTTPS enforced for all API communication
- CORS configured with explicit origin allowlists
- CSP headers configured for web application
- Input validation on all API endpoints

### Infrastructure
- Docker containers run as non-root users
- Database connections use connection pooling with TLS
- Redis authentication required
- Monitoring endpoints bound to localhost only

## Dependency Management

- Dependencies are pinned to specific versions
- Dependabot configured for automated security updates
- `pip-audit` and `npm audit` run in CI pipeline
