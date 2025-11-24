package com.fivucsas.identity.service;

import com.fivucsas.identity.domain.User;
import com.fivucsas.identity.dto.auth.LoginRequest;
import com.fivucsas.identity.dto.auth.LoginResponse;
import com.fivucsas.identity.dto.auth.RegisterRequest;
import com.fivucsas.identity.exception.InvalidCredentialsException;
import com.fivucsas.identity.exception.DuplicateEmailException;
import com.fivucsas.identity.exception.WeakPasswordException;
import com.fivucsas.identity.exception.InvalidTokenException;
import com.fivucsas.identity.repository.UserRepository;
import com.fivucsas.identity.security.JwtTokenProvider;
import com.fivucsas.identity.security.PasswordEncoderService;
import com.fivucsas.identity.util.TestDataBuilder;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for AuthService
 *
 * Test Coverage:
 * - Login success/failure scenarios
 * - Registration validation
 * - Token refresh flows
 * - Edge cases and error conditions
 *
 * Pattern: Arrange-Act-Assert
 * Tools: JUnit 5, Mockito, AssertJ
 */
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
        testUser = TestDataBuilder.aUser()
                .withId(1L)
                .withEmail("test@example.com")
                .withPasswordHash("$argon2id$v=19$m=65536...")
                .withFirstName("John")
                .withLastName("Doe")
                .withRole("USER")
                .withTenantId(1L)
                .build();

        loginRequest = TestDataBuilder.aLoginRequest()
                .withEmail("test@example.com")
                .withPassword("SecurePassword123!")
                .build();

        registerRequest = TestDataBuilder.aRegisterRequest()
                .withEmail("newuser@example.com")
                .withPassword("SecurePassword123!")
                .withFirstName("Jane")
                .withLastName("Smith")
                .withTenantId(1L)
                .build();
    }

    // ========================================================================
    // Login Tests
    // ========================================================================

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should successfully login with valid credentials")
        void login_WithValidCredentials_ShouldReturnJWT() {
            // Arrange
            when(userRepository.findByEmail(loginRequest.getEmail()))
                    .thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches(loginRequest.getPassword(), testUser.getPasswordHash()))
                    .thenReturn(true);
            when(jwtTokenProvider.generateAccessToken(testUser))
                    .thenReturn("access.jwt.token");
            when(jwtTokenProvider.generateRefreshToken(testUser))
                    .thenReturn("refresh.jwt.token");

            // Act
            LoginResponse response = authService.login(loginRequest);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access.jwt.token");
            assertThat(response.getRefreshToken()).isEqualTo("refresh.jwt.token");
            assertThat(response.getTokenType()).isEqualTo("Bearer");
            assertThat(response.getExpiresIn()).isEqualTo(3600);
            assertThat(response.getUser()).isNotNull();
            assertThat(response.getUser().getEmail()).isEqualTo("test@example.com");

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
        @DisplayName("Should throw exception for inactive user")
        void login_WithInactiveUser_ShouldThrowException() {
            // Arrange
            User inactiveUser = TestDataBuilder.aUser().inactive().build();
            when(userRepository.findByEmail(loginRequest.getEmail()))
                    .thenReturn(Optional.of(inactiveUser));

            // Act & Assert
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(AccountInactiveException.class)
                    .hasMessage("Account is inactive");

            // Verify password check was never attempted for inactive account
            verify(passwordEncoder, never()).matches(any(), any());
        }

        @Test
        @DisplayName("Should update last login timestamp on successful login")
        void login_Successful_ShouldUpdateLastLogin() {
            // Arrange
            when(userRepository.findByEmail(loginRequest.getEmail()))
                    .thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches(any(), any())).thenReturn(true);
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(any())).thenReturn("refresh");

            // Act
            authService.login(loginRequest);

            // Assert
            verify(userRepository, times(1)).save(argThat(user ->
                user.getLastLoginAt() != null
            ));
        }
    }

    // ========================================================================
    // Registration Tests
    // ========================================================================

    @Nested
    @DisplayName("Registration Tests")
    class RegistrationTests {

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
            assertThat(createdUser.getLastName()).isEqualTo(registerRequest.getLastName());
            assertThat(createdUser.getPasswordHash()).isNotEqualTo(registerRequest.getPassword());
            assertThat(createdUser.getRole()).isEqualTo("USER");
            assertThat(createdUser.getIsActive()).isTrue();

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

        @ParameterizedTest
        @ValueSource(strings = {"weak", "12345", "password", "abc", "short1"})
        @DisplayName("Should reject weak passwords")
        void register_WithWeakPassword_ShouldThrowException(String weakPassword) {
            // Arrange
            registerRequest.setPassword(weakPassword);

            // Act & Assert
            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(WeakPasswordException.class)
                    .hasMessageContaining("Password must be at least");

            // Verify repository was never accessed
            verify(userRepository, never()).existsByEmail(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should validate email format during registration")
        void register_WithInvalidEmail_ShouldThrowException() {
            // Arrange
            registerRequest.setEmail("not-an-email");

            // Act & Assert
            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(InvalidEmailException.class)
                    .hasMessage("Invalid email format");
        }

        @Test
        @DisplayName("Should set default role to USER for new registrations")
        void register_ShouldSetDefaultRole() {
            // Arrange
            when(userRepository.existsByEmail(any())).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("hashed");
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // Act
            User user = authService.register(registerRequest);

            // Assert
            assertThat(user.getRole()).isEqualTo("USER");
        }
    }

    // ========================================================================
    // Token Refresh Tests
    // ========================================================================

    @Nested
    @DisplayName("Token Refresh Tests")
    class TokenRefreshTests {

        @Test
        @DisplayName("Should successfully refresh access token with valid refresh token")
        void refreshToken_WithValidRefreshToken_ShouldReturnNewAccessToken() {
            // Arrange
            String validRefreshToken = "valid.refresh.token";
            when(jwtTokenProvider.validateToken(validRefreshToken)).thenReturn(true);
            when(jwtTokenProvider.getUserIdFromToken(validRefreshToken)).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(jwtTokenProvider.generateAccessToken(testUser))
                    .thenReturn("new.access.token");

            // Act
            String newAccessToken = authService.refreshToken(validRefreshToken);

            // Assert
            assertThat(newAccessToken).isNotEmpty();
            assertThat(newAccessToken).isEqualTo("new.access.token");

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

        @Test
        @DisplayName("Should throw exception when user not found during refresh")
        void refreshToken_WithNonExistentUser_ShouldThrowException() {
            // Arrange
            String validToken = "valid.token";
            when(jwtTokenProvider.validateToken(validToken)).thenReturn(true);
            when(jwtTokenProvider.getUserIdFromToken(validToken)).thenReturn(999L);
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> authService.refreshToken(validToken))
                    .isInstanceOf(UserNotFoundException.class)
                    .hasMessage("User not found");
        }

        @Test
        @DisplayName("Should reject expired refresh token")
        void refreshToken_WithExpiredToken_ShouldThrowException() {
            // Arrange
            String expiredToken = "expired.token";
            when(jwtTokenProvider.validateToken(expiredToken))
                    .thenThrow(new TokenExpiredException("Token expired"));

            // Act & Assert
            assertThatThrownBy(() -> authService.refreshToken(expiredToken))
                    .isInstanceOf(TokenExpiredException.class)
                    .hasMessage("Token expired");
        }
    }

    // ========================================================================
    // Account Lockout Tests
    // ========================================================================

    @Nested
    @DisplayName("Account Lockout Tests")
    class AccountLockoutTests {

        @Test
        @DisplayName("Should lock account after 5 failed login attempts")
        void login_After5FailedAttempts_ShouldLockAccount() {
            // Arrange
            when(userRepository.findByEmail(any())).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches(any(), any())).thenReturn(false);

            // Act - Attempt 5 failed logins
            for (int i = 0; i < 5; i++) {
                assertThatThrownBy(() -> authService.login(loginRequest))
                        .isInstanceOf(InvalidCredentialsException.class);
            }

            // Assert - 6th attempt should indicate account locked
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(AccountLockedException.class)
                    .hasMessage("Account locked due to multiple failed attempts");

            // Verify lock was recorded
            verify(userRepository, atLeastOnce()).save(argThat(user ->
                user.getLockedUntil() != null
            ));
        }

        @Test
        @DisplayName("Should automatically unlock account after lockout duration")
        void login_AfterLockoutDuration_ShouldUnlockAccount() {
            // Arrange
            User lockedUser = TestDataBuilder.aUser()
                    .withLockedUntil(LocalDateTime.now().minusMinutes(1))  // Expired
                    .build();

            when(userRepository.findByEmail(any())).thenReturn(Optional.of(lockedUser));
            when(passwordEncoder.matches(any(), any())).thenReturn(true);
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(any())).thenReturn("refresh");

            // Act
            LoginResponse response = authService.login(loginRequest);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isNotEmpty();

            // Verify lockout was cleared
            verify(userRepository, times(1)).save(argThat(user ->
                user.getLockedUntil() == null && user.getFailedLoginAttempts() == 0
            ));
        }
    }

    // ========================================================================
    // Edge Cases and Error Conditions
    // ========================================================================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should handle null email gracefully")
        void login_WithNullEmail_ShouldThrowException() {
            // Arrange
            loginRequest.setEmail(null);

            // Act & Assert
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should handle empty password gracefully")
        void login_WithEmptyPassword_ShouldThrowException() {
            // Arrange
            loginRequest.setPassword("");

            // Act & Assert
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should handle repository exceptions gracefully")
        void login_WhenRepositoryThrowsException_ShouldPropagateException() {
            // Arrange
            when(userRepository.findByEmail(any()))
                    .thenThrow(new RuntimeException("Database connection failed"));

            // Act & Assert
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Database connection failed");
        }

        @Test
        @DisplayName("Should log security events for failed login attempts")
        void login_Failed_ShouldLogSecurityEvent() {
            // Arrange
            when(userRepository.findByEmail(any())).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches(any(), any())).thenReturn(false);

            // Act
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(InvalidCredentialsException.class);

            // Assert - Verify security audit log was created
            // (This would check your audit logging mechanism)
            verify(auditLogger, times(1)).logSecurityEvent(
                eq("FAILED_LOGIN"),
                eq(testUser.getId()),
                anyString()
            );
        }
    }
}
