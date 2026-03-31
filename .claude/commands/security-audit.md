Review this project for security vulnerabilities following OWASP Top 10 2025.

Check for:
- Hardcoded secrets, API keys, tokens in code and config
- SQL injection (especially custom JPQL/native queries)
- XSS in frontend templates and API responses
- Broken access control (missing RBAC checks on endpoints)
- Security misconfiguration (CORS wildcards, debug mode, exposed Swagger)
- Authentication flaws (JWT validation gaps, session handling)
- Insecure deserialization
- SSRF in any URL-fetching code
- File upload validation (type, size, content sniffing)
- Exception handling that fails open instead of closed
- Biometric data handling (encryption at rest, secure transmission)

Focus on $ARGUMENTS or the entire codebase if no argument given.

Rate each finding as CRITICAL / HIGH / MEDIUM / LOW with file path and line number.
