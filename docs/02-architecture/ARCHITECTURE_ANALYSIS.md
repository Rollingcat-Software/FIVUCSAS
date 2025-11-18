# FIVUCSAS - Senior-Level Architecture Analysis & Recommendations

**Document Version:** 1.0
**Date:** November 4, 2025
**Prepared By:** Senior Software Architecture Analysis
**Project:** Face and Identity Verification Using Cloud-based SaaS

---

## Executive Summary

This document provides a comprehensive senior-level architectural analysis of the FIVUCSAS platform, including detailed UML diagrams, database schema optimizations, security recommendations, and professional software engineering practices aligned with enterprise standards.

**Current State:** 65% Complete (Mobile: 95%, Backend: 78%, Biometric: 80%)
**Target State:** Production-ready enterprise SaaS platform
**Primary Gaps:** Advanced features, production deployment, comprehensive testing

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [UML Design Documentation](#2-uml-design-documentation)
3. [Optimized Database Schema](#3-optimized-database-schema)
4. [System Integration Patterns](#4-system-integration-patterns)
5. [Security Architecture](#5-security-architecture)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Recommended Improvements](#7-recommended-improvements)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Current Architecture Analysis

### 1.1 Architecture Overview

**Current Pattern:** Microservices Architecture with Hexagonal Design

```
┌────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Desktop App │  │  Mobile App  │  │   Web App    │         │
│  │   (KMP)      │  │   (KMP)      │  │   (React)    │         │
│  │  Compose UI  │  │  Compose UI  │  │  TypeScript  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│                      API GATEWAY (Future)                       │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│         ┌─────────────────┴─────────────────┐                  │
│         │                                   │                  │
│  ┌──────▼──────────┐              ┌────────▼─────────┐         │
│  │ Identity Core   │◄────────────►│   Biometric      │         │
│  │   API (Java)    │   REST/gRPC  │ Processor (Py)   │         │
│  │  Spring Boot    │              │    FastAPI       │         │
│  └────────┬────────┘              └─────────┬────────┘         │
│           │                                 │                  │
│  ┌────────▼────────┐              ┌─────────▼────────┐         │
│  │  PostgreSQL     │              │   Redis Cache    │         │
│  │   + pgvector    │              │  + Message Queue │         │
│  └─────────────────┘              └──────────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Assessment

| Component | Current | Assessment | Recommendation |
|-----------|---------|------------|----------------|
| **Backend Core** | Spring Boot 3.2 (Java 21) | ✅ Excellent choice | Keep, add observability |
| **ML Service** | FastAPI (Python 3.12) | ✅ Optimal for ML | Keep, add GPU support |
| **Mobile/Desktop** | Kotlin Multiplatform | ✅ 90% code sharing | Keep, excellent choice |
| **Database** | H2 (in-memory) | ⚠️ Dev only | **MIGRATE to PostgreSQL** |
| **Cache/Queue** | Redis 7 | ✅ Industry standard | Keep, add clustering |
| **Web Frontend** | React 18 (planned) | ✅ Good choice | Implement with Next.js |
| **API Gateway** | Not implemented | ❌ Missing | **ADD NGINX/Kong** |
| **Monitoring** | Not implemented | ❌ Critical gap | **ADD Prometheus/Grafana** |

### 1.3 Strengths Analysis

#### ✅ Architecture Strengths

1. **Clean Separation of Concerns**
   - Hexagonal Architecture properly implemented
   - Domain logic isolated from infrastructure
   - Dependency Inversion Principle followed

2. **Technology Choices**
   - Modern, maintainable stack
   - Cloud-native ready
   - Excellent developer experience

3. **Code Quality**
   - SOLID principles applied
   - Professional design patterns
   - 90% code sharing in mobile

4. **Biometric Capabilities**
   - Comprehensive face recognition (9 models tested)
   - Image quality validation (8 metrics)
   - Multi-person management system
   - Production-ready DeepFace integration

### 1.4 Critical Gaps & Weaknesses

#### ❌ Architecture Weaknesses

1. **Infrastructure Layer**
   - No production database (H2 is in-memory)
   - Missing API Gateway
   - No load balancing
   - No service mesh

2. **Observability**
   - No centralized logging (ELK/Loki)
   - No distributed tracing (Jaeger/Zipkin)
   - No metrics collection (Prometheus)
   - No APM (Application Performance Monitoring)

3. **Security**
   - Basic JWT implementation (no refresh token rotation)
   - No rate limiting at gateway level
   - No API key management
   - Missing OAuth2/OIDC integration
   - No certificate management (Let's Encrypt)

4. **Resilience**
   - No circuit breakers (Resilience4j added but not configured)
   - No retry policies
   - No timeout management
   - No bulkhead isolation

5. **Scalability**
   - No horizontal pod autoscaling
   - No database replication
   - No caching strategy
   - No CDN integration

6. **Testing**
   - Limited integration tests
   - No end-to-end test automation
   - No performance/load testing
   - No chaos engineering

7. **DevOps**
   - No CI/CD pipeline
   - No infrastructure as code (Terraform)
   - No GitOps (ArgoCD/Flux)
   - No container orchestration (Kubernetes)

---

## 2. UML Design Documentation

### 2.1 System Context Diagram (C4 Model - Level 1)

```
┌─────────────────────────────────────────────────────────────┐
│                     FIVUCSAS System Context                  │
└─────────────────────────────────────────────────────────────┘

External Actors:
┌──────────────┐
│  End User    │ ──── Uses mobile app for ───┐
└──────────────┘      enrollment/auth         │
                                               │
┌──────────────┐                               ▼
│ Tenant Admin │ ──── Manages users via ── ┌─────────────────┐
└──────────────┘      web dashboard         │                 │
                                             │   FIVUCSAS      │
┌──────────────┐                             │   Platform      │
│ System Admin │ ──── Monitors via ──────────│   (SaaS)        │
└──────────────┘      admin panel            │                 │
                                             └────────┬────────┘
┌──────────────┐                                     │
│   IoT Door   │ ──── Requests face ─────────────────┘
│   Controller │      verification
└──────────────┘

External Systems:
┌──────────────┐
│  Email/SMS   │ ◄──── Notification service
│   Gateway    │
└──────────────┘

┌──────────────┐
│   Payment    │ ◄──── Subscription management
│   Provider   │
└──────────────┘
```

### 2.2 Container Diagram (C4 Model - Level 2)

```
┌───────────────────────────────────────────────────────────────────┐
│                      FIVUCSAS Platform                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                 Client Applications                      │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │      │
│  │  │  Mobile App │  │ Desktop App │  │   Web App   │     │      │
│  │  │    (KMP)    │  │    (KMP)    │  │   (React)   │     │      │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │      │
│  └─────────┼─────────────────┼─────────────────┼───────────┘      │
│            │                 │                 │                  │
│            └─────────────────┴─────────────────┘                  │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────┐     │
│  │              API Gateway (NGINX/Kong)                    │     │
│  │  • Rate Limiting  • Authentication  • Load Balancing     │     │
│  └───────────────────────────┬─────────────────────────────┘     │
│                              │                                    │
│         ┌────────────────────┴────────────────────┐              │
│         │                                         │              │
│  ┌──────▼──────────┐                    ┌────────▼─────────┐     │
│  │ Identity Core   │                    │   Biometric      │     │
│  │      API        │◄──────────────────►│   Processor      │     │
│  │  (Spring Boot)  │   Sync REST/gRPC   │   (FastAPI)      │     │
│  │                 │                    │                  │     │
│  │  • User Mgmt    │   Async Message    │  • Face Recog    │     │
│  │  • Auth/JWT     │      Queue         │  • Liveness      │     │
│  │  • Tenant Mgmt  │◄──────────────────►│  • Analysis      │     │
│  │  • RBAC         │                    │  • Quality Val   │     │
│  └────────┬────────┘                    └─────────┬────────┘     │
│           │                                       │              │
│  ┌────────▼────────┐              ┌───────────────▼────────┐     │
│  │   PostgreSQL    │              │    Redis Cluster       │     │
│  │   + pgvector    │              │  • Cache               │     │
│  │                 │              │  • Message Queue       │     │
│  │  • User data    │              │  • Session Store       │     │
│  │  • Embeddings   │              │  • Rate Limit Counter  │     │
│  │  • Audit logs   │              └────────────────────────┘     │
│  └─────────────────┘                                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │            Monitoring & Observability Stack               │    │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────┐           │    │
│  │  │Prometheus │  │  Grafana  │  │   Jaeger   │           │    │
│  │  │ (Metrics) │  │(Dashboard)│  │ (Tracing)  │           │    │
│  │  └───────────┘  └───────────┘  └────────────┘           │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

### 2.3 Class Diagram - Identity Core API Domain Model

```
┌────────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                                │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      Tenant         │
├─────────────────────┤
│ - id: UUID          │
│ - name: String      │
│ - domain: String    │
│ - isActive: Boolean │
│ - plan: SubPlan     │
│ - maxUsers: Int     │
│ - createdAt: Time   │
├─────────────────────┤
│ + activate()        │
│ + suspend()         │
│ + upgradePlan()     │
└──────────┬──────────┘
           │ 1
           │
           │ *
┌──────────▼──────────┐         ┌─────────────────────┐
│       User          │ *    * │       Role          │
├─────────────────────┤◄───────►├─────────────────────┤
│ - id: UUID          │         │ - id: UUID          │
│ - tenantId: UUID    │         │ - tenantId: UUID    │
│ - email: String     │         │ - name: String      │
│ - passwordHash: Str │         │ - description: Str  │
│ - firstName: String │         │ - isSystem: Boolean │
│ - lastName: String  │         ├─────────────────────┤
│ - phoneNumber: Str  │         │ + hasPermission()   │
│ - idNumber: String  │         └──────────┬──────────┘
│ - status: UserStatus│                    │ 1
│ - isBioEnrolled: Bo │                    │
│ - verifyCount: Int  │                    │ *
│ - createdAt: Time   │         ┌──────────▼──────────┐
│ - lastVerifiedAt:T  │         │    Permission       │
├─────────────────────┤         ├─────────────────────┤
│ + enroll()          │         │ - id: UUID          │
│ + verify()          │         │ - code: String      │
│ + activate()        │         │ - resource: String  │
│ + suspend()         │         │ - action: String    │
│ + hasRole()         │         └─────────────────────┘
└──────────┬──────────┘
           │ 1
           │
           │ *
┌──────────▼──────────────┐
│    BiometricData        │
├─────────────────────────┤
│ - id: UUID              │
│ - userId: UUID          │
│ - type: BiometricType   │
│ - embedding: Vector     │ ← pgvector type
│ - qualityScore: Float   │
│ - enrolledAt: Timestamp │
│ - isActive: Boolean     │
│ - metadata: JSONB       │
├─────────────────────────┤
│ + calculateDistance()   │
│ + verify()              │
│ + archive()             │
└─────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│   UserStatus        │         │   BiometricType     │
├─────────────────────┤         ├─────────────────────┤
│ ACTIVE              │         │ FACE                │
│ INACTIVE            │         │ FINGERPRINT         │
│ SUSPENDED           │         │ VOICE               │
│ LOCKED              │         │ IRIS                │
└─────────────────────┘         └─────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   AGGREGATE ROOT: User                        │
│  • Controls BiometricData lifecycle                          │
│  • Enforces tenant boundary                                  │
│  • Manages verification workflow                             │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Sequence Diagram - Face Enrollment Flow

```
┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Mobile│     │Identity│     │Biometric│     │PostgreSQL│     │  Redis   │
│ App  │     │Core API│     │Processor│     │          │     │          │
└───┬──┘     └────┬───┘     └────┬────┘     └────┬─────┘     └────┬─────┘
    │             │              │               │                │
    │ 1. POST /biometric/enroll/{userId}         │                │
    │  multipart/form-data                       │                │
    ├────────────►│              │               │                │
    │             │              │               │                │
    │             │ 2. Validate user exists      │                │
    │             ├─────────────────────────────►│                │
    │             │◄─────────────────────────────┤                │
    │             │              │               │                │
    │             │ 3. Check if already enrolled │                │
    │             ├─────────────────────────────►│                │
    │             │◄─────────────────────────────┤                │
    │             │              │               │                │
    │             │ 4. POST /api/v1/face/enroll  │                │
    │             │  (forward image)             │                │
    │             ├─────────────►│               │                │
    │             │              │               │                │
    │             │              │ 5. Validate image              │
    │             │              │   - Check resolution           │
    │             │              │   - Check file size            │
    │             │              │   - Check format               │
    │             │              │                                │
    │             │              │ 6. Detect face                 │
    │             │              │   - Use RetinaFace             │
    │             │              │   - Extract landmarks          │
    │             │              │                                │
    │             │              │ 7. Validate quality            │
    │             │              │   - Sharpness ≥ 40             │
    │             │              │   - Brightness ≥ 30            │
    │             │              │   - Face size ≥ 50%            │
    │             │              │                                │
    │             │              │ 8. Extract embedding           │
    │             │              │   - VGG-Face model             │
    │             │              │   - 512-D vector               │
    │             │              │                                │
    │             │  9. Return   │               │                │
    │             │  {embedding, quality_score}  │                │
    │             │◄─────────────┤               │                │
    │             │              │               │                │
    │             │ 10. Store biometric data     │                │
    │             │  INSERT BiometricData        │                │
    │             ├─────────────────────────────►│                │
    │             │◄─────────────────────────────┤                │
    │             │              │               │                │
    │             │ 11. Update user.isBioEnrolled = true          │
    │             ├─────────────────────────────►│                │
    │             │◄─────────────────────────────┤                │
    │             │              │               │                │
    │             │ 12. Publish enrollment event │                │
    │             ├───────────────────────────────────────────────►│
    │             │   user.enrolled              │                │
    │             │              │               │                │
    │ 13. 200 OK  │              │               │                │
    │  {success, userId, confidence}            │                │
    │◄────────────┤              │               │                │
    │             │              │               │                │
    │ 14. Display success        │               │                │
    │             │              │               │                │
```

### 2.5 Sequence Diagram - Face Verification Flow

```
┌──────┐     ┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
│Mobile│     │Identity│     │Biometric │     │PostgreSQL│     │ Redis│
│ App  │     │Core API│     │Processor │     │          │     │      │
└───┬──┘     └────┬───┘     └────┬─────┘     └────┬─────┘     └──┬───┘
    │             │              │               │               │
    │ 1. POST /biometric/verify/{userId}        │               │
    ├────────────►│              │               │               │
    │             │              │               │               │
    │             │ 2. Check rate limit          │               │
    │             ├───────────────────────────────────────────────►│
    │             │◄───────────────────────────────────────────────┤
    │             │   OK (not exceeded)          │               │
    │             │              │               │               │
    │             │ 3. Retrieve stored embedding │               │
    │             ├─────────────────────────────►│               │
    │             │  SELECT embedding FROM       │               │
    │             │  biometric_data WHERE user_id│               │
    │             │◄─────────────────────────────┤               │
    │             │              │               │               │
    │             │ 4. POST /api/v1/face/verify  │               │
    │             │  {image, stored_embedding}   │               │
    │             ├─────────────►│               │               │
    │             │              │               │               │
    │             │              │ 5. Extract new embedding      │
    │             │              │   - Same model (VGG-Face)     │
    │             │              │               │               │
    │             │              │ 6. Calculate distance         │
    │             │              │   - Cosine similarity         │
    │             │              │   - distance = 1 - similarity │
    │             │              │               │               │
    │             │              │ 7. Compare with threshold     │
    │             │              │   - threshold = 0.30          │
    │             │              │   - verified = (d < thresh)   │
    │             │              │               │               │
    │             │  8. Return   │               │               │
    │             │  {verified, confidence, distance}           │
    │             │◄─────────────┤               │               │
    │             │              │               │               │
    │             │ 9. Update verification_count │               │
    │             │    last_verified_at          │               │
    │             ├─────────────────────────────►│               │
    │             │◄─────────────────────────────┤               │
    │             │              │               │               │
    │             │ 10. Log verification attempt │               │
    │             │  INSERT audit_log            │               │
    │             ├─────────────────────────────►│               │
    │             │              │               │               │
    │             │ 11. Publish verification event              │
    │             ├───────────────────────────────────────────────►│
    │             │   {userId, verified, timestamp}             │
    │             │              │               │               │
    │ 12. 200 OK  │              │               │               │
    │  {verified, confidence}    │               │               │
    │◄────────────┤              │               │               │
    │             │              │               │               │
```

### 2.6 Component Diagram - Biometric Processor Internal Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              Biometric Processor Microservice                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │               REST API Layer (FastAPI)                  │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │      │
│  │  │  Face    │  │ Liveness │  │  Health  │             │      │
│  │  │Endpoints │  │Endpoints │  │ Endpoint │             │      │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │      │
│  └───────┼─────────────┼─────────────┼────────────────────┘      │
│          │             │             │                           │
│  ┌───────▼─────────────▼─────────────▼────────────────────┐      │
│  │              Service Layer                              │      │
│  │  ┌───────────────┐  ┌──────────────┐  ┌────────────┐  │      │
│  │  │FaceRecognition│  │  Liveness    │  │   Quality  │  │      │
│  │  │   Service     │  │  Detection   │  │ Validation │  │      │
│  │  │               │  │   Service    │  │  Service   │  │      │
│  │  │• Enroll       │  │• Generate    │  │• Validate  │  │      │
│  │  │• Verify       │  │  Puzzle      │  │  Image     │  │      │
│  │  │• Extract      │  │• Verify      │  │• Check     │  │      │
│  │  │  Embedding    │  │  Actions     │  │  Quality   │  │      │
│  │  └───────┬───────┘  └──────┬───────┘  └─────┬──────┘  │      │
│  └──────────┼──────────────────┼──────────────────┼────────┘      │
│             │                  │                  │               │
│  ┌──────────▼──────────────────▼──────────────────▼────────┐      │
│  │              Core ML Engine Layer                        │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │      │
│  │  │ DeepFace │  │MediaPipe │  │  OpenCV  │              │      │
│  │  │  Engine  │  │  Engine  │  │  Engine  │              │      │
│  │  │          │  │          │  │          │              │      │
│  │  │• VGG-Face│  │• Facial  │  │• Image   │              │      │
│  │  │• ArcFace │  │  Landmark│  │  Process │              │      │
│  │  │• Facenet │  │• Pose    │  │• Quality │              │      │
│  │  │  Models  │  │  Estimate│  │  Metrics │              │      │
│  │  └──────────┘  └──────────┘  └──────────┘              │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Utility Layer                                │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │      │
│  │  │  Image   │  │  Config  │  │  Logger  │              │      │
│  │  │ Handler  │  │ Manager  │  │          │              │      │
│  │  └──────────┘  └──────────┘  └──────────┘              │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │           Model Cache & Storage                           │      │
│  │  ~/.deepface/weights/                                     │      │
│  │  • VGG-Face.h5 (~500MB)                                  │      │
│  │  • ArcFace.h5 (~250MB)                                   │      │
│  │  • Facenet512.h5 (~100MB)                                │      │
│  └──────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Optimized Database Schema

### 3.1 Production PostgreSQL Schema with Advanced Features

```sql
-- ========================================================================
-- FIVUCSAS Production Database Schema
-- Version: 2.0
-- PostgreSQL 16+ with pgvector extension
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- Multi-column indexes

-- ========================================================================
-- SCHEMA ORGANIZATION (Multi-tenancy via schemas)
-- ========================================================================

-- Create shared schema for system-wide tables
CREATE SCHEMA IF NOT EXISTS shared;

-- Create tenant-specific schemas (example)
-- CREATE SCHEMA IF NOT EXISTS tenant_acme;
-- CREATE SCHEMA IF NOT EXISTS tenant_techcorp;

-- ========================================================================
-- SHARED SCHEMA TABLES
-- ========================================================================

SET search_path TO shared, public;

-- ------------------------------------------------------------------------
-- Table: tenants (Master tenant registry)
-- ------------------------------------------------------------------------
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,  -- URL-safe identifier
    domain VARCHAR(255),  -- Custom domain (optional)

    -- Subscription details
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,

    -- Limits and quotas
    max_users INTEGER NOT NULL DEFAULT 100,
    max_storage_gb INTEGER NOT NULL DEFAULT 10,
    max_api_calls_per_day INTEGER NOT NULL DEFAULT 10000,

    -- Usage tracking
    current_user_count INTEGER NOT NULL DEFAULT 0,
    current_storage_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
    api_calls_today INTEGER NOT NULL DEFAULT 0,
    api_calls_this_month INTEGER NOT NULL DEFAULT 0,

    -- Status and flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_trial BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,

    -- Contact information
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    billing_email VARCHAR(255),

    -- Configuration (JSONB for flexibility)
    settings JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '{}',  -- Feature flags

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete

    CONSTRAINT chk_subscription_plan CHECK (
        subscription_plan IN ('trial', 'basic', 'professional', 'enterprise', 'custom')
    ),
    CONSTRAINT chk_subscription_status CHECK (
        subscription_status IN ('active', 'suspended', 'cancelled', 'expired')
    )
);

-- Indexes for tenants table
CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);

-- ------------------------------------------------------------------------
-- Table: system_admins (Cross-tenant system administrators)
-- ------------------------------------------------------------------------
CREATE TABLE system_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    -- Authentication
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,

    -- Audit
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_admins_email ON system_admins(email) WHERE is_active = true;

-- ========================================================================
-- TENANT SCHEMA TEMPLATE (to be created per tenant)
-- ========================================================================

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug VARCHAR)
RETURNS VOID AS $$
DECLARE
    schema_name VARCHAR := 'tenant_' || tenant_slug;
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    EXECUTE format('SET search_path TO %I, public', schema_name);

    -- Create tables (see below)
    -- Tables will be created within this schema
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- TENANT-SPECIFIC TABLES (Within each tenant_xxx schema)
-- ========================================================================

-- Note: These tables exist in each tenant's schema
-- Example: tenant_acme.users, tenant_techcorp.users, etc.

-- ------------------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic information
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    id_number VARCHAR(50),  -- National ID, passport, etc.
    date_of_birth DATE,

    -- Address information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),  -- ISO 3166-1 alpha-2

    -- Profile
    avatar_url VARCHAR(500),
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Status and flags
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    is_biometric_enrolled BOOLEAN NOT NULL DEFAULT false,
    requires_password_change BOOLEAN NOT NULL DEFAULT false,

    -- Biometric tracking
    biometric_enrollment_count INTEGER NOT NULL DEFAULT 0,
    verification_count INTEGER NOT NULL DEFAULT 0,
    failed_verification_count INTEGER NOT NULL DEFAULT 0,
    enrolled_at TIMESTAMP WITH TIME ZONE,
    last_verified_at TIMESTAMP WITH TIME ZONE,

    -- Authentication metadata
    password_changed_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,

    -- Compliance
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE,
    data_processing_consent BOOLEAN NOT NULL DEFAULT false,

    -- Custom metadata (JSONB for flexibility)
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete

    -- Constraints
    CONSTRAINT chk_user_status CHECK (
        status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_VERIFICATION')
    ),
    CONSTRAINT uq_user_email UNIQUE (email)
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_id_number ON users(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_bio_enrolled ON users(is_biometric_enrolled) WHERE is_biometric_enrolled = true;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_metadata_gin ON users USING gin(metadata);

-- Full-text search on user names
CREATE INDEX idx_users_fulltext ON users USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
);

-- ------------------------------------------------------------------------
-- Table: roles
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Role hierarchy
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,  -- For hierarchical roles

    -- Flags
    is_system_role BOOLEAN NOT NULL DEFAULT false,  -- Cannot be deleted
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_role_name UNIQUE (name)
);

CREATE INDEX idx_roles_name ON roles(name) WHERE is_active = true;
CREATE INDEX idx_roles_parent ON roles(parent_role_id);

-- ------------------------------------------------------------------------
-- Table: permissions
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(100) NOT NULL,  -- e.g., 'users', 'biometric', 'reports'
    action VARCHAR(50) NOT NULL,  -- e.g., 'create', 'read', 'update', 'delete'
    description TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_code ON permissions(code);

-- ------------------------------------------------------------------------
-- Table: role_permissions (Many-to-Many)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID,

    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ------------------------------------------------------------------------
-- Table: user_roles (Many-to-Many)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,  -- Time-bound roles

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ------------------------------------------------------------------------
-- Table: biometric_data
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Biometric type and model
    biometric_type VARCHAR(50) NOT NULL DEFAULT 'FACE',
    model_name VARCHAR(100) NOT NULL,  -- e.g., 'VGG-Face', 'ArcFace'
    model_version VARCHAR(50) NOT NULL,

    -- Embedding data (using pgvector)
    embedding vector(512),  -- 512-D vector for most models (adjust as needed)
    -- For different dimensions, create separate columns:
    -- embedding_128 vector(128),
    -- embedding_2622 vector(2622),

    -- Quality metrics
    quality_score NUMERIC(5,2) NOT NULL,  -- 0.00 to 100.00
    sharpness_score NUMERIC(5,2),
    brightness_score NUMERIC(5,2),
    contrast_score NUMERIC(5,2),
    pose_quality_score NUMERIC(5,2),

    -- Enrollment details
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enrolled_from_ip INET,
    enrolled_from_device VARCHAR(255),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_primary BOOLEAN NOT NULL DEFAULT false,  -- Primary biometric for user

    -- Versioning (for re-enrollment)
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES biometric_data(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_biometric_type CHECK (
        biometric_type IN ('FACE', 'FINGERPRINT', 'VOICE', 'IRIS')
    ),
    CONSTRAINT chk_quality_score CHECK (quality_score >= 0 AND quality_score <= 100)
);

-- Indexes for biometric_data
CREATE INDEX idx_biometric_user ON biometric_data(user_id) WHERE is_active = true;
CREATE INDEX idx_biometric_type ON biometric_data(biometric_type);
CREATE INDEX idx_biometric_primary ON biometric_data(user_id, is_primary) WHERE is_primary = true;

-- CRITICAL: Vector similarity index for fast nearest-neighbor search
CREATE INDEX idx_biometric_embedding_cosine ON biometric_data
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Alternative: L2 distance index
CREATE INDEX idx_biometric_embedding_l2 ON biometric_data
    USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- ------------------------------------------------------------------------
-- Table: verification_logs
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    biometric_data_id UUID REFERENCES biometric_data(id) ON DELETE SET NULL,

    -- Verification details
    verified BOOLEAN NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,  -- 0.0000 to 1.0000
    distance NUMERIC(10,6) NOT NULL,
    threshold NUMERIC(5,4) NOT NULL,

    -- Model used
    model_name VARCHAR(100) NOT NULL,
    detector_backend VARCHAR(50) NOT NULL,

    -- Request metadata
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_from_ip INET,
    verified_from_device VARCHAR(255),
    verification_context VARCHAR(100),  -- e.g., 'door_entry', 'app_login', 'admin_verify'

    -- Response time (for performance monitoring)
    processing_time_ms INTEGER,

    -- Failure details (if verification failed)
    failure_reason VARCHAR(255),

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for verification_logs
CREATE INDEX idx_verification_logs_user ON verification_logs(user_id);
CREATE INDEX idx_verification_logs_verified ON verification_logs(verified);
CREATE INDEX idx_verification_logs_timestamp ON verification_logs(verified_at DESC);
CREATE INDEX idx_verification_logs_context ON verification_logs(verification_context);

-- Partitioning for verification_logs (time-based)
-- This improves query performance for time-range queries
-- Example: Partition by month
-- CREATE TABLE verification_logs_2025_01 PARTITION OF verification_logs
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ------------------------------------------------------------------------
-- Table: audit_logs (Comprehensive audit trail)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event details
    event_type VARCHAR(100) NOT NULL,  -- e.g., 'user.created', 'user.deleted', 'biometric.enrolled'
    event_category VARCHAR(50) NOT NULL,  -- e.g., 'SECURITY', 'DATA_CHANGE', 'AUTHENTICATION'
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',  -- INFO, WARNING, ERROR, CRITICAL

    -- Actor (who performed the action)
    actor_type VARCHAR(50) NOT NULL,  -- 'USER', 'SYSTEM', 'ADMIN', 'API'
    actor_id UUID,
    actor_email VARCHAR(255),

    -- Target (what was acted upon)
    target_type VARCHAR(50),  -- 'USER', 'ROLE', 'BIOMETRIC_DATA', etc.
    target_id UUID,

    -- Details
    description TEXT NOT NULL,
    changes JSONB,  -- Before/after values for data changes

    -- Request metadata
    ip_address INET,
    user_agent VARCHAR(500),
    request_id UUID,

    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Retention (for compliance)
    retention_until TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_severity CHECK (
        severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    )
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('ERROR', 'CRITICAL');
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_target ON audit_logs(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_changes_gin ON audit_logs USING gin(changes);

-- Partitioning for audit_logs (recommended for high-volume logging)
-- Partition by month for better query performance and easier archival

-- ------------------------------------------------------------------------
-- Table: sessions (JWT refresh tokens and session management)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token details
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    access_token_jti VARCHAR(255),  -- JWT ID for revocation

    -- Session metadata
    device_fingerprint VARCHAR(255),
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    location_country VARCHAR(2),
    location_city VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(255)
);

-- Indexes for sessions
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity_at DESC);

-- Auto-cleanup expired sessions
CREATE INDEX idx_sessions_cleanup ON sessions(expires_at) WHERE is_active = true;

-- ------------------------------------------------------------------------
-- Table: api_keys (For programmatic access)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Key details
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,  -- Hashed API key
    key_prefix VARCHAR(20) NOT NULL,  -- First few chars for identification

    -- Permissions
    scopes JSONB NOT NULL DEFAULT '[]',  -- Array of permission scopes

    -- Rate limiting
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,

    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID,
    revoked_reason VARCHAR(255)
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ========================================================================
-- FUNCTIONS AND TRIGGERS
-- ========================================================================

-- ------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Automatically update updated_at timestamp
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_data_updated_at BEFORE UPDATE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------
-- Function: log_user_change
-- Automatically log changes to user table
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_user_change()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Build changes JSON
        changes_json = jsonb_build_object(
            'before', to_jsonb(OLD),
            'after', to_jsonb(NEW)
        );

        INSERT INTO audit_logs (
            event_type, event_category, severity,
            actor_type, actor_id,
            target_type, target_id,
            description, changes
        ) VALUES (
            'user.updated', 'DATA_CHANGE', 'INFO',
            'SYSTEM', NEW.updated_by,
            'USER', NEW.id,
            'User record updated', changes_json
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            event_type, event_category, severity,
            actor_type,
            target_type, target_id,
            description, changes
        ) VALUES (
            'user.deleted', 'DATA_CHANGE', 'WARNING',
            'SYSTEM',
            'USER', OLD.id,
            'User record deleted', to_jsonb(OLD)
        );
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_user_changes
    AFTER UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_change();

-- ------------------------------------------------------------------------
-- Function: search_similar_faces
-- Find similar faces using pgvector
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_similar_faces(
    query_embedding vector(512),
    similarity_threshold NUMERIC DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    biometric_id UUID,
    distance NUMERIC,
    confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bd.user_id,
        bd.id AS biometric_id,
        (1 - (bd.embedding <=> query_embedding)) AS distance,
        (bd.embedding <=> query_embedding) AS confidence
    FROM biometric_data bd
    WHERE
        bd.is_active = true
        AND (1 - (bd.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY bd.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- VIEWS FOR COMMON QUERIES
-- ========================================================================

-- ------------------------------------------------------------------------
-- View: user_summary
-- ------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_summary AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.status,
    u.is_biometric_enrolled,
    u.verification_count,
    u.last_verified_at,
    COUNT(DISTINCT ur.role_id) AS role_count,
    COUNT(DISTINCT bd.id) AS biometric_count,
    MAX(bd.quality_score) AS best_quality_score,
    u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN biometric_data bd ON u.id = bd.user_id AND bd.is_active = true
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- ------------------------------------------------------------------------
-- View: active_sessions_summary
-- ------------------------------------------------------------------------
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT
    s.user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(*) AS active_session_count,
    MAX(s.last_activity_at) AS last_activity,
    array_agg(DISTINCT s.device_name) AS devices
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
AND s.expires_at > CURRENT_TIMESTAMP
GROUP BY s.user_id, u.email, u.first_name, u.last_name;

-- ========================================================================
-- INITIAL DATA SEEDING
-- ========================================================================

-- Insert default permissions
INSERT INTO permissions (code, resource, action, description) VALUES
('users.create', 'users', 'create', 'Create new users'),
('users.read', 'users', 'read', 'View user information'),
('users.update', 'users', 'update', 'Update user information'),
('users.delete', 'users', 'delete', 'Delete users'),
('biometric.enroll', 'biometric', 'enroll', 'Enroll biometric data'),
('biometric.verify', 'biometric', 'verify', 'Verify biometric data'),
('biometric.delete', 'biometric', 'delete', 'Delete biometric data'),
('roles.manage', 'roles', 'manage', 'Manage roles and permissions'),
('reports.view', 'reports', 'view', 'View reports and analytics'),
('settings.manage', 'settings', 'manage', 'Manage system settings');

-- Insert default roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full system access', true),
('TENANT_ADMIN', 'Tenant Administrator', 'Manage tenant users and settings', true),
('USER_MANAGER', 'User Manager', 'Manage users within tenant', true),
('SECURITY_OFFICER', 'Security Officer', 'View security logs and reports', true),
('END_USER', 'End User', 'Basic user access', true);

-- Assign permissions to roles (example)
-- This would be populated with actual role-permission mappings

-- ========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation_policy ON users
    FOR SELECT
    USING (id = current_setting('app.current_user_id')::UUID);

-- Policy: Admins can see all users
CREATE POLICY admin_all_access_policy ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = current_setting('app.current_user_id')::UUID
            AND r.name IN ('SUPER_ADMIN', 'TENANT_ADMIN')
        )
    );

-- ========================================================================
-- PERFORMANCE OPTIMIZATION
-- ========================================================================

-- Analyze tables for query planner
ANALYZE users;
ANALYZE biometric_data;
ANALYZE verification_logs;
ANALYZE audit_logs;

-- Vacuum to reclaim storage
VACUUM ANALYZE;

-- ========================================================================
-- BACKUP AND MAINTENANCE
-- ========================================================================

-- Recommended pg_dump command:
-- pg_dump -Fc -f fivucsas_backup.dump -d fivucsas_db

-- Recommended maintenance schedule:
-- Daily: VACUUM ANALYZE on large tables
-- Weekly: Full VACUUM
-- Monthly: REINDEX
-- Quarterly: Full backup and restore test

-- ========================================================================
-- SCHEMA VERSION CONTROL
-- ========================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version, description) VALUES
('2.0.0', 'Production schema with pgvector, RBAC, and audit logging');

-- ========================================================================
-- END OF SCHEMA
-- ========================================================================
```

---

## Continue to Part 2...

This is Part 1 of the comprehensive architecture analysis. Would you like me to continue with:

**Part 2 Topics:**
- System Integration Patterns (API Gateway, Message Queue, Event-Driven)
- Security Architecture (Authentication, Authorization, Encryption)
- Deployment Architecture (Kubernetes, CI/CD, Monitoring)
- Recommended Improvements (Performance, Scalability, Resilience)
- Implementation Roadmap (Phases, Timeline, Priorities)

Shall I continue with the complete documentation?
