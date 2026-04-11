# FIVUCSAS Scripts

Utility, deployment, and testing scripts for the FIVUCSAS platform.

## Deployment

| Script | Description |
|--------|-------------|
| `deploy-ubuntu-coolify.sh` | Deploy the full FIVUCSAS stack on a fresh Ubuntu 22.04/24.04 VPS via Coolify |
| `deploy/deploy-identity-core-hetzner.sh` | Deploy Identity Core API to Hetzner (Linux) |
| `deploy/deploy-identity-core-hetzner.ps1` | Deploy Identity Core API to Hetzner (Windows) |
| `deploy/setup-laptop-gpu-wsl.ps1` | Set up local GPU environment via WSL |
| `verify-deployment.sh` | Verify all services are running and healthy |
| `verify-deploy.sh` | Verify V15 seed data and endpoints |
| `fix-flyway-hetzner.sh` | Hotfix: replace Identity Core JAR on Hetzner |
| `cloudflare-tunnel.sh` | Set up Cloudflare Tunnel for local GPU biometric processor |

## Development Setup

| Script | Description |
|--------|-------------|
| `setup-env.sh` | Generate secure credentials and create `.env` file |
| `setup-twilio.sh` | Configure Twilio SMS OTP integration |

## Testing

| Script | Description |
|--------|-------------|
| `run-tests.sh` | Run module tests (Linux/Mac) |
| `run-all-tests.ps1` | Run all E2E tests across all modules (PowerShell) |
| `test/run-backend-tests.sh` | Run backend test suite |
| `test-crud.sh` | CRUD verification for all major entities |
| `test-health.sh` | API health checks across all endpoint groups |
| `test-integration.sh` | Backend-frontend integration tests (Linux) |
| `test-integration.bat` | Backend-frontend integration tests (Windows) |
| `test-rbac.sh` | Role-based access control and multi-tenant isolation tests |
| `test-verification.sh` | End-to-end verification pipeline test against production |
| `security-audit.sh` | Production security audit |

## Utilities

| Script | Description |
|--------|-------------|
| `md_to_docx.py` | Convert ADD Markdown document to formatted Word file |
| `add_diagrams_to_docx.py` | Generate Mermaid diagrams and embed them in Word document |

## Documentation

| File | Description |
|------|-------------|
| `deploy/DEPLOYMENT_GUIDE.md` | Step-by-step deployment guide |
| `test/backend-test-plan.md` | Backend testing strategy and plan |
