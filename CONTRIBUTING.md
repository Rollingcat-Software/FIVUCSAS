# Contributing to FIVUCSAS

Thank you for your interest in contributing to the FIVUCSAS Identity Verification Platform. This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Architecture](#architecture)

## Development Setup

### Prerequisites

- Docker and Docker Compose v2+
- Node.js 20+ (for web-app and landing-website)
- Java 21+ and Gradle (for identity-core-api)
- Python 3.11+ (for biometric-processor)
- Android Studio / Xcode (for client-apps, optional)

### Full Stack (Docker Compose)

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/fivucsas/fivucsas.git
cd fivucsas

# Copy environment files
cp .env.example .env

# Start all services
docker compose -f docker-compose.dev.yml up --build
```

### Individual Services

**Identity Core API (Spring Boot / Java)**

```bash
cd identity-core-api
./gradlew bootRun
```

**Biometric Processor (Python / FastAPI)**

```bash
cd biometric-processor
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Web App (TypeScript / React)**

```bash
cd web-app
npm install
npm run dev
```

**Landing Website**

```bash
cd landing-website
npm install
npm run dev
```

## Code Style

### Java (identity-core-api)

- Follow [Spring Boot conventions](https://spring.io/guides)
- Use standard Java naming: `camelCase` for methods/variables, `PascalCase` for classes
- Organize imports: `java.*`, blank line, `javax.*`, blank line, third-party, blank line, project
- Maximum line length: 120 characters
- Use constructor injection over field injection

### Python (biometric-processor)

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Format with [Black](https://github.com/psf/black) (line length 88)
- Sort imports with [isort](https://pycqa.github.io/isort/) (Black-compatible profile)
- Type hints required for all public function signatures
- Docstrings in Google style

### TypeScript (web-app, landing-website)

- ESLint with the project configuration (run `npm run lint`)
- Prettier for formatting
- Strict TypeScript (`strict: true`)
- Prefer `const` over `let`; avoid `var` and `any`
- Use named exports over default exports

## Branch Naming

Use the following prefixes:

| Prefix | Purpose | Example |
|-----------|------------------------|-------------------------------|
| `feature/` | New features | `feature/nfc-reader` |
| `bugfix/` | Bug fixes | `bugfix/liveness-415-error` |
| `hotfix/` | Urgent production fixes | `hotfix/auth-token-expiry` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |
| `docs/` | Documentation only | `docs/api-guide` |
| `test/` | Test additions/fixes | `test/rbac-coverage` |

Branch names should be lowercase, hyphen-separated, and concise.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat` -- A new feature
- `fix` -- A bug fix
- `docs` -- Documentation changes
- `style` -- Code style changes (formatting, no logic change)
- `refactor` -- Code refactoring (no feature or fix)
- `perf` -- Performance improvement
- `test` -- Adding or updating tests
- `chore` -- Build process, dependencies, CI
- `ci` -- CI/CD configuration changes

### Scopes

Use the service name: `core-api`, `biometric`, `web-app`, `landing`, `mobile`, `infra`

### Examples

```
feat(core-api): add document verification endpoint
fix(biometric): resolve liveness detection 415 error
docs(web-app): update authentication flow diagram
test(core-api): add RBAC permission tests
```

## Pull Request Process

1. **Create a branch** from `main` using the naming convention above.
2. **Make your changes** with clear, atomic commits.
3. **Write/update tests** for any new or changed functionality.
4. **Run the test suite** locally and ensure all tests pass.
5. **Update documentation** if you changed APIs, configuration, or behavior.
6. **Open a pull request** against `main` using the PR template.
7. **Request review** from at least one maintainer.
8. **Address feedback** -- push new commits (do not force-push during review).
9. **Merge** after approval. Squash merge is preferred for feature branches.

### PR Guidelines

- Keep PRs focused: one feature or fix per PR.
- Include a clear description of what changed and why.
- Link related issues using `Closes #123` or `Fixes #123`.
- Ensure CI checks pass before requesting review.

## Testing Requirements

### Required

- **Unit tests** for all new business logic.
- All existing tests must continue to pass.
- Test files should be co-located or in a parallel `test/` directory.

### Preferred

- **Integration tests** for API endpoints.
- **E2E tests** (Playwright) for user-facing flows.
- **Load tests** for performance-sensitive endpoints.

### Running Tests

```bash
# Java unit tests
cd identity-core-api && ./gradlew test

# Python tests
cd biometric-processor && pytest

# TypeScript tests
cd web-app && npm test

# E2E tests
cd web-app && npx playwright test
```

## Architecture

For a detailed overview of the platform architecture, see:

- [Biometric Engine Architecture](docs/BIOMETRIC_ENGINE_ARCHITECTURE.md)
- [Platform Status](PLATFORM_STATUS.md)
- [Roadmap](ROADMAP_V2.md)

## Questions?

If you have questions about contributing, feel free to open a [Discussion](https://github.com/fivucsas/fivucsas/discussions) or reach out to the maintainers.

Thank you for helping improve FIVUCSAS!
