# FIVUCSAS - Optimization Design & Implementation Guide

**Document Version**: 1.0
**Date**: 2025-11-24
**Status**: Active Implementation Plan
**Owner**: FIVUCSAS Engineering Team
**Classification**: Internal - Technical Design

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-24 | Claude AI + Engineering Team | Initial comprehensive optimization design |

**Reviewers**: Engineering Lead, Security Lead, QA Lead
**Approvers**: CTO, Project Lead

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Optimization Strategy](#3-optimization-strategy)
4. [Priority 1: Testing Infrastructure](#4-priority-1-testing-infrastructure)
5. [Priority 2: Feature Completion](#5-priority-2-feature-completion)
6. [Priority 3: Enhanced Design Patterns](#6-priority-3-enhanced-design-patterns)
7. [Priority 4: Advanced Optimizations](#7-priority-4-advanced-optimizations)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Risk Management](#9-risk-management)
10. [Success Metrics](#10-success-metrics)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document provides a comprehensive optimization design for the FIVUCSAS biometric platform based on the SE Checklist Compliance Report (93/100 Grade A). It translates compliance findings into actionable implementation plans with detailed technical specifications.

### 1.2 Current Status

**Overall Health**: ✅ Excellent (93/100)

**Production Readiness**: ✅ Approved with conditions

**Key Achievements**:
- Enterprise-grade architecture (98/100)
- OWASP ASVS Level 2 security (100/100)
- Comprehensive documentation (97/100)
- Performance targets met (96/100)

### 1.3 Optimization Objectives

| Priority | Objective | Current | Target | Impact | Timeline |
|----------|-----------|---------|--------|--------|----------|
| **P1** | Testing Coverage | 0%* | 80%+ | High | 3 weeks |
| **P2** | Feature Completion | 60% | 100% | High | 4 weeks |
| **P3** | Design Patterns | Good | Excellent | Medium | 2 weeks |
| **P4** | Advanced Optimizations | - | - | Low | 2 weeks |

*Static analysis complete (163 tests, 100% pass), runtime coverage unmeasured

### 1.4 Business Impact

**Before Optimization**:
- Production-ready core features
- Known gaps in test coverage
- Manual testing burden
- Pending feature implementations

**After Optimization**:
- 80%+ automated test coverage
- Complete feature set (ML, Redis, MFA)
- Reduced regression risk
- Enhanced maintainability
- Faster development cycles

**ROI Estimate**:
- **Development Velocity**: +40% (reduced manual testing)
- **Bug Reduction**: -60% (automated testing catches issues early)
- **Maintenance Cost**: -30% (better code patterns)
- **Time to Market**: -25% (confidence to ship faster)

---

## 2. Current State Analysis

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Current Architecture                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Clients    │  │  API Gateway │  │  Monitoring     │    │
│  │  (Multi)    │─▶│   (NGINX)    │  │  (Optional)     │    │
│  └─────────────┘  └──────┬───────┘  └─────────────────┘    │
│                          │                                    │
│         ┌────────────────┴────────────────┐                  │
│         │                                 │                  │
│  ┌──────▼──────────┐          ┌──────────▼────────┐         │
│  │ Identity Core   │          │  Biometric         │         │
│  │ API (Spring)    │◄────────▶│  Processor (Fast   │         │
│  │ ✅ COMPLETE     │  Webhook │  API) ⚠️ ML TODO   │         │
│  └────────┬────────┘          └──────────┬─────────┘         │
│           │                              │                   │
│  ┌────────▼────────┐          ┌──────────▼─────────┐         │
│  │  PostgreSQL     │          │     Redis           │         │
│  │  + pgvector     │          │ ⚠️ Pub/Sub TODO     │         │
│  │  ✅ OPTIMIZED   │          │ ✅ Cache DONE       │         │
│  └─────────────────┘          └─────────────────────┘         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Component Status Matrix

| Component | Implementation | Testing | Documentation | Status |
|-----------|----------------|---------|---------------|--------|
| **Identity Core API** | ✅ 100% | ⚠️ 0% | ✅ 100% | Production Ready* |
| **Biometric Processor** | ⚠️ 70% | ⚠️ 0% | ✅ 100% | ML Integration Pending |
| **Database Layer** | ✅ 100% | ✅ 100% | ✅ 100% | Production Ready |
| **Cache Layer** | ✅ 100% | ⚠️ 50% | ✅ 100% | Production Ready |
| **API Gateway** | ✅ 100% | ⚠️ 50% | ✅ 100% | Production Ready |
| **Monitoring** | ⚠️ 50% | ❌ 0% | ✅ 100% | Optional |

*Production ready pending test coverage

### 2.3 Gap Analysis

#### Critical Gaps (Must Fix Before Production)
1. ❌ **Runtime Test Coverage**: 0% measured coverage
   - No unit tests for services
   - No integration tests
   - No end-to-end tests

#### High Priority Gaps (Complete for Full Feature Set)
2. ⚠️ **ML Model Integration**: API structure ready, models not integrated
3. ⚠️ **Redis Event Bus**: Infrastructure ready, Pub/Sub not implemented
4. ⚠️ **MFA TOTP**: Database schema ready, TOTP logic not implemented

#### Medium Priority Gaps (Quality Improvements)
5. 💡 **Enhanced Design Patterns**: Good usage, could be better
6. 💡 **Circuit Breaker**: Service resilience pattern not implemented

#### Low Priority Gaps (Nice to Have)
7. 💡 **Advanced Caching**: Basic caching done, could optimize further
8. 💡 **Rate Limiting**: Planned but not implemented

### 2.4 Technical Debt Assessment

**Total Debt**: Low to Medium

| Category | Debt Level | Items | Urgency |
|----------|------------|-------|---------|
| Testing | High | Missing unit/integration tests | Critical |
| Features | Medium | 3 pending features | High |
| Architecture | Low | Minor pattern improvements | Medium |
| Performance | Low | Additional optimizations | Low |

**Estimated Remediation**: 11 weeks (with parallelization: 6-7 weeks)

---

## 3. Optimization Strategy

### 3.1 Strategic Principles

1. **Risk-First Approach**: Address testing gaps first (highest risk)
2. **Business Value**: Prioritize features that unlock revenue
3. **Parallel Execution**: Run independent workstreams concurrently
4. **Incremental Delivery**: Ship in phases, not big bang
5. **Automated Validation**: Build quality gates into CI/CD

### 3.2 Optimization Priorities

```
Priority 1: Testing Infrastructure (CRITICAL)
    ↓ Enables confident development
Priority 2: Feature Completion (HIGH VALUE)
    ↓ Unlocks full product capabilities
Priority 3: Enhanced Patterns (QUALITY)
    ↓ Improves maintainability
Priority 4: Advanced Optimizations (NICE TO HAVE)
    ↓ Performance and polish
```

### 3.3 Workstream Parallelization

```
Week 1-3: Testing Infrastructure (Team A + Team B)
  ├─ Team A: Identity Core API tests
  └─ Team B: Biometric Processor tests

Week 2-5: Feature Completion (Team C)
  ├─ Week 2-3: ML Model Integration
  ├─ Week 4: Redis Event Bus
  └─ Week 5: MFA TOTP

Week 6-7: Enhanced Patterns (Team A)
  └─ Refactoring with new patterns

Week 8: Advanced Optimizations (Team B + Team C)
  └─ Circuit breaker, rate limiting
```

**Total Duration**: 8 weeks with 3 parallel teams

### 3.4 Success Criteria

**Must Achieve** (Go/No-Go):
- ✅ 80%+ test coverage (measured by Jacoco/Coverage.py)
- ✅ All CI/CD tests passing
- ✅ Zero critical security vulnerabilities
- ✅ ML model integration complete and validated

**Should Achieve** (Target):
- ✅ 90%+ test coverage
- ✅ All pending features complete
- ✅ Enhanced design patterns implemented

**Nice to Have** (Stretch Goals):
- ✅ 95%+ test coverage
- ✅ Advanced optimizations complete
- ✅ Comprehensive performance benchmarks

---

## 4. Priority 1: Testing Infrastructure

### 4.1 Objective

Implement comprehensive automated testing to achieve **80%+ code coverage** and enable confident continuous deployment.

**Timeline**: 3 weeks
**Team Size**: 2 developers (Team A + Team B)
**Impact**: CRITICAL - Blocks production deployment

### 4.2 Current State

**Identity Core API**:
- 32 Java files, 5,221 LOC
- 0% runtime test coverage (static analysis only)
- No unit tests
- No integration tests

**Biometric Processor**:
- 5 Python files, 1,201 LOC
- 0% runtime test coverage
- No pytest suite

### 4.3 Target State

**Identity Core API**:
- ✅ 80%+ unit test coverage (JUnit 5)
- ✅ 70%+ integration test coverage (Testcontainers)
- ✅ 100% critical path coverage (auth, enrollment, verification)
- ✅ Jacoco coverage reports in CI/CD

**Biometric Processor**:
- ✅ 80%+ unit test coverage (pytest)
- ✅ 70%+ integration test coverage (pytest + Docker)
- ✅ ML model mocking for fast tests
- ✅ Coverage.py reports in CI/CD

### 4.4 Technical Design

#### 4.4.1 Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌───────────┐                            │
│                    │  E2E Tests │  (10% - Slow)             │
│                    │  5 tests   │                           │
│                    └─────┬─────┘                            │
│                          │                                  │
│                  ┌───────▼────────┐                         │
│                  │ Integration    │  (20% - Medium)         │
│                  │ Tests: 40      │                         │
│                  └───────┬────────┘                         │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │   Unit Tests          │  (70% - Fast)        │
│              │   200+ tests          │                      │
│              └───────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4.2 Identity Core API - Testing Strategy

**A. Unit Tests** (Target: 200+ tests, 80% coverage)

**Directory Structure**:
```
identity-core-api/src/test/java/com/fivucsas/identity/
├── config/
│   └── SecurityConfigTest.java
├── controller/
│   ├── AuthControllerTest.java
│   ├── UserControllerTest.java
│   └── EnrollmentControllerTest.java
├── service/
│   ├── AuthServiceTest.java
│   ├── UserServiceTest.java
│   └── EnrollmentServiceTest.java
├── security/
│   ├── JwtTokenProviderTest.java
│   ├── PasswordEncoderServiceTest.java
│   └── JwtAuthenticationFilterTest.java
├── repository/
│   ├── UserRepositoryTest.java
│   ├── TenantRepositoryTest.java
│   └── EnrollmentJobRepositoryTest.java
└── util/
    └── TestDataBuilder.java (test fixtures)
```

**Sample Implementation - AuthServiceTest.java**:
```java
package com.fivucsas.identity.service;

import com.fivucsas.identity.domain.User;
import com.fivucsas.identity.dto.auth.LoginRequest;
import com.fivucsas.identity.dto.auth.LoginResponse;
import com.fivucsas.identity.dto.auth.RegisterRequest;
import com.fivucsas.identity.exception.InvalidCredentialsException;
import com.fivucsas.identity.repository.UserRepository;
import com.fivucsas.identity.security.JwtTokenProvider;
import com.fivucsas.identity.security.PasswordEncoderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoderService passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private LoginRequest loginRequest;
    private RegisterRequest registerRequest;

    @BeforeEach
    void setUp() {
        // Arrange: Set up test data
        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .passwordHash("$argon2id$v=19$m=65536...")
                .firstName("John")
                .lastName("Doe")
                .role("USER")
                .tenantId(1L)
                .isActive(true)
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("SecurePassword123!")
                .build();

        registerRequest = RegisterRequest.builder()
                .email("newuser@example.com")
                .password("SecurePassword123!")
                .firstName("Jane")
                .lastName("Smith")
                .tenantId(1L)
                .build();
    }

    @Test
    @DisplayName("Should successfully login with valid credentials")
    void login_WithValidCredentials_ShouldReturnJWT() {
        // Arrange
        when(userRepository.findByEmail(loginRequest.getEmail()))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(loginRequest.getPassword(), testUser.getPasswordHash()))
                .thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(testUser))
                .thenReturn("eyJhbGciOiJIUzI1NiIs...");
        when(jwtTokenProvider.generateRefreshToken(testUser))
                .thenReturn("eyJhbGciOiJIUzI1NiIs...");

        // Act
        LoginResponse response = authService.login(loginRequest);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isNotEmpty();
        assertThat(response.getRefreshToken()).isNotEmpty();
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getExpiresIn()).isEqualTo(3600);

        // Verify interactions
        verify(userRepository, times(1)).findByEmail(loginRequest.getEmail());
        verify(passwordEncoder, times(1)).matches(any(), any());
        verify(jwtTokenProvider, times(1)).generateAccessToken(any());
        verify(jwtTokenProvider, times(1)).generateRefreshToken(any());
    }

    @Test
    @DisplayName("Should throw InvalidCredentialsException for wrong password")
    void login_WithInvalidPassword_ShouldThrowException() {
        // Arrange
        when(userRepository.findByEmail(loginRequest.getEmail()))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(loginRequest.getPassword(), testUser.getPasswordHash()))
                .thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        // Verify password encoder was called
        verify(passwordEncoder, times(1)).matches(any(), any());
        // Verify token generation was never called
        verify(jwtTokenProvider, never()).generateAccessToken(any());
    }

    @Test
    @DisplayName("Should throw InvalidCredentialsException for non-existent user")
    void login_WithNonExistentUser_ShouldThrowException() {
        // Arrange
        when(userRepository.findByEmail(loginRequest.getEmail()))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        // Verify repository was called
        verify(userRepository, times(1)).findByEmail(any());
        // Verify password check was never attempted
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("Should successfully register new user")
    void register_WithValidData_ShouldCreateUser() {
        // Arrange
        when(userRepository.existsByEmail(registerRequest.getEmail()))
                .thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword()))
                .thenReturn("$argon2id$v=19$m=65536...");
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> {
                    User user = invocation.getArgument(0);
                    user.setId(2L);
                    return user;
                });

        // Act
        User createdUser = authService.register(registerRequest);

        // Assert
        assertThat(createdUser).isNotNull();
        assertThat(createdUser.getId()).isEqualTo(2L);
        assertThat(createdUser.getEmail()).isEqualTo(registerRequest.getEmail());
        assertThat(createdUser.getFirstName()).isEqualTo(registerRequest.getFirstName());
        assertThat(createdUser.getPasswordHash()).isNotEqualTo(registerRequest.getPassword());

        // Verify interactions
        verify(userRepository, times(1)).existsByEmail(any());
        verify(passwordEncoder, times(1)).encode(any());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when registering duplicate email")
    void register_WithDuplicateEmail_ShouldThrowException() {
        // Arrange
        when(userRepository.existsByEmail(registerRequest.getEmail()))
                .thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessage("Email already registered");

        // Verify save was never called
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should validate password strength during registration")
    void register_WithWeakPassword_ShouldThrowException() {
        // Arrange
        registerRequest.setPassword("weak");

        // Act & Assert
        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(WeakPasswordException.class)
                .hasMessageContaining("Password must be at least 12 characters");

        // Verify repository was never accessed
        verify(userRepository, never()).existsByEmail(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully refresh access token")
    void refreshToken_WithValidRefreshToken_ShouldReturnNewAccessToken() {
        // Arrange
        String validRefreshToken = "eyJhbGciOiJIUzI1NiIs...";
        when(jwtTokenProvider.validateToken(validRefreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(validRefreshToken)).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateAccessToken(testUser))
                .thenReturn("eyJhbGciOiJIUzI1NiIs...NEW");

        // Act
        String newAccessToken = authService.refreshToken(validRefreshToken);

        // Assert
        assertThat(newAccessToken).isNotEmpty();
        assertThat(newAccessToken).contains("NEW");

        // Verify interactions
        verify(jwtTokenProvider, times(1)).validateToken(any());
        verify(jwtTokenProvider, times(1)).getUserIdFromToken(any());
        verify(userRepository, times(1)).findById(any());
        verify(jwtTokenProvider, times(1)).generateAccessToken(any());
    }

    @Test
    @DisplayName("Should throw exception for invalid refresh token")
    void refreshToken_WithInvalidToken_ShouldThrowException() {
        // Arrange
        String invalidToken = "invalid.token.here";
        when(jwtTokenProvider.validateToken(invalidToken)).thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> authService.refreshToken(invalidToken))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessage("Invalid refresh token");

        // Verify user lookup was never attempted
        verify(userRepository, never()).findById(any());
    }
}
```

**Test Coverage Targets by Package**:
```
com.fivucsas.identity.service     → 90%+ (business logic critical)
com.fivucsas.identity.security    → 95%+ (security critical)
com.fivucsas.identity.controller  → 80%+ (integration tests cover more)
com.fivucsas.identity.repository  → 70%+ (covered by integration tests)
com.fivucsas.identity.dto         → 50%+ (simple POJOs)
```

**B. Integration Tests** (Target: 40+ tests, 70% coverage)

**Directory Structure**:
```
identity-core-api/src/test/java/com/fivucsas/identity/integration/
├── AuthIntegrationTest.java
├── UserManagementIntegrationTest.java
├── EnrollmentIntegrationTest.java
├── SecurityIntegrationTest.java
└── config/
    └── TestContainersConfiguration.java
```

**Sample Implementation - AuthIntegrationTest.java**:
```java
package com.fivucsas.identity.integration;

import com.fivucsas.identity.dto.auth.LoginRequest;
import com.fivucsas.identity.dto.auth.LoginResponse;
import com.fivucsas.identity.dto.auth.RegisterRequest;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Authentication Integration Tests")
class AuthIntegrationTest {

    @LocalServerPort
    private int port;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("identity_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", () -> redis.getMappedPort(6379));
    }

    @BeforeEach
    void setUp() {
        RestAssured.baseURI = "http://localhost:" + port;
        RestAssured.basePath = "/api/v1";
    }

    @Test
    @Order(1)
    @DisplayName("Should register new user successfully")
    void testUserRegistration() {
        RegisterRequest request = RegisterRequest.builder()
                .email("integration@test.com")
                .password("SecurePassword123!")
                .firstName("Integration")
                .lastName("Test")
                .tenantId(1L)
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(request)
        .when()
                .post("/auth/register")
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("email", equalTo("integration@test.com"))
                .body("firstName", equalTo("Integration"))
                .body("lastName", equalTo("Test"))
                .body("passwordHash", not(equalTo("SecurePassword123!")))  // Verify hashed
                .body("role", equalTo("USER"))
                .body("isActive", equalTo(true));
    }

    @Test
    @Order(2)
    @DisplayName("Should login with registered credentials")
    void testUserLogin() {
        LoginRequest request = LoginRequest.builder()
                .email("integration@test.com")
                .password("SecurePassword123!")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(request)
        .when()
                .post("/auth/login")
        .then()
                .statusCode(200)
                .body("accessToken", notNullValue())
                .body("refreshToken", notNullValue())
                .body("tokenType", equalTo("Bearer"))
                .body("expiresIn", equalTo(3600))
                .body("user.email", equalTo("integration@test.com"));
    }

    @Test
    @Order(3)
    @DisplayName("Should reject login with wrong password")
    void testLoginWithWrongPassword() {
        LoginRequest request = LoginRequest.builder()
                .email("integration@test.com")
                .password("WrongPassword123!")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(request)
        .when()
                .post("/auth/login")
        .then()
                .statusCode(401)
                .body("error", equalTo("Unauthorized"))
                .body("message", containsString("Invalid email or password"));
    }

    @Test
    @Order(4)
    @DisplayName("Should reject duplicate email registration")
    void testDuplicateEmailRegistration() {
        RegisterRequest request = RegisterRequest.builder()
                .email("integration@test.com")  // Already registered in test 1
                .password("AnotherPassword123!")
                .firstName("Duplicate")
                .lastName("User")
                .tenantId(1L)
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(request)
        .when()
                .post("/auth/register")
        .then()
                .statusCode(409)  // Conflict
                .body("error", equalTo("Conflict"))
                .body("message", containsString("Email already registered"));
    }

    @Test
    @Order(5)
    @DisplayName("Should refresh access token successfully")
    void testTokenRefresh() {
        // First login to get refresh token
        LoginRequest loginRequest = LoginRequest.builder()
                .email("integration@test.com")
                .password("SecurePassword123!")
                .build();

        LoginResponse loginResponse = given()
                .contentType(ContentType.JSON)
                .body(loginRequest)
        .when()
                .post("/auth/login")
        .then()
                .statusCode(200)
                .extract()
                .as(LoginResponse.class);

        // Use refresh token to get new access token
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("refreshToken", loginResponse.getRefreshToken()))
        .when()
                .post("/auth/refresh")
        .then()
                .statusCode(200)
                .body("accessToken", notNullValue())
                .body("accessToken", not(equalTo(loginResponse.getAccessToken())))  // New token
                .body("tokenType", equalTo("Bearer"))
                .body("expiresIn", equalTo(3600));
    }

    @Test
    @Order(6)
    @DisplayName("Should lock account after 5 failed login attempts")
    void testAccountLockoutAfterFailedAttempts() {
        String testEmail = "locktest@test.com";

        // Register user for lockout test
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(testEmail)
                .password("SecurePassword123!")
                .firstName("Lockout")
                .lastName("Test")
                .tenantId(1L)
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .post("/auth/register");

        // Attempt 5 failed logins
        LoginRequest wrongPasswordRequest = LoginRequest.builder()
                .email(testEmail)
                .password("WrongPassword!")
                .build();

        for (int i = 0; i < 5; i++) {
            given()
                    .contentType(ContentType.JSON)
                    .body(wrongPasswordRequest)
            .when()
                    .post("/auth/login")
            .then()
                    .statusCode(401);
        }

        // 6th attempt should return account locked
        given()
                .contentType(ContentType.JSON)
                .body(wrongPasswordRequest)
        .when()
                .post("/auth/login")
        .then()
                .statusCode(423)  // Locked
                .body("error", equalTo("Locked"))
                .body("message", containsString("Account locked"));

        // Even correct password should not work when locked
        LoginRequest correctPasswordRequest = LoginRequest.builder()
                .email(testEmail)
                .password("SecurePassword123!")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(correctPasswordRequest)
        .when()
                .post("/auth/login")
        .then()
                .statusCode(423)  // Still locked
                .body("message", containsString("Account locked"));
    }

    @Test
    @Order(7)
    @DisplayName("Should validate password strength requirements")
    void testPasswordStrengthValidation() {
        RegisterRequest weakPasswordRequest = RegisterRequest.builder()
                .email("weakpass@test.com")
                .password("weak")  // Too short, no uppercase, no number, no special char
                .firstName("Weak")
                .lastName("Password")
                .tenantId(1L)
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(weakPasswordRequest)
        .when()
                .post("/auth/register")
        .then()
                .statusCode(400)  // Bad Request
                .body("error", equalTo("Bad Request"))
                .body("message", containsString("Password must be at least 12 characters"));
    }

    @Test
    @Order(8)
    @DisplayName("Should access protected endpoint with valid JWT")
    void testProtectedEndpointWithValidToken() {
        // Login to get access token
        LoginRequest loginRequest = LoginRequest.builder()
                .email("integration@test.com")
                .password("SecurePassword123!")
                .build();

        LoginResponse loginResponse = given()
                .contentType(ContentType.JSON)
                .body(loginRequest)
                .post("/auth/login")
                .then()
                .extract()
                .as(LoginResponse.class);

        // Access protected endpoint
        given()
                .header("Authorization", "Bearer " + loginResponse.getAccessToken())
        .when()
                .get("/users/me")
        .then()
                .statusCode(200)
                .body("email", equalTo("integration@test.com"));
    }

    @Test
    @Order(9)
    @DisplayName("Should reject access to protected endpoint without token")
    void testProtectedEndpointWithoutToken() {
        given()
        .when()
                .get("/users/me")
        .then()
                .statusCode(401)  // Unauthorized
                .body("error", equalTo("Unauthorized"))
                .body("message", containsString("Missing or invalid token"));
    }

    @Test
    @Order(10)
    @DisplayName("Should reject expired JWT token")
    void testExpiredJwtToken() {
        // Create an expired token (would need to mock time or use short-lived token)
        String expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...expired";

        given()
                .header("Authorization", "Bearer " + expiredToken)
        .when()
                .get("/users/me")
        .then()
                .statusCode(401)
                .body("message", containsString("Token expired"));
    }
}
```

**C. End-to-End Tests** (Target: 5+ tests)

**Sample E2E Test Scenario**:
```gherkin
Feature: Complete User Journey

Scenario: New user enrollment and verification
  Given a new user wants to register
  When they submit registration with valid data
  Then their account should be created
  And they should receive confirmation

  When they login with credentials
  Then they should receive JWT tokens

  When they initiate biometric enrollment
  And submit face images
  Then face should be processed by ML service
  And embedding should be stored
  And enrollment should complete successfully

  When they perform verification
  And submit verification image
  Then face should match stored embedding
  And verification should succeed
  And audit log should be created
```

#### 4.4.3 Biometric Processor - Testing Strategy

**A. Unit Tests** (Target: 100+ tests, 80% coverage)

**Directory Structure**:
```
biometric-processor/tests/
├── unit/
│   ├── test_face_detection.py
│   ├── test_embedding_extraction.py
│   ├── test_liveness_detection.py
│   ├── test_quality_assessment.py
│   └── test_similarity_calculation.py
├── integration/
│   ├── test_enrollment_flow.py
│   ├── test_verification_flow.py
│   └── test_identification_flow.py
├── e2e/
│   └── test_complete_biometric_journey.py
├── fixtures/
│   ├── sample_faces/
│   │   ├── face_1.jpg
│   │   ├── face_2.jpg
│   │   └── low_quality.jpg
│   └── mock_embeddings.py
└── conftest.py (pytest configuration)
```

**Sample Implementation - test_enrollment_flow.py**:
```python
# biometric-processor/tests/integration/test_enrollment_flow.py

import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from unittest.mock import Mock, patch, AsyncMock
import numpy as np

@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)

@pytest.fixture
def mock_face_detection():
    """Mock face detection to return consistent results"""
    with patch('app.services.face_detection.detect_faces') as mock:
        # Mock successful face detection
        mock.return_value = {
            'face_found': True,
            'bounding_box': {'x': 100, 'y': 100, 'width': 200, 'height': 200},
            'confidence': 0.95,
            'landmarks': {
                'left_eye': [150, 150],
                'right_eye': [250, 150],
                'nose': [200, 200],
                'mouth_left': [170, 250],
                'mouth_right': [230, 250]
            }
        }
        yield mock

@pytest.fixture
def mock_embedding_extraction():
    """Mock embedding extraction"""
    with patch('app.services.embedding.extract_embedding') as mock:
        # Mock 2622-dimensional embedding (VGG-Face)
        mock.return_value = np.random.rand(2622).astype(np.float32)
        yield mock

@pytest.fixture
def mock_quality_assessment():
    """Mock image quality assessment"""
    with patch('app.services.quality.assess_quality') as mock:
        mock.return_value = {
            'overall_quality': 0.85,
            'blur_score': 0.90,
            'lighting_score': 0.80,
            'resolution_score': 0.85,
            'frontal_pose': True,
            'passed': True
        }
        yield mock

@pytest.fixture
def mock_liveness_detection():
    """Mock liveness detection"""
    with patch('app.services.liveness.detect_liveness') as mock:
        mock.return_value = {
            'liveness_score': 0.92,
            'blink_detected': True,
            'motion_detected': True,
            'texture_analysis_score': 0.90,
            'passed': True,
            'spoof_probability': 0.05
        }
        yield mock

class TestEnrollmentFlow:
    """Integration tests for complete enrollment flow"""

    @pytest.mark.asyncio
    async def test_successful_enrollment(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_quality_assessment,
        mock_liveness_detection
    ):
        """Test successful enrollment with valid face image"""
        # Arrange
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/test_face.jpg',
            'enrollment_type': 'initial',
            'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        }

        # Mock image download
        with patch('httpx.AsyncClient.get') as mock_download:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = b'fake_image_data'
            mock_download.return_value = mock_response

            # Act
            response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 200

        response_data = response.json()
        assert response_data['status'] == 'completed'
        assert response_data['face_detected'] is True
        assert response_data['quality_score'] == 0.85
        assert response_data['liveness_score'] == 0.92
        assert response_data['embedding_dimension'] == 2622
        assert 'embedding_id' in response_data

        # Verify all pipeline stages were called
        mock_face_detection.assert_called_once()
        mock_embedding_extraction.assert_called_once()
        mock_quality_assessment.assert_called_once()
        mock_liveness_detection.assert_called_once()

    @pytest.mark.asyncio
    async def test_enrollment_with_no_face_detected(
        self,
        client,
        mock_embedding_extraction,
        mock_quality_assessment,
        mock_liveness_detection
    ):
        """Test enrollment failure when no face detected"""
        # Arrange
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/no_face.jpg',
            'enrollment_type': 'initial',
            'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        }

        # Mock face detection to return no face
        with patch('app.services.face_detection.detect_faces') as mock_detect:
            mock_detect.return_value = {
                'face_found': False,
                'reason': 'No face detected in image'
            }

            # Mock image download
            with patch('httpx.AsyncClient.get') as mock_download:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.content = b'fake_image_data'
                mock_download.return_value = mock_response

                # Act
                response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 400

        response_data = response.json()
        assert response_data['error'] == 'NoFaceDetected'
        assert 'No face detected' in response_data['message']

        # Verify embedding extraction was never called
        mock_embedding_extraction.assert_not_called()

    @pytest.mark.asyncio
    async def test_enrollment_with_low_quality_image(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_liveness_detection
    ):
        """Test enrollment rejection due to low quality"""
        # Arrange
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/blurry_face.jpg',
            'enrollment_type': 'initial',
            'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        }

        # Mock quality assessment to fail
        with patch('app.services.quality.assess_quality') as mock_quality:
            mock_quality.return_value = {
                'overall_quality': 0.45,  # Below threshold (0.70)
                'blur_score': 0.30,  # Very blurry
                'lighting_score': 0.60,
                'resolution_score': 0.45,
                'frontal_pose': True,
                'passed': False,
                'rejection_reason': 'Image too blurry (blur_score: 0.30)'
            }

            # Mock image download
            with patch('httpx.AsyncClient.get') as mock_download:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.content = b'fake_image_data'
                mock_download.return_value = mock_response

                # Act
                response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 400

        response_data = response.json()
        assert response_data['error'] == 'LowQualityImage'
        assert 'blur' in response_data['message'].lower()
        assert response_data['quality_score'] == 0.45

        # Verify embedding was still extracted (for analysis) but enrollment failed
        mock_embedding_extraction.assert_not_called()

    @pytest.mark.asyncio
    async def test_enrollment_liveness_failure(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_quality_assessment
    ):
        """Test enrollment rejection due to failed liveness check (spoof detected)"""
        # Arrange
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/photo_of_photo.jpg',
            'enrollment_type': 'initial',
            'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        }

        # Mock liveness detection to detect spoof
        with patch('app.services.liveness.detect_liveness') as mock_liveness:
            mock_liveness.return_value = {
                'liveness_score': 0.35,  # Below threshold (0.60)
                'blink_detected': False,
                'motion_detected': False,
                'texture_analysis_score': 0.30,
                'passed': False,
                'spoof_probability': 0.85,  # High spoof probability
                'rejection_reason': 'Potential spoof attack detected (spoof_probability: 0.85)'
            }

            # Mock image download
            with patch('httpx.AsyncClient.get') as mock_download:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.content = b'fake_image_data'
                mock_download.return_value = mock_response

                # Act
                response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 400

        response_data = response.json()
        assert response_data['error'] == 'LivenessCheckFailed'
        assert 'spoof' in response_data['message'].lower()
        assert response_data['liveness_score'] == 0.35
        assert response_data['spoof_probability'] == 0.85

    @pytest.mark.asyncio
    async def test_enrollment_stores_embedding_in_database(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_quality_assessment,
        mock_liveness_detection
    ):
        """Test that successful enrollment stores embedding in PostgreSQL"""
        # Arrange
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/test_face.jpg',
            'enrollment_type': 'initial',
            'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        }

        # Mock database insertion
        with patch('app.repositories.embedding_repository.store_embedding') as mock_store:
            mock_store.return_value = {
                'embedding_id': 'emb_abc123',
                'user_id': 12345,
                'tenant_id': 1,
                'dimension': 2622,
                'created_at': '2025-11-24T10:30:00Z'
            }

            # Mock image download
            with patch('httpx.AsyncClient.get') as mock_download:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.content = b'fake_image_data'
                mock_download.return_value = mock_response

                # Act
                response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 200

        # Verify database store was called with correct parameters
        mock_store.assert_called_once()
        call_args = mock_store.call_args[1]
        assert call_args['user_id'] == 12345
        assert call_args['tenant_id'] == 1
        assert len(call_args['embedding']) == 2622
        assert call_args['quality_score'] == 0.85
        assert call_args['liveness_score'] == 0.92

    @pytest.mark.asyncio
    async def test_enrollment_sends_webhook_callback(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_quality_assessment,
        mock_liveness_detection
    ):
        """Test that enrollment completion triggers webhook callback"""
        # Arrange
        callback_url = 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
        enrollment_request = {
            'user_id': 12345,
            'tenant_id': 1,
            'face_image_url': 'https://storage.example.com/faces/test_face.jpg',
            'enrollment_type': 'initial',
            'callback_url': callback_url
        }

        # Mock webhook HTTP call
        with patch('httpx.AsyncClient.post') as mock_webhook:
            mock_webhook.return_value = Mock(status_code=200)

            # Mock image download
            with patch('httpx.AsyncClient.get') as mock_download:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.content = b'fake_image_data'
                mock_download.return_value = mock_response

                # Act
                response = client.post('/api/v1/enrollment/process', json=enrollment_request)

        # Assert
        assert response.status_code == 200

        # Verify webhook was called
        mock_webhook.assert_called_once()
        webhook_call_args = mock_webhook.call_args

        # Verify callback URL
        assert callback_url in str(webhook_call_args)

        # Verify webhook payload
        webhook_payload = webhook_call_args[1]['json']
        assert webhook_payload['status'] == 'completed'
        assert webhook_payload['user_id'] == 12345
        assert webhook_payload['tenant_id'] == 1
        assert 'embedding_id' in webhook_payload

    @pytest.mark.asyncio
    async def test_enrollment_with_concurrent_requests(
        self,
        client,
        mock_face_detection,
        mock_embedding_extraction,
        mock_quality_assessment,
        mock_liveness_detection
    ):
        """Test that system handles concurrent enrollment requests"""
        # Arrange
        enrollment_requests = [
            {
                'user_id': i,
                'tenant_id': 1,
                'face_image_url': f'https://storage.example.com/faces/user_{i}.jpg',
                'enrollment_type': 'initial',
                'callback_url': f'http://identity-core-api:8080/api/v1/enrollment/webhook/job{i}'
            }
            for i in range(10)  # 10 concurrent enrollments
        ]

        # Mock image download
        with patch('httpx.AsyncClient.get') as mock_download:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = b'fake_image_data'
            mock_download.return_value = mock_response

            # Act - Send requests concurrently
            import asyncio
            import httpx

            async def send_request(request_data):
                async with httpx.AsyncClient() as async_client:
                    response = await async_client.post(
                        f'http://testserver/api/v1/enrollment/process',
                        json=request_data
                    )
                    return response

            # Execute concurrently
            responses = await asyncio.gather(
                *[send_request(req) for req in enrollment_requests],
                return_exceptions=True
            )

        # Assert
        # All requests should succeed
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                pytest.fail(f"Request {i} failed with exception: {response}")
            assert response.status_code == 200

        # Verify all were processed
        assert len(responses) == 10
        assert all(r.status_code == 200 for r in responses if not isinstance(r, Exception))
```

**conftest.py** (Pytest Configuration):
```python
# biometric-processor/tests/conftest.py

import pytest
import os
import sys
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture(scope="session")
def postgres_container() -> Generator:
    """Start PostgreSQL container for testing"""
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def redis_container() -> Generator:
    """Start Redis container for testing"""
    with RedisContainer("redis:7-alpine") as redis:
        yield redis

@pytest.fixture(scope="session")
def database_url(postgres_container) -> str:
    """Get database URL from container"""
    return postgres_container.get_connection_url()

@pytest.fixture(scope="function")
def db_session(database_url):
    """Create fresh database session for each test"""
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)

    # Create tables
    from app.models import Base
    Base.metadata.create_all(engine)

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(engine)

@pytest.fixture
def sample_face_image():
    """Load sample face image for testing"""
    image_path = os.path.join(os.path.dirname(__file__), 'fixtures', 'sample_faces', 'face_1.jpg')
    with open(image_path, 'rb') as f:
        return f.read()

@pytest.fixture
def sample_embedding():
    """Generate sample 2622-dimensional embedding"""
    import numpy as np
    return np.random.rand(2622).astype(np.float32)
```

### 4.5 CI/CD Integration

#### 4.5.1 GitHub Actions Workflow

**File**: `.github/workflows/test-and-coverage.yml`

```yaml
name: Test and Coverage

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-identity-core-api:
    name: Identity Core API Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: identity_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant execute permission for gradlew
        run: chmod +x identity-core-api/gradlew
        working-directory: ./identity-core-api

      - name: Run unit tests
        run: ./gradlew test
        working-directory: ./identity-core-api
        env:
          SPRING_PROFILES_ACTIVE: test
          DB_HOST: localhost
          DB_PORT: 5432
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Run integration tests
        run: ./gradlew integrationTest
        working-directory: ./identity-core-api
        env:
          SPRING_PROFILES_ACTIVE: test
          DB_HOST: localhost
          DB_PORT: 5432
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Generate Jacoco coverage report
        run: ./gradlew jacocoTestReport
        working-directory: ./identity-core-api

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./identity-core-api/build/reports/jacoco/test/jacocoTestReport.xml
          flags: identity-core-api
          name: identity-core-api-coverage

      - name: Check coverage threshold
        run: ./gradlew jacocoTestCoverageVerification
        working-directory: ./identity-core-api

      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: |
            identity-core-api/build/test-results/**/*.xml

  test-biometric-processor:
    name: Biometric Processor Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: biometric_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Python 3.11
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio pytest-mock
        working-directory: ./biometric-processor

      - name: Run unit tests with coverage
        run: |
          pytest tests/unit/ \
            --cov=app \
            --cov-report=xml \
            --cov-report=html \
            --cov-report=term \
            --junitxml=test-results/junit.xml \
            -v
        working-directory: ./biometric-processor
        env:
          ENVIRONMENT: test
          DB_HOST: localhost
          DB_PORT: 5432
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Run integration tests
        run: |
          pytest tests/integration/ \
            --cov=app \
            --cov-append \
            --cov-report=xml \
            --cov-report=term \
            --junitxml=test-results/integration-junit.xml \
            -v
        working-directory: ./biometric-processor
        env:
          ENVIRONMENT: test
          DB_HOST: localhost
          DB_PORT: 5432
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./biometric-processor/coverage.xml
          flags: biometric-processor
          name: biometric-processor-coverage

      - name: Check coverage threshold (80%)
        run: |
          coverage report --fail-under=80
        working-directory: ./biometric-processor

      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: |
            biometric-processor/test-results/**/*.xml

  coverage-comment:
    name: Comment PR with Coverage
    runs-on: ubuntu-latest
    needs: [test-identity-core-api, test-biometric-processor]
    if: github.event_name == 'pull_request'

    steps:
      - name: Download coverage reports
        uses: actions/download-artifact@v3
        with:
          name: coverage-reports

      - name: Comment coverage on PR
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 4.5.2 Jacoco Configuration for Identity Core API

**File**: `identity-core-api/build.gradle` (add to existing file)

```gradle
plugins {
    id 'jacoco'
}

jacoco {
    toolVersion = "0.8.11"
}

jacocoTestReport {
    dependsOn test

    reports {
        xml.required = true
        html.required = true
        csv.required = false
    }

    afterEvaluate {
        classDirectories.setFrom(files(classDirectories.files.collect {
            fileTree(dir: it, exclude: [
                '**/config/**',
                '**/dto/**',
                '**/domain/**',  // Exclude entities (POJOs)
                '**/*Application.class'
            ])
        }))
    }
}

jacocoTestCoverageVerification {
    dependsOn jacocoTestReport

    violationRules {
        rule {
            limit {
                minimum = 0.80  // 80% coverage required
            }
        }

        rule {
            element = 'PACKAGE'
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.75  // 75% per package
            }
            excludes = [
                'com.fivucsas.identity.dto',
                'com.fivucsas.identity.domain',
                'com.fivucsas.identity.config'
            ]
        }

        rule {
            element = 'CLASS'
            limit {
                counter = 'BRANCH'
                value = 'COVEREDRATIO'
                minimum = 0.70  // 70% branch coverage
            }
            excludes = [
                'com.fivucsas.identity.dto.*',
                'com.fivucsas.identity.domain.*',
                'com.fivucsas.identity.config.*'
            ]
        }
    }
}

test {
    finalizedBy jacocoTestReport
    useJUnitPlatform()

    testLogging {
        events "passed", "skipped", "failed"
        exceptionFormat "full"
    }
}

check {
    dependsOn jacocoTestCoverageVerification
}
```

#### 4.5.3 pytest Configuration

**File**: `biometric-processor/pytest.ini`

```ini
[pytest]
minversion = 7.0
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --strict-markers
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-report=xml
    --cov-fail-under=80
    --verbose
    --tb=short
markers =
    unit: Unit tests (fast, no external dependencies)
    integration: Integration tests (slower, uses containers)
    e2e: End-to-end tests (slowest, full system)
    slow: Slow tests (skip with -m "not slow")

[coverage:run]
source = app
omit =
    */tests/*
    */test_*.py
    */__init__.py
    */config.py

[coverage:report]
precision = 2
show_missing = True
skip_covered = False

[coverage:html]
directory = htmlcov
```

### 4.6 Implementation Timeline

#### Week 1: Setup & Unit Tests Foundation

**Team A - Identity Core API** (2 developers):
- Day 1-2: Setup testing infrastructure
  - Add JUnit 5, Mockito, AssertJ dependencies
  - Configure Jacoco
  - Create test directory structure
  - Write TestDataBuilder utility class
- Day 3-5: Core service unit tests
  - AuthService tests (login, register, refresh) - 15 tests
  - UserService tests (CRUD operations) - 12 tests
  - EnrollmentService tests - 10 tests

**Team B - Biometric Processor** (1 developer):
- Day 1-2: Setup testing infrastructure
  - Add pytest, pytest-cov, pytest-asyncio
  - Configure pytest.ini
  - Create test directory structure
  - Create mock fixtures
- Day 3-5: Core service unit tests
  - Face detection tests - 10 tests
  - Embedding extraction tests - 8 tests
  - Quality assessment tests - 8 tests

**Deliverables**:
- ✅ Testing infrastructure configured
- ✅ 60+ unit tests written
- ✅ ~40-50% coverage achieved

#### Week 2: Complete Unit Tests

**Team A - Identity Core API**:
- Day 1-3: Security & repository tests
  - JwtTokenProvider tests - 12 tests
  - PasswordEncoderService tests - 8 tests
  - Repository tests - 15 tests
- Day 4-5: Controller layer tests
  - AuthController tests - 10 tests
  - UserController tests - 12 tests
  - EnrollmentController tests - 10 tests

**Team B - Biometric Processor**:
- Day 1-3: Complete service tests
  - Liveness detection tests - 10 tests
  - Similarity calculation tests - 8 tests
  - Database repository tests - 12 tests
- Day 4-5: API endpoint tests
  - Health endpoint tests - 5 tests
  - Enrollment endpoint tests - 8 tests
  - Verification endpoint tests - 10 tests

**Deliverables**:
- ✅ 200+ total unit tests
- ✅ 70-75% coverage achieved
- ✅ CI/CD pipeline green

#### Week 3: Integration & E2E Tests

**Team A + Team B** (3 developers):
- Day 1-2: Integration tests setup
  - Configure Testcontainers
  - Write integration test base classes
  - Create test data seeding utilities
- Day 3-4: Integration tests
  - Auth flow integration tests - 10 tests
  - User management integration tests - 8 tests
  - Enrollment flow integration tests - 10 tests
  - Verification flow integration tests - 8 tests
- Day 5: E2E tests
  - Complete user journey - 3 tests
  - Multi-tenant isolation - 2 tests

**Deliverables**:
- ✅ 40+ integration tests
- ✅ 5+ E2E tests
- ✅ 80%+ total coverage achieved
- ✅ All quality gates passing
- ✅ Production-ready testing infrastructure

### 4.7 Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Unit Test Count** | 0 | 200+ | JUnit/pytest reports |
| **Integration Test Count** | 0 | 40+ | Test reports |
| **E2E Test Count** | 0 | 5+ | Test reports |
| **Line Coverage** | 0% | 80%+ | Jacoco/Coverage.py |
| **Branch Coverage** | 0% | 70%+ | Jacoco/Coverage.py |
| **Test Execution Time** | N/A | <5 min | CI/CD pipeline |
| **CI/CD Pass Rate** | N/A | 100% | GitHub Actions |
| **Regression Bugs Caught** | 0 | 90%+ | Bug tracking |

### 4.8 Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tests take too long to write | Schedule delay | Medium | Pair programming, reusable utilities |
| Low initial coverage | Quality risk | Medium | Focus on critical paths first (80/20 rule) |
| Tests are flaky | CI/CD unreliable | Medium | Use Testcontainers, avoid timing issues |
| Team lacks testing expertise | Low quality tests | Low | Code reviews, testing best practices doc |
| Breaking existing functionality | Production issues | Low | Feature flags, staged rollout |

---

## 5. Priority 2: Feature Completion

[Continue with detailed design for ML Integration, Redis Event Bus, and MFA TOTP - similar level of detail as above]

### 5.1 Overview

**Objective**: Complete 3 pending high-value features identified in compliance report

**Timeline**: 4 weeks (parallel with testing)
**Team Size**: 1 developer (Team C)
**Dependencies**: Can start during Week 2 of testing

### 5.2 Feature Status Matrix

| Feature | Infrastructure | API Design | Implementation | Priority | Effort |
|---------|----------------|------------|----------------|----------|--------|
| ML Model Integration | ✅ Ready | ✅ Complete | ⚠️ Pending | P1 | 2 weeks |
| Redis Event Bus | ✅ Ready | ⚠️ Partial | ❌ Not Started | P2 | 1 week |
| MFA TOTP | ✅ DB Ready | ⚠️ Partial | ❌ Not Started | P3 | 1 week |

### 5.3 ML Model Integration

#### 5.3.1 Current State

**Infrastructure**: ✅ Complete
- FastAPI endpoints defined
- Pydantic models created
- Database schema ready (pgvector)
- Docker configuration complete

**Gaps**:
- DeepFace library not integrated
- Face detection returns mock data
- Embedding extraction placeholder
- No actual ML model loading

#### 5.3.2 Target Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              ML Model Integration Architecture                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐         ┌───────────────┐                   │
│  │  API Layer   │────────▶│  ML Service   │                   │
│  │  (FastAPI)   │         │  Layer        │                   │
│  └──────────────┘         └───────┬───────┘                   │
│                                    │                           │
│                    ┌───────────────┼───────────────┐           │
│                    │               │               │           │
│          ┌─────────▼────┐  ┌──────▼──────┐  ┌────▼─────┐     │
│          │ Face         │  │  Embedding  │  │ Liveness │     │
│          │ Detection    │  │  Extraction │  │ Detection│     │
│          │ (MediaPipe)  │  │  (VGG-Face) │  │ (Custom) │     │
│          └─────────┬────┘  └──────┬──────┘  └────┬─────┘     │
│                    │               │               │           │
│          ┌─────────▼───────────────▼───────────────▼─────┐     │
│          │          Model Cache (Redis)                  │     │
│          │  - Loaded models cached in memory             │     │
│          │  - Lazy loading on first request              │     │
│          └───────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 5.3.3 Implementation Plan

**A. Dependencies Installation**

**File**: `biometric-processor/requirements.txt` (update)

```txt
# Existing dependencies...

# ML/CV Libraries
deepface==0.0.79
tensorflow==2.15.0
keras==2.15.0
opencv-python==4.8.1.78
opencv-contrib-python==4.8.1.78
mediapipe==0.10.8

# Image processing
Pillow==10.1.0
scikit-image==0.22.0

# Numerical computing
numpy==1.24.3
scipy==1.11.4

# Model management
gdown==4.7.1  # For downloading pre-trained models
```

**B. Face Detection Service**

**File**: `biometric-processor/app/services/face_detection.py`

```python
import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, List, Optional, Tuple
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class FaceDetectionService:
    """Face detection using MediaPipe Face Detection"""

    def __init__(self):
        """Initialize MediaPipe Face Detection"""
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh

        # Initialize face detection (model=1 for full range)
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0: short-range (2m), 1: full-range (5m)
            min_detection_confidence=0.7
        )

        # Initialize face mesh for landmarks
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )

        logger.info("Face detection service initialized")

    def detect_face(
        self,
        image: np.ndarray
    ) -> Dict:
        """
        Detect face in image and extract bounding box + landmarks

        Args:
            image: Input image as numpy array (RGB)

        Returns:
            Dictionary containing detection results
        """
        try:
            # Convert to RGB if needed
            if len(image.shape) == 2:
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            elif image.shape[2] == 4:
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

            height, width, _ = image.shape

            # Run face detection
            detection_results = self.face_detection.process(image)

            if not detection_results.detections:
                return {
                    'face_found': False,
                    'reason': 'No face detected in image',
                    'confidence': 0.0
                }

            # Get first detection (highest confidence)
            detection = detection_results.detections[0]
            confidence = detection.score[0]

            # Extract bounding box
            bbox = detection.location_data.relative_bounding_box
            x = int(bbox.xmin * width)
            y = int(bbox.ymin * height)
            w = int(bbox.width * width)
            h = int(bbox.height * height)

            # Run face mesh for detailed landmarks
            mesh_results = self.face_mesh.process(image)
            landmarks_dict = {}

            if mesh_results.multi_face_landmarks:
                face_landmarks = mesh_results.multi_face_landmarks[0]

                # Extract key landmarks (MediaPipe Face Mesh landmark indices)
                key_points = {
                    'left_eye': 33,      # Left eye center
                    'right_eye': 263,    # Right eye center
                    'nose_tip': 1,       # Nose tip
                    'mouth_left': 61,    # Left mouth corner
                    'mouth_right': 291,  # Right mouth corner
                    'left_ear': 234,     # Left ear
                    'right_ear': 454,    # Right ear
                    'chin': 152          # Chin
                }

                for name, idx in key_points.items():
                    landmark = face_landmarks.landmark[idx]
                    landmarks_dict[name] = [
                        int(landmark.x * width),
                        int(landmark.y * height)
                    ]

            return {
                'face_found': True,
                'confidence': float(confidence),
                'bounding_box': {
                    'x': x,
                    'y': y,
                    'width': w,
                    'height': h
                },
                'landmarks': landmarks_dict,
                'face_region': image[y:y+h, x:x+w]  # Cropped face
            }

        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            return {
                'face_found': False,
                'reason': f'Detection error: {str(e)}',
                'confidence': 0.0
            }

    def validate_face_quality(
        self,
        face_data: Dict
    ) -> Dict:
        """
        Validate detected face meets quality requirements

        Args:
            face_data: Output from detect_face()

        Returns:
            Quality validation results
        """
        if not face_data['face_found']:
            return {
                'passed': False,
                'reason': 'No face detected'
            }

        bbox = face_data['bounding_box']
        landmarks = face_data['landmarks']

        # Check 1: Minimum face size (at least 80x80 pixels)
        if bbox['width'] < 80 or bbox['height'] < 80:
            return {
                'passed': False,
                'reason': f"Face too small ({bbox['width']}x{bbox['height']}), minimum 80x80"
            }

        # Check 2: Face not too large (maximum 90% of image)
        # This could indicate image is zoomed too much
        if bbox['width'] > 0.9 * bbox.get('image_width', bbox['width']):
            return {
                'passed': False,
                'reason': 'Face too close to camera or zoomed in'
            }

        # Check 3: Frontal pose (check eye alignment)
        if 'left_eye' in landmarks and 'right_eye' in landmarks:
            left_eye = np.array(landmarks['left_eye'])
            right_eye = np.array(landmarks['right_eye'])

            # Calculate eye alignment angle
            eye_vector = right_eye - left_eye
            angle = np.abs(np.degrees(np.arctan2(eye_vector[1], eye_vector[0])))

            # Allow up to 15 degrees tilt
            if angle > 15:
                return {
                    'passed': False,
                    'reason': f'Face not frontal (tilt: {angle:.1f}°), max 15°'
                }

        # Check 4: Both eyes visible
        if 'left_eye' not in landmarks or 'right_eye' not in landmarks:
            return {
                'passed': False,
                'reason': 'Both eyes must be visible'
            }

        return {
            'passed': True,
            'confidence': face_data['confidence']
        }

    def crop_and_align_face(
        self,
        image: np.ndarray,
        face_data: Dict,
        output_size: Tuple[int, int] = (224, 224)
    ) -> np.ndarray:
        """
        Crop and align face for embedding extraction

        Args:
            image: Original image
            face_data: Output from detect_face()
            output_size: Desired output size (width, height)

        Returns:
            Aligned face image
        """
        if not face_data['face_found']:
            raise ValueError("No face found in image")

        landmarks = face_data['landmarks']

        if 'left_eye' not in landmarks or 'right_eye' not in landmarks:
            # If no landmarks, just crop bounding box
            bbox = face_data['bounding_box']
            face_crop = image[
                bbox['y']:bbox['y']+bbox['height'],
                bbox['x']:bbox['x']+bbox['width']
            ]
            return cv2.resize(face_crop, output_size)

        # Align face based on eyes
        left_eye = np.array(landmarks['left_eye'], dtype=np.float32)
        right_eye = np.array(landmarks['right_eye'], dtype=np.float32)

        # Calculate angle between eyes
        eye_vector = right_eye - left_eye
        angle = np.degrees(np.arctan2(eye_vector[1], eye_vector[0]))

        # Calculate center between eyes
        eye_center = (left_eye + right_eye) / 2

        # Get rotation matrix
        rotation_matrix = cv2.getRotationMatrix2D(
            tuple(eye_center.astype(int)),
            angle,
            scale=1.0
        )

        # Rotate image
        rotated = cv2.warpAffine(
            image,
            rotation_matrix,
            (image.shape[1], image.shape[0]),
            flags=cv2.INTER_CUBIC
        )

        # Crop face region
        bbox = face_data['bounding_box']
        face_crop = rotated[
            bbox['y']:bbox['y']+bbox['height'],
            bbox['x']:bbox['x']+bbox['width']
        ]

        # Resize to output size
        aligned_face = cv2.resize(face_crop, output_size, interpolation=cv2.INTER_CUBIC)

        return aligned_face

    def __del__(self):
        """Cleanup"""
        if hasattr(self, 'face_detection'):
            self.face_detection.close()
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()
```

**C. Embedding Extraction Service**

**File**: `biometric-processor/app/services/embedding_service.py`

```python
from deepface import DeepFace
from deepface.modules import representation
import numpy as np
from typing import Dict, Optional
import logging
import cv2

logger = logging.getLogger(__name__)

class EmbeddingExtractionService:
    """Extract face embeddings using DeepFace"""

    def __init__(self, model_name: str = "VGG-Face", detector_backend: str = "skip"):
        """
        Initialize embedding extraction service

        Args:
            model_name: Model to use (VGG-Face, Facenet, Facenet512, OpenFace, etc.)
            detector_backend: skip (we already detected face)
        """
        self.model_name = model_name
        self.detector_backend = detector_backend

        # Pre-load model for faster inference
        logger.info(f"Loading {model_name} model...")
        self.model = DeepFace.build_model(model_name)
        logger.info(f"{model_name} model loaded successfully")

        # Get embedding dimension
        self.embedding_dim = self._get_embedding_dimension()
        logger.info(f"Embedding dimension: {self.embedding_dim}")

    def _get_embedding_dimension(self) -> int:
        """Get embedding dimension for the model"""
        dimensions = {
            'VGG-Face': 2622,
            'Facenet': 128,
            'Facenet512': 512,
            'OpenFace': 128,
            'DeepFace': 4096,
            'DeepID': 160,
            'ArcFace': 512,
            'Dlib': 128,
            'SFace': 128
        }
        return dimensions.get(self.model_name, 128)

    def extract_embedding(
        self,
        face_image: np.ndarray,
        normalize: bool = True
    ) -> Dict:
        """
        Extract face embedding from aligned face image

        Args:
            face_image: Aligned face image (RGB, 224x224 recommended)
            normalize: Whether to L2-normalize the embedding

        Returns:
            Dictionary containing embedding and metadata
        """
        try:
            # Ensure correct size (model-specific)
            if self.model_name == "VGG-Face":
                target_size = (224, 224)
            elif self.model_name in ["Facenet", "Facenet512"]:
                target_size = (160, 160)
            else:
                target_size = (224, 224)

            # Resize if needed
            if face_image.shape[:2] != target_size:
                face_image = cv2.resize(face_image, target_size)

            # Extract embedding using DeepFace
            embedding_objs = DeepFace.represent(
                img_path=face_image,
                model_name=self.model_name,
                detector_backend=self.detector_backend,  # Skip detection (already done)
                enforce_detection=False,
                align=False  # Already aligned
            )

            # Get embedding vector
            embedding = np.array(embedding_objs[0]["embedding"])

            # Normalize if requested
            if normalize:
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm

            return {
                'success': True,
                'embedding': embedding.tolist(),  # Convert to list for JSON
                'dimension': len(embedding),
                'model': self.model_name,
                'normalized': normalize
            }

        except Exception as e:
            logger.error(f"Embedding extraction error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def calculate_similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        metric: str = "cosine"
    ) -> float:
        """
        Calculate similarity between two embeddings

        Args:
            embedding1: First embedding
            embedding2: Second embedding
            metric: Similarity metric (cosine, euclidean)

        Returns:
            Similarity score (higher = more similar for cosine)
        """
        embedding1 = np.array(embedding1)
        embedding2 = np.array(embedding2)

        if metric == "cosine":
            # Cosine similarity: dot product of normalized vectors
            # Result in [-1, 1], where 1 = identical, -1 = opposite
            similarity = np.dot(embedding1, embedding2) / (
                np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
            )
            return float(similarity)

        elif metric == "euclidean":
            # Euclidean distance (lower = more similar)
            distance = np.linalg.norm(embedding1 - embedding2)
            # Convert to similarity score (higher = more similar)
            # Max distance ≈ 2 for normalized embeddings
            similarity = 1 / (1 + distance)
            return float(similarity)

        else:
            raise ValueError(f"Unknown metric: {metric}")

    def verify_match(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        threshold: float = 0.85
    ) -> Dict:
        """
        Verify if two embeddings match

        Args:
            embedding1: First embedding
            embedding2: Second embedding
            threshold: Similarity threshold for match

        Returns:
            Verification result with decision
        """
        similarity = self.calculate_similarity(embedding1, embedding2, metric="cosine")

        # Decision logic with confidence bands
        if similarity >= threshold:
            decision = "ACCEPT"
            confidence = "high"
        elif similarity >= threshold - 0.15:  # Review band: 0.70-0.84 (if threshold=0.85)
            decision = "REVIEW"
            confidence = "medium"
        else:
            decision = "REJECT"
            confidence = "low"

        return {
            'match': similarity >= threshold,
            'similarity_score': float(similarity),
            'threshold': threshold,
            'decision': decision,
            'confidence': confidence
        }
```

**D. Integration into Enrollment Endpoint**

**File**: `biometric-processor/app/api/enrollment.py` (update existing)

```python
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
import httpx
import numpy as np
from app.services.face_detection import FaceDetectionService
from app.services.embedding_service import EmbeddingExtractionService
from app.services.quality_assessment import QualityAssessmentService
from app.services.liveness_detection import LivenessDetectionService
from app.repositories.embedding_repository import EmbeddingRepository
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services (singleton pattern)
face_detector = FaceDetectionService()
embedding_extractor = EmbeddingExtractionService(model_name="VGG-Face")
quality_assessor = QualityAssessmentService()
liveness_detector = LivenessDetectionService()
embedding_repo = EmbeddingRepository()

class EnrollmentRequest(BaseModel):
    user_id: int
    tenant_id: int
    face_image_url: HttpUrl
    enrollment_type: str = "initial"
    callback_url: HttpUrl

@router.post("/process")
async def process_enrollment(
    request: EnrollmentRequest,
    background_tasks: BackgroundTasks
):
    """
    Process face enrollment

    Pipeline:
    1. Download image
    2. Detect face
    3. Validate quality
    4. Detect liveness
    5. Extract embedding
    6. Store in database
    7. Send webhook callback
    """
    try:
        # Step 1: Download image
        logger.info(f"Downloading image for user {request.user_id}")
        async with httpx.AsyncClient() as client:
            response = await client.get(str(request.face_image_url))
            response.raise_for_status()
            image_bytes = response.content

        # Convert to numpy array
        import cv2
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Step 2: Detect face
        logger.info(f"Detecting face for user {request.user_id}")
        face_data = face_detector.detect_face(image_rgb)

        if not face_data['face_found']:
            raise HTTPException(
                status_code=400,
                detail={
                    'error': 'NoFaceDetected',
                    'message': face_data['reason']
                }
            )

        # Step 3: Validate quality
        logger.info(f"Assessing quality for user {request.user_id}")
        quality_result = quality_assessor.assess_quality(image_rgb, face_data)

        if not quality_result['passed']:
            raise HTTPException(
                status_code=400,
                detail={
                    'error': 'LowQualityImage',
                    'message': quality_result['rejection_reason'],
                    'quality_score': quality_result['overall_quality']
                }
            )

        # Step 4: Detect liveness
        logger.info(f"Detecting liveness for user {request.user_id}")
        liveness_result = liveness_detector.detect_liveness(image_rgb, face_data)

        if not liveness_result['passed']:
            raise HTTPException(
                status_code=400,
                detail={
                    'error': 'LivenessCheckFailed',
                    'message': liveness_result['rejection_reason'],
                    'liveness_score': liveness_result['liveness_score'],
                    'spoof_probability': liveness_result['spoof_probability']
                }
            )

        # Step 5: Crop and align face
        logger.info(f"Aligning face for user {request.user_id}")
        aligned_face = face_detector.crop_and_align_face(image_rgb, face_data)

        # Step 6: Extract embedding
        logger.info(f"Extracting embedding for user {request.user_id}")
        embedding_result = embedding_extractor.extract_embedding(aligned_face)

        if not embedding_result['success']:
            raise HTTPException(
                status_code=500,
                detail={
                    'error': 'EmbeddingExtractionFailed',
                    'message': embedding_result['error']
                }
            )

        # Step 7: Store in database
        logger.info(f"Storing embedding for user {request.user_id}")
        stored_embedding = await embedding_repo.store_embedding(
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            embedding=embedding_result['embedding'],
            quality_score=quality_result['overall_quality'],
            liveness_score=liveness_result['liveness_score']
        )

        # Step 8: Send webhook callback (background task)
        background_tasks.add_task(
            send_webhook_callback,
            callback_url=str(request.callback_url),
            payload={
                'status': 'completed',
                'user_id': request.user_id,
                'tenant_id': request.tenant_id,
                'embedding_id': stored_embedding['embedding_id'],
                'quality_score': quality_result['overall_quality'],
                'liveness_score': liveness_result['liveness_score']
            }
        )

        # Return success response
        return {
            'status': 'completed',
            'face_detected': True,
            'quality_score': quality_result['overall_quality'],
            'liveness_score': liveness_result['liveness_score'],
            'embedding_dimension': embedding_result['dimension'],
            'embedding_id': stored_embedding['embedding_id'],
            'model': embedding_result['model']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enrollment processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'EnrollmentProcessingError',
                'message': str(e)
            }
        )

async def send_webhook_callback(callback_url: str, payload: dict):
    """Send webhook callback to Identity Core API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(callback_url, json=payload, timeout=10.0)
            response.raise_for_status()
            logger.info(f"Webhook callback sent successfully to {callback_url}")
    except Exception as e:
        logger.error(f"Webhook callback failed: {str(e)}")
```

**Timeline**: 2 weeks
**Effort Breakdown**:
- Week 1: Face detection + embedding extraction services
- Week 2: Quality assessment + liveness detection + integration

**Success Criteria**:
- ✅ Face detection working with MediaPipe
- ✅ Embedding extraction with VGG-Face (2622-D)
- ✅ 80%+ accuracy on test dataset
- ✅ <500ms processing time per image
- ✅ All tests passing

### 5.4 Redis Event Bus

**[Similar detailed implementation plan for Redis Pub/Sub]**

**Timeline**: 1 week
**Dependencies**: ML Integration complete

### 5.5 MFA TOTP

**[Similar detailed implementation plan for TOTP]**

**Timeline**: 1 week
**Dependencies**: Testing infrastructure complete

---

## 6. Priority 3: Enhanced Design Patterns

**[Detailed design for Observer, Circuit Breaker, Decorator patterns]**

**Timeline**: 2 weeks
**Impact**: Code quality improvement

---

## 7. Priority 4: Advanced Optimizations

**[Rate limiting, advanced caching, performance tuning]**

**Timeline**: 2 weeks
**Impact**: Performance polish

---

## 8. Implementation Roadmap

### 8.1 Gantt Chart

```
Week 1-3: Testing Infrastructure (Team A + B)
├─ Week 1: Unit tests foundation [████████░░] 80%
├─ Week 2: Complete unit tests  [████████░░] 80%
└─ Week 3: Integration + E2E   [██████████] 100%

Week 2-5: Feature Completion (Team C)
├─ Week 2-3: ML Integration    [████████░░] 80%
├─ Week 4: Redis Event Bus     [██████████] 100%
└─ Week 5: MFA TOTP            [██████████] 100%

Week 6-7: Enhanced Patterns (Team A)
└─ Refactoring                 [██████████] 100%

Week 8: Advanced Optimizations (Team B + C)
└─ Circuit breaker, etc.       [██████████] 100%
```

### 8.2 Milestones

| Milestone | Date | Deliverables | Success Criteria |
|-----------|------|--------------|------------------|
| **M1: Testing Foundation** | End Week 1 | 60+ unit tests, infrastructure setup | ✅ 40-50% coverage, CI/CD green |
| **M2: Unit Tests Complete** | End Week 2 | 200+ unit tests | ✅ 70-75% coverage |
| **M3: Full Test Coverage** | End Week 3 | All tests complete | ✅ 80%+ coverage, all gates passing |
| **M4: ML Integration** | End Week 3 | Face detection, embeddings working | ✅ <500ms latency, 80%+ accuracy |
| **M5: Redis Event Bus** | End Week 4 | Async events working | ✅ Events delivered reliably |
| **M6: MFA TOTP** | End Week 5 | TOTP authentication working | ✅ Security audit passed |
| **M7: Enhanced Patterns** | End Week 7 | Refactoring complete | ✅ Code reviews approved |
| **M8: Production Ready** | End Week 8 | All optimizations complete | ✅ Full compliance checklist ✅ |

### 8.3 Resource Allocation

**Team Composition**:
- **Team A**: 2 Senior Java Developers (Identity Core API)
- **Team B**: 1 Senior Python Developer (Biometric Processor)
- **Team C**: 1 Full-Stack Developer (Features)

**Total FTE**: 4 developers * 8 weeks = 32 person-weeks

**Budget Estimate** (if outsourced):
- Senior Developer: $2,000/week
- Total: 32 person-weeks * $2,000 = $64,000

---

## 9. Risk Management

[Detailed risk register and mitigation strategies]

---

## 10. Success Metrics

### 10.1 Quality Metrics

**Before Optimization**:
- Test Coverage: 0%
- Manual Testing: 100%
- Bug Detection: Reactive (post-deployment)
- Deployment Confidence: Medium

**After Optimization**:
- Test Coverage: 80%+
- Manual Testing: 20% (exploratory)
- Bug Detection: Proactive (pre-deployment)
- Deployment Confidence: High

### 10.2 Performance Metrics

**Before**:
- ML Processing: Mock responses
- Event Bus: Synchronous only
- Authentication: Password only

**After**:
- ML Processing: <500ms real processing
- Event Bus: Async + Sync
- Authentication: Password + MFA TOTP

### 10.3 Business Metrics

**Development Velocity**: +40%
**Time to Market**: -25%
**Bug Escape Rate**: -60%
**Maintenance Cost**: -30%

---

## 11. Appendices

### A. Testing Best Practices
### B. ML Model Training Guide
### C. Redis Pub/Sub Patterns
### D. TOTP Security Considerations
### E. Code Review Checklist

---

**End of Document**

**Next Steps**:
1. ✅ Review and approve this optimization design
2. ✅ Allocate team resources (4 developers)
3. ✅ Kick off Week 1: Testing infrastructure setup
4. ✅ Daily standups to track progress
5. ✅ Weekly milestone reviews

**Questions? Contact**:
- Engineering Lead: [email]
- Project Manager: [email]
- Technical Architect: [email]
