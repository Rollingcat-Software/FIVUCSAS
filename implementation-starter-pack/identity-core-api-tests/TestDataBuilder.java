package com.fivucsas.identity.util;

import com.fivucsas.identity.domain.User;
import com.fivucsas.identity.domain.Tenant;
import com.fivucsas.identity.dto.auth.LoginRequest;
import com.fivucsas.identity.dto.auth.RegisterRequest;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Test data builder utility for creating consistent test fixtures
 *
 * Usage:
 * <pre>
 * User user = TestDataBuilder.aUser().build();
 * User adminUser = TestDataBuilder.aUser().withRole("ADMIN").build();
 * </pre>
 */
public class TestDataBuilder {

    // ========================================================================
    // User Builder
    // ========================================================================

    public static UserBuilder aUser() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private Long id = 1L;
        private String email = "test@example.com";
        private String passwordHash = "$argon2id$v=19$m=65536,t=3,p=4$test";
        private String firstName = "John";
        private String lastName = "Doe";
        private String role = "USER";
        private Long tenantId = 1L;
        private Boolean isActive = true;
        private Boolean emailVerified = true;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public UserBuilder withId(Long id) {
            this.id = id;
            return this;
        }

        public UserBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        public UserBuilder withPasswordHash(String passwordHash) {
            this.passwordHash = passwordHash;
            return this;
        }

        public UserBuilder withFirstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        public UserBuilder withLastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        public UserBuilder withRole(String role) {
            this.role = role;
            return this;
        }

        public UserBuilder withTenantId(Long tenantId) {
            this.tenantId = tenantId;
            return this;
        }

        public UserBuilder inactive() {
            this.isActive = false;
            return this;
        }

        public UserBuilder unverifiedEmail() {
            this.emailVerified = false;
            return this;
        }

        public User build() {
            User user = new User();
            user.setId(id);
            user.setEmail(email);
            user.setPasswordHash(passwordHash);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setRole(role);
            user.setTenantId(tenantId);
            user.setIsActive(isActive);
            user.setEmailVerified(emailVerified);
            user.setCreatedAt(createdAt);
            user.setUpdatedAt(updatedAt);
            return user;
        }
    }

    // ========================================================================
    // Tenant Builder
    // ========================================================================

    public static TenantBuilder aTenant() {
        return new TenantBuilder();
    }

    public static class TenantBuilder {
        private Long id = 1L;
        private String name = "Test Tenant";
        private String subdomain = "test";
        private Boolean isActive = true;
        private LocalDateTime createdAt = LocalDateTime.now();

        public TenantBuilder withId(Long id) {
            this.id = id;
            return this;
        }

        public TenantBuilder withName(String name) {
            this.name = name;
            return this;
        }

        public TenantBuilder withSubdomain(String subdomain) {
            this.subdomain = subdomain;
            return this;
        }

        public TenantBuilder inactive() {
            this.isActive = false;
            return this;
        }

        public Tenant build() {
            Tenant tenant = new Tenant();
            tenant.setId(id);
            tenant.setName(name);
            tenant.setSubdomain(subdomain);
            tenant.setIsActive(isActive);
            tenant.setCreatedAt(createdAt);
            return tenant;
        }
    }

    // ========================================================================
    // DTO Builders
    // ========================================================================

    public static LoginRequestBuilder aLoginRequest() {
        return new LoginRequestBuilder();
    }

    public static class LoginRequestBuilder {
        private String email = "test@example.com";
        private String password = "SecurePassword123!";

        public LoginRequestBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        public LoginRequestBuilder withPassword(String password) {
            this.password = password;
            return this;
        }

        public LoginRequest build() {
            LoginRequest request = new LoginRequest();
            request.setEmail(email);
            request.setPassword(password);
            return request;
        }
    }

    public static RegisterRequestBuilder aRegisterRequest() {
        return new RegisterRequestBuilder();
    }

    public static class RegisterRequestBuilder {
        private String email = "newuser@example.com";
        private String password = "SecurePassword123!";
        private String firstName = "Jane";
        private String lastName = "Smith";
        private Long tenantId = 1L;

        public RegisterRequestBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        public RegisterRequestBuilder withPassword(String password) {
            this.password = password;
            return this;
        }

        public RegisterRequestBuilder withFirstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        public RegisterRequestBuilder withLastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        public RegisterRequestBuilder withTenantId(Long tenantId) {
            this.tenantId = tenantId;
            return this;
        }

        public RegisterRequest build() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail(email);
            request.setPassword(password);
            request.setFirstName(firstName);
            request.setLastName(lastName);
            request.setTenantId(tenantId);
            return request;
        }
    }

    // ========================================================================
    // Common Test Values
    // ========================================================================

    public static class TestConstants {
        public static final String VALID_EMAIL = "test@example.com";
        public static final String VALID_PASSWORD = "SecurePassword123!";
        public static final String WEAK_PASSWORD = "weak";
        public static final String INVALID_EMAIL = "not-an-email";

        public static final String VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
        public static final String EXPIRED_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...expired";
        public static final String INVALID_JWT = "invalid.jwt.token";

        public static final Long DEFAULT_TENANT_ID = 1L;
        public static final Long DEFAULT_USER_ID = 1L;
    }
}
