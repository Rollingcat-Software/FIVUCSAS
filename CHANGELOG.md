# Changelog

All notable changes to the FIVUCSAS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Multi-modal auth system architecture documentation (10 documents in `docs/09-auth-flows/`)
  - Platform Capability Matrix (10 auth methods x 5 platforms)
  - Auth Flow Architecture (session state machine, Strategy pattern)
  - Enrollment Flows (per-method enrollment for all 10 methods)
  - Database Schema (8 new tables, V16 migration)
  - API Specification (REST + WebSocket endpoints)
  - Security Design (per-method threat model, anti-replay, GDPR/KVKK)
  - Tenant Admin UX (auth flow builder, enrollment management)
  - Cross-Device Protocol (QR bridge + WebSocket delegation)
  - Implementation Phases (8-phase roadmap)
  - Voice Recognition Design (ECAPA-TDNN, 5 endpoints)

### Changed
- Updated project status to ~80% complete
- Updated documentation index with auth-flows section

## [0.9.0] - 2026-02-10

### Added
- Tenant create/edit form page in web dashboard
- User creation form UX fix (tenant dropdown auto-selection)
- Audit log action filter fix (frontend param flattening)

### Fixed
- Audit log persistence infinite loop (`@Transactional` + `@Async` conflict)

## [0.8.0] - 2026-02-03

### Added
- Landing website deployed to `fivucsas.rollingcatsoftware.com`
- Landing website documentation (`docs/08-website/`)

## [0.7.0] - 2026-01-28

### Added
- Web dashboard deployed to `ica-fivucsas.rollingcatsoftware.com` (Hostinger)
- Realistic sample data seeding (V15 migration: 3 tenants, 8 users, audit logs)

## [0.6.0] - 2026-01-20

### Added
- Identity Core API deployed on GCP VM (`34.116.233.134:8080`)
- Docker Compose deployment for GCP (PostgreSQL + Redis + API)
- Deployment scripts (`deploy-identity-core-gcp.ps1`)
- IAP tunnel SSH access (direct SSH blocked by firewall)

## [0.5.0] - 2026-01-14

### Added
- Missing API endpoints for frontend integration (enrollments, settings, statistics)
- CORS configuration for cross-origin requests
- HTTPS API support

### Fixed
- UserRepository ambiguity and Flyway migration conflicts

## [0.4.0] - 2026-01-07

### Added
- Web Admin Dashboard (React 18 + TypeScript + Material-UI)
  - Authentication pages (login, register)
  - User management (CRUD, search, filter)
  - Tenant management (CRUD, activation/suspension)
  - Audit log viewer (filter by action, date, user)
  - Dashboard with statistics widgets
  - Auth flow builder (drag-and-drop UI, stub)
- Comprehensive documentation module (`docs/` submodule, 8 sections)

## [0.3.0] - 2025-12-28

### Added
- Identity Core API (Spring Boot 3.2, Java 21)
  - JWT authentication with refresh tokens
  - RBAC (roles + permissions)
  - Multi-tenancy with row-level security
  - Flyway migrations (V0-V12)
  - Swagger/OpenAPI documentation
- PostgreSQL 16 + pgvector database schema

## [0.2.0] - 2025-12-15

### Added
- Kotlin Multiplatform client apps (Android + Desktop)
  - Camera service with platform abstractions
  - Face capture UI with Compose Multiplatform
  - NFC reader (10+ card types)

## [0.1.0] - 2025-11-01

### Added
- Biometric Processor API (FastAPI, Python 3.11+)
  - 46+ endpoints for face operations
  - 9 integrated ML models (DeepFace, FaceNet, ArcFace, etc.)
  - Active liveness detection (Biometric Puzzle)
  - Card type detection
  - WebSocket streaming for real-time analysis
  - Batch operations and webhook support
  - Proctoring system
