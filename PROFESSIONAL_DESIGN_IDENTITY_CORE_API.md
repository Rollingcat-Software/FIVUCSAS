# Identity Core API - Professional Design & Implementation Guide
**Module**: identity-core-api (Spring Boot 3.2 + Java 21)
**Status**: Refactoring Required
**Compliance**: se-checklist.md SOLID Principles, Design Patterns, Security Best Practices

---

## Table of Contents
1. [Security Hardening](#1-security-hardening)
2. [SOLID Principle Compliance](#2-solid-principle-compliance)
3. [Design Pattern Implementation](#3-design-pattern-implementation)
4. [Code Quality Improvements](#4-code-quality-improvements)
5. [Architecture Enhancements](#5-architecture-enhancements)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Security Hardening

### 1.1 JWT Secret Management (CRITICAL)

**Current Problem** (JwtService.java:24):
```java
@Value("${jwt.secret}")
private String secret;  // Risk: exposed in application.yml
```

**Professional Solution**:
```java
// Option 1: Environment Variable (Recommended for MVP)
@Configuration
public class SecurityConfig {
    @Bean
    public JwtSecretProvider jwtSecretProvider() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                "JWT_SECRET environment variable must be set with minimum 32 characters"
            );
        }
        return new JwtSecretProvider(secret);
    }
}

// Option 2: AWS Secrets Manager (Production)
@Configuration
public class AwsSecretsConfig {
    @Bean
    public JwtSecretProvider jwtSecretProvider(
        @Value("${aws.secretsmanager.secret-name}") String secretName
    ) {
        SecretsManagerClient client = SecretsManagerClient.create();
        GetSecretValueRequest request = GetSecretValueRequest.builder()
            .secretId(secretName)
            .build();

        GetSecretValueResponse response = client.getSecretValue(request);
        return new JwtSecretProvider(response.secretString());
    }
}

// Option 3: Azure Key Vault (Production)
@Configuration
public class AzureKeyVaultConfig {
    @Bean
    public JwtSecretProvider jwtSecretProvider(
        @Value("${azure.keyvault.uri}") String keyVaultUri
    ) {
        SecretClient secretClient = new SecretClientBuilder()
            .vaultUrl(keyVaultUri)
            .credential(new DefaultAzureCredentialBuilder().build())
            .buildClient();

        KeyVaultSecret secret = secretClient.getSecret("jwt-secret");
        return new JwtSecretProvider(secret.getValue());
    }
}

// Immutable secret provider
public class JwtSecretProvider {
    private final String secret;

    public JwtSecretProvider(String secret) {
        this.secret = Objects.requireNonNull(secret, "JWT secret cannot be null");
        if (secret.length() < 32) {
            throw new IllegalArgumentException("JWT secret must be at least 32 characters");
        }
    }

    public String getSecret() {
        return secret;
    }
}

// Updated JwtService
@Service
public class JwtService {
    private final JwtSecretProvider secretProvider;

    public JwtService(JwtSecretProvider secretProvider) {
        this.secretProvider = secretProvider;
    }

    public String generateToken(String email) {
        // NEVER LOG THE SECRET OR TOKEN
        logger.debug("Generating JWT for user: {}", email);

        return Jwts.builder()
            .setSubject(email)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(SignatureAlgorithm.HS512, secretProvider.getSecret())
            .compact();

        // DO NOT LOG: logger.info("Generated JWT: {}", token); // SECURITY VIOLATION
    }
}
```

**Implementation Steps**:
1. Create `JwtSecretProvider` class
2. Create configuration class for secret loading
3. Inject provider into `JwtService`
4. Remove `@Value` annotation
5. Update application.yml to remove JWT secret
6. Set environment variable: `export JWT_SECRET=$(openssl rand -base64 32)`
7. Document in README.md

**Files to Modify**:
- `src/main/java/com/fivucsas/identity/security/JwtService.java`
- `src/main/java/com/fivucsas/identity/config/JwtSecretConfig.java` (NEW)
- `src/main/resources/application.yml`
- `README.md`

---

### 1.2 Remove Default Admin Credentials (CRITICAL)

**Current Problem** (DataInitializer.java:26-27):
```java
String adminEmail = "admin@fivucsas.com";
String adminPassword = "password123";  // CRITICAL SECURITY RISK
```

**Professional Solution**:
```java
@Component
@Profile("!prod")  // ONLY run in non-production environments
public class DevelopmentDataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DevelopmentDataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:#{null}}")
    private String adminEmail;

    @Value("${app.admin.password:#{null}}")
    private String adminPassword;

    @Value("${app.admin.force-password-change:true}")
    private boolean forcePasswordChange;

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(adminEmail)) {
            logger.info("Admin user already exists, skipping initialization");
            return;
        }

        if (adminEmail == null || adminPassword == null) {
            logger.warn("Admin credentials not provided in environment variables");
            logger.warn("Set APP_ADMIN_EMAIL and APP_ADMIN_PASSWORD to create admin user");
            return;
        }

        // Validate password strength
        if (adminPassword.length() < 12) {
            throw new IllegalArgumentException(
                "Admin password must be at least 12 characters long"
            );
        }

        logger.warn("════════════════════════════════════════════════════════");
        logger.warn("  DEVELOPMENT MODE: Creating admin user");
        logger.warn("  Email: {}", adminEmail);
        logger.warn("  Force password change on first login: {}", forcePasswordChange);
        logger.warn("  THIS SHOULD NEVER RUN IN PRODUCTION");
        logger.warn("════════════════════════════════════════════════════════");

        User admin = User.builder()
            .email(adminEmail)
            .passwordHash(passwordEncoder.encode(adminPassword))
            .firstName("System")
            .lastName("Administrator")
            .status(UserStatus.ACTIVE)
            .requirePasswordChange(forcePasswordChange)
            .createdAt(LocalDateTime.now())
            .build();

        userRepository.save(admin);
        logger.info("Admin user created successfully");
    }
}

// Add password change requirement to User entity
@Entity
@Table(name = "users")
public class User {
    // ... existing fields

    @Column(name = "require_password_change", nullable = false)
    private boolean requirePasswordChange = false;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.requirePasswordChange = false;
        this.passwordChangedAt = LocalDateTime.now();
    }
}

// Enforce password change in AuthController
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
    User user = authService.authenticate(request.getEmail(), request.getPassword());

    if (user.isRequirePasswordChange()) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(AuthResponse.builder()
                .requirePasswordChange(true)
                .message("Password change required. Please update your password.")
                .build());
    }

    // ... normal login flow
}
```

**Migration Script** (V7__add_password_change_fields.sql):
```sql
-- Add password change tracking
ALTER TABLE users ADD COLUMN require_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;

-- Force password change for existing admin accounts
UPDATE users
SET require_password_change = TRUE
WHERE email = 'admin@fivucsas.com';
```

**Environment Configuration**:
```bash
# Development
export APP_ADMIN_EMAIL=admin@fivucsas.local
export APP_ADMIN_PASSWORD=$(openssl rand -base64 16)
export APP_ADMIN_FORCE_PASSWORD_CHANGE=true

# Production - DO NOT SET THESE, create admin via secure process
```

**Files to Modify**:
- `src/main/java/com/fivucsas/identity/config/DataInitializer.java` → Rename to `DevelopmentDataInitializer.java`
- `src/main/java/com/fivucsas/identity/entity/User.java`
- `src/main/java/com/fivucsas/identity/controller/AuthController.java`
- `src/main/resources/db/migration/V7__add_password_change_fields.sql` (NEW)
- `README.md` - Document secure admin creation process

---

### 1.3 Disable H2 Console in Production (CRITICAL)

**Current Problem** (SecurityConfig.java:56-57):
```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/h2-console/**").permitAll()  // DANGEROUS IN PRODUCTION
```

**Professional Solution**:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> {
            CsrfConfigurer<HttpSecurity> csrfConfig = csrf.disable();

            // Enable H2 console ONLY in development
            if (!isProductionProfile()) {
                logger.warn("H2 Console enabled - DEVELOPMENT MODE ONLY");
                csrfConfig.ignoringRequestMatchers("/h2-console/**");
            }
        });

        http.authorizeHttpRequests(auth -> {
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry = auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll();

            // H2 Console access control
            if (!isProductionProfile()) {
                registry.requestMatchers("/h2-console/**").permitAll();
            } else {
                // Explicitly deny in production
                registry.requestMatchers("/h2-console/**").denyAll();
            }

            registry.anyRequest().authenticated();
        });

        // Frame options for H2 console (dev only)
        if (!isProductionProfile()) {
            http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable));
        }

        return http.build();
    }

    private boolean isProductionProfile() {
        return activeProfile.contains("prod") || activeProfile.contains("production");
    }
}

// Even better: Separate security configurations
@Configuration
@EnableWebSecurity
@Profile("!prod")
public class DevelopmentSecurityConfig {
    @Bean
    @Order(1)
    public SecurityFilterChain h2ConsoleFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/h2-console/**")
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        logger.warn("════════════════════════════════════════════════════════");
        logger.warn("  H2 Console is ENABLED at /h2-console");
        logger.warn("  THIS IS A DEVELOPMENT ENVIRONMENT");
        logger.warn("════════════════════════════════════════════════════════");

        return http.build();
    }
}

@Configuration
@EnableWebSecurity
@Profile("prod")
public class ProductionSecurityConfig {
    // No H2 console configuration - implicitly denied

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // Production-hardened configuration
        http.csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/h2-console/**").denyAll()  // Explicit deny
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/register").permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
```

**Application Configuration**:
```yaml
# application-dev.yml
spring:
  h2:
    console:
      enabled: true
      path: /h2-console

# application-prod.yml
spring:
  h2:
    console:
      enabled: false  # Disable H2 entirely in production
```

**Files to Modify**:
- `src/main/java/com/fivucsas/identity/config/SecurityConfig.java`
- `src/main/java/com/fivucsas/identity/config/DevelopmentSecurityConfig.java` (NEW)
- `src/main/java/com/fivucsas/identity/config/ProductionSecurityConfig.java` (NEW)
- `src/main/resources/application-dev.yml`
- `src/main/resources/application-prod.yml`

---

### 1.4 Implement Rate Limiting (CRITICAL)

**Professional Solution using Bucket4j**:

**Dependencies** (build.gradle):
```gradle
dependencies {
    implementation 'com.bucket4j:bucket4j-core:8.7.0'
    implementation 'com.github.vladimir-bukhtoyarov:bucket4j-jcache:8.7.0'
    implementation 'javax.cache:cache-api:1.1.1'
    implementation 'org.ehcache:ehcache:3.10.8'
}
```

**Rate Limiting Configuration**:
```java
// Rate limit configuration
@Configuration
@EnableCaching
public class RateLimitConfig {

    @Bean
    public CacheManager cacheManager() {
        return new JCacheCacheManager(Caching.getCachingProvider().getCacheManager());
    }

    @Bean
    public ProxyManager<String> rateLimitProxyManager(CacheManager cacheManager) {
        return Bucket4j.extension(JCache.class).proxyManagerForCache(
            cacheManager.getCache("rateLimitBuckets")
        );
    }
}

// Rate limit service
@Service
public class RateLimitService {

    private final ProxyManager<String> proxyManager;

    // Different rate limits for different operations
    private static final Map<String, BucketConfiguration> RATE_LIMITS = Map.of(
        "login", BucketConfiguration.builder()
            .addLimit(Limit.of(5).per(Duration.ofMinutes(15)))  // 5 attempts per 15 min
            .build(),
        "register", BucketConfiguration.builder()
            .addLimit(Limit.of(3).per(Duration.ofHours(1)))     // 3 registrations per hour
            .build(),
        "api", BucketConfiguration.builder()
            .addLimit(Limit.of(100).per(Duration.ofMinutes(1))) // 100 requests per minute
            .build()
    );

    public RateLimitService(ProxyManager<String> proxyManager) {
        this.proxyManager = proxyManager;
    }

    public boolean isAllowed(String key, String operation) {
        Bucket bucket = proxyManager.builder().build(key, () -> RATE_LIMITS.get(operation));
        return bucket.tryConsume(1);
    }

    public long getRemainingTokens(String key, String operation) {
        Bucket bucket = proxyManager.builder().build(key, () -> RATE_LIMITS.get(operation));
        return bucket.getAvailableTokens();
    }

    public Duration getTimeToRefill(String key, String operation) {
        Bucket bucket = proxyManager.builder().build(key, () -> RATE_LIMITS.get(operation));
        return Duration.ofNanos(bucket.estimateAbilityToConsume(1).getNanosToWaitForRefill());
    }
}

// Rate limit interceptor
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String clientIdentifier = extractClientIdentifier(request);
        String operation = determineOperation(request);

        if (!rateLimitService.isAllowed(clientIdentifier, operation)) {
            long remainingTime = rateLimitService.getTimeToRefill(clientIdentifier, operation).getSeconds();

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(remainingTime));
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"error\":\"Rate limit exceeded\",\"retryAfter\":%d}",
                remainingTime
            ));

            return false;
        }

        // Add rate limit headers to response
        long remaining = rateLimitService.getRemainingTokens(clientIdentifier, operation);
        response.setHeader("X-Rate-Limit-Remaining", String.valueOf(remaining));

        return true;
    }

    private String extractClientIdentifier(HttpServletRequest request) {
        // Prefer authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            return "user:" + auth.getName();
        }

        // Fallback to IP address
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = request.getRemoteAddr();
        }
        return "ip:" + ipAddress;
    }

    private String determineOperation(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.contains("/auth/login")) return "login";
        if (path.contains("/auth/register")) return "register";
        return "api";
    }
}

// Register interceptor
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebMvcConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/v1/auth/health");
    }
}

// Custom annotation for fine-grained control
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int capacity() default 100;
    int refillTokens() default 100;
    Duration refillPeriod() default Duration.ofMinutes(1);
}

// Aspect for annotation-based rate limiting
@Aspect
@Component
public class RateLimitAspect {

    private final RateLimitService rateLimitService;

    @Around("@annotation(rateLimit)")
    public Object rateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
            .getRequest();

        String clientId = extractClientId(request);
        String operationKey = joinPoint.getSignature().toShortString();

        if (!rateLimitService.isAllowed(clientId + ":" + operationKey, "custom")) {
            throw new RateLimitExceededException("Rate limit exceeded for operation: " + operationKey);
        }

        return joinPoint.proceed();
    }
}
```

**Usage in Controller**:
```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @PostMapping("/login")
    @RateLimit(capacity = 5, refillTokens = 5, refillPeriod = Duration.ofMinutes(15))
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        // Login logic
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/config/RateLimitConfig.java`
- `src/main/java/com/fivucsas/identity/service/RateLimitService.java`
- `src/main/java/com/fivucsas/identity/interceptor/RateLimitInterceptor.java`
- `src/main/java/com/fivucsas/identity/annotation/RateLimit.java`
- `src/main/java/com/fivucsas/identity/aspect/RateLimitAspect.java`
- `src/main/java/com/fivucsas/identity/exception/RateLimitExceededException.java`

---

### 1.5 Improve Password Validation (HIGH)

**Current Problem** (User.java:182-184):
```java
if (password.length() < 8) {
    throw new InvalidPasswordException("Password must be at least 8 characters long");
}
```

**Professional Solution (OWASP Compliant)**:
```java
// Password policy configuration
@Configuration
@ConfigurationProperties(prefix = "app.security.password")
public class PasswordPolicyConfig {
    private int minLength = 12;
    private int maxLength = 128;
    private boolean requireUppercase = true;
    private boolean requireLowercase = true;
    private boolean requireDigit = true;
    private boolean requireSpecialChar = true;
    private int minStrength = 3; // 0-4 scale
    private List<String> commonPasswords = new ArrayList<>();

    @PostConstruct
    public void loadCommonPasswords() {
        // Load from resources/common-passwords.txt
        try (InputStream is = getClass().getResourceAsStream("/common-passwords.txt")) {
            commonPasswords = new BufferedReader(new InputStreamReader(is))
                .lines()
                .collect(Collectors.toList());
        } catch (IOException e) {
            logger.warn("Could not load common passwords list", e);
        }
    }

    // Getters and setters
}

// Password validator service
@Service
public class PasswordValidatorService {

    private final PasswordPolicyConfig config;
    private final ZxcvbnClient zxcvbnClient;

    public PasswordValidatorService(PasswordPolicyConfig config) {
        this.config = config;
        this.zxcvbnClient = new ZxcvbnClient();
    }

    public PasswordValidationResult validate(String password, String email, String firstName, String lastName) {
        List<String> violations = new ArrayList<>();

        // Length check
        if (password.length() < config.getMinLength()) {
            violations.add("Password must be at least " + config.getMinLength() + " characters");
        }
        if (password.length() > config.getMaxLength()) {
            violations.add("Password must not exceed " + config.getMaxLength() + " characters");
        }

        // Character requirements
        if (config.isRequireUppercase() && !password.matches(".*[A-Z].*")) {
            violations.add("Password must contain at least one uppercase letter");
        }
        if (config.isRequireLowercase() && !password.matches(".*[a-z].*")) {
            violations.add("Password must contain at least one lowercase letter");
        }
        if (config.isRequireDigit() && !password.matches(".*\\d.*")) {
            violations.add("Password must contain at least one digit");
        }
        if (config.isRequireSpecialChar() && !password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            violations.add("Password must contain at least one special character");
        }

        // Common password check
        if (config.getCommonPasswords().contains(password.toLowerCase())) {
            violations.add("Password is too common. Please choose a more unique password");
        }

        // Personal information check
        if (containsPersonalInfo(password, email, firstName, lastName)) {
            violations.add("Password must not contain personal information");
        }

        // Strength check using zxcvbn
        Strength strength = zxcvbnClient.measure(password);
        if (strength.getScore() < config.getMinStrength()) {
            violations.add("Password is too weak. Score: " + strength.getScore() +
                          "/4. " + strength.getFeedback().getWarning());
        }

        if (!violations.isEmpty()) {
            return PasswordValidationResult.invalid(violations);
        }

        return PasswordValidationResult.valid(strength.getScore());
    }

    private boolean containsPersonalInfo(String password, String email, String firstName, String lastName) {
        String lowerPassword = password.toLowerCase();

        if (email != null && lowerPassword.contains(email.split("@")[0].toLowerCase())) {
            return true;
        }
        if (firstName != null && firstName.length() > 2 &&
            lowerPassword.contains(firstName.toLowerCase())) {
            return true;
        }
        if (lastName != null && lastName.length() > 2 &&
            lowerPassword.contains(lastName.toLowerCase())) {
            return true;
        }

        return false;
    }
}

// Result object
public class PasswordValidationResult {
    private final boolean valid;
    private final List<String> violations;
    private final int strengthScore; // 0-4

    private PasswordValidationResult(boolean valid, List<String> violations, int strengthScore) {
        this.valid = valid;
        this.violations = violations;
        this.strengthScore = strengthScore;
    }

    public static PasswordValidationResult valid(int strengthScore) {
        return new PasswordValidationResult(true, Collections.emptyList(), strengthScore);
    }

    public static PasswordValidationResult invalid(List<String> violations) {
        return new PasswordValidationResult(false, violations, 0);
    }

    // Getters
}

// Update HashedPassword value object
public class HashedPassword {
    private final String value;

    private HashedPassword(String value) {
        this.value = value;
    }

    public static HashedPassword fromRaw(String rawPassword, PasswordValidatorService validator,
                                         PasswordEncoderPort encoder, String email,
                                         String firstName, String lastName) {
        PasswordValidationResult result = validator.validate(rawPassword, email, firstName, lastName);
        if (!result.isValid()) {
            throw new InvalidPasswordException(
                "Password validation failed: " + String.join(", ", result.getViolations())
            );
        }

        return new HashedPassword(encoder.encode(rawPassword));
    }

    public static HashedPassword fromEncoded(String encodedPassword) {
        return new HashedPassword(encodedPassword);
    }

    public String getValue() {
        return value;
    }
}
```

**Configuration** (application.yml):
```yaml
app:
  security:
    password:
      min-length: 12
      max-length: 128
      require-uppercase: true
      require-lowercase: true
      require-digit: true
      require-special-char: true
      min-strength: 3  # 0-4 scale from zxcvbn
```

**Dependencies** (build.gradle):
```gradle
dependencies {
    implementation 'com.nulab-inc:zxcvbn:1.8.2'  // Password strength estimation
}
```

**Common Passwords List** (resources/common-passwords.txt):
```
password
123456
password123
qwerty
admin
letmein
...
```

**Files to Create/Modify**:
- `src/main/java/com/fivucsas/identity/config/PasswordPolicyConfig.java` (NEW)
- `src/main/java/com/fivucsas/identity/service/PasswordValidatorService.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/PasswordValidationResult.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/HashedPassword.java` (MODIFY)
- `src/main/resources/common-passwords.txt` (NEW)

---

## 2. SOLID Principle Compliance

### 2.1 Single Responsibility Principle - Refactor User Entity

**Current Problem**: User.java has 331 lines with multiple responsibilities

**Professional Solution**:

```java
// Separate concerns into multiple classes

// 1. User Entity - ONLY persistence mapping
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "id_number", length = 20)
    private String idNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "is_biometric_enrolled", nullable = false)
    private boolean biometricEnrolled = false;

    @Column(name = "verification_count", nullable = false)
    private int verificationCount = 0;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "last_login_ip", length = 45)
    private String lastLoginIp;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "email_verification_token", length = 255)
    private String emailVerificationToken;

    @Column(name = "password_reset_token", length = 255)
    private String passwordResetToken;

    @Column(name = "password_reset_expires_at")
    private LocalDateTime passwordResetExpiresAt;

    @Column(name = "require_password_change", nullable = false)
    private boolean requirePasswordChange = false;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

// 2. User Domain Model - Business logic and invariants
public class User {
    private final UserId id;
    private final Email email;
    private final FullName name;
    private final HashedPassword password;
    private final UserStatus status;
    private final TenantId tenantId;
    private final UserProfile profile;  // Phone, address, ID number
    private final BiometricStatus biometricStatus;
    private final AccountSecurity security;  // Email verification, password reset, etc.
    private final AuditInfo auditInfo;  // Created, updated, deleted timestamps

    // Constructor with validation
    private User(Builder builder) {
        this.id = builder.id;
        this.email = Objects.requireNonNull(builder.email, "Email is required");
        this.name = Objects.requireNonNull(builder.name, "Name is required");
        this.password = Objects.requireNonNull(builder.password, "Password is required");
        this.status = Objects.requireNonNull(builder.status, "Status is required");
        this.tenantId = Objects.requireNonNull(builder.tenantId, "Tenant ID is required");
        this.profile = builder.profile != null ? builder.profile : UserProfile.empty();
        this.biometricStatus = builder.biometricStatus != null ? builder.biometricStatus : BiometricStatus.notEnrolled();
        this.security = builder.security != null ? builder.security : AccountSecurity.defaults();
        this.auditInfo = builder.auditInfo != null ? builder.auditInfo : AuditInfo.now();
    }

    // Business logic methods
    public void activate() {
        if (this.status == UserStatus.ACTIVE) {
            throw new IllegalStateException("User is already active");
        }
        this.status = UserStatus.ACTIVE;
    }

    public void suspend(String reason) {
        if (this.status == UserStatus.SUSPENDED) {
            throw new IllegalStateException("User is already suspended");
        }
        this.status = UserStatus.SUSPENDED;
        // Publish domain event
    }

    public void enrollBiometric() {
        this.biometricStatus = BiometricStatus.enrolled();
    }

    public void recordVerification() {
        this.biometricStatus = this.biometricStatus.incrementVerificationCount();
    }

    public void changePassword(HashedPassword newPassword) {
        this.password = newPassword;
        this.security = this.security.recordPasswordChange();
    }

    public void recordLogin(String ipAddress) {
        this.auditInfo = this.auditInfo.recordLogin(ipAddress);
    }

    // Getters

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UserId id;
        private Email email;
        private FullName name;
        private HashedPassword password;
        private UserStatus status;
        private TenantId tenantId;
        private UserProfile profile;
        private BiometricStatus biometricStatus;
        private AccountSecurity security;
        private AuditInfo auditInfo;

        public Builder id(UserId id) { this.id = id; return this; }
        public Builder email(Email email) { this.email = email; return this; }
        public Builder name(FullName name) { this.name = name; return this; }
        public Builder password(HashedPassword password) { this.password = password; return this; }
        public Builder status(UserStatus status) { this.status = status; return this; }
        public Builder tenantId(TenantId tenantId) { this.tenantId = tenantId; return this; }
        public Builder profile(UserProfile profile) { this.profile = profile; return this; }
        public Builder biometricStatus(BiometricStatus status) { this.biometricStatus = status; return this; }
        public Builder security(AccountSecurity security) { this.security = security; return this; }
        public Builder auditInfo(AuditInfo auditInfo) { this.auditInfo = auditInfo; return this; }

        public User build() {
            return new User(this);
        }
    }
}

// 3. Supporting value objects
public class UserProfile {
    private final PhoneNumber phone;
    private final Address address;
    private final IdNumber idNumber;

    public static UserProfile empty() {
        return new UserProfile(null, null, null);
    }

    // Constructor, getters
}

public class BiometricStatus {
    private final boolean enrolled;
    private final int verificationCount;
    private final LocalDateTime enrolledAt;

    public static BiometricStatus notEnrolled() {
        return new BiometricStatus(false, 0, null);
    }

    public static BiometricStatus enrolled() {
        return new BiometricStatus(true, 0, LocalDateTime.now());
    }

    public BiometricStatus incrementVerificationCount() {
        return new BiometricStatus(this.enrolled, this.verificationCount + 1, this.enrolledAt);
    }

    // Constructor, getters
}

public class AccountSecurity {
    private final boolean emailVerified;
    private final boolean requirePasswordChange;
    private final LocalDateTime passwordChangedAt;
    private final PasswordResetToken resetToken;  // Can be null

    public static AccountSecurity defaults() {
        return new AccountSecurity(false, false, null, null);
    }

    public AccountSecurity recordPasswordChange() {
        return new AccountSecurity(this.emailVerified, false, LocalDateTime.now(), null);
    }

    // Constructor, getters
}

public class AuditInfo {
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final LocalDateTime deletedAt;
    private final LocalDateTime lastLoginAt;
    private final String lastLoginIp;

    public static AuditInfo now() {
        LocalDateTime now = LocalDateTime.now();
        return new AuditInfo(now, now, null, null, null);
    }

    public AuditInfo recordLogin(String ipAddress) {
        return new AuditInfo(
            this.createdAt,
            LocalDateTime.now(),
            this.deletedAt,
            LocalDateTime.now(),
            ipAddress
        );
    }

    // Constructor, getters
}

// 4. Mapper - Convert between domain and entity
@Component
public class UserMapper {

    public UserEntity toEntity(User user) {
        UserEntity entity = new UserEntity();
        entity.setId(user.getId().getValue());
        entity.setEmail(user.getEmail().getValue());
        entity.setPasswordHash(user.getPassword().getValue());
        entity.setFirstName(user.getName().getFirstName());
        entity.setLastName(user.getName().getLastName());
        entity.setStatus(user.getStatus());
        entity.setTenantId(user.getTenantId().getValue());

        // Map profile
        if (user.getProfile() != null) {
            entity.setPhoneNumber(user.getProfile().getPhone() != null ?
                user.getProfile().getPhone().getValue() : null);
            entity.setAddress(user.getProfile().getAddress() != null ?
                user.getProfile().getAddress().getFullAddress() : null);
            entity.setIdNumber(user.getProfile().getIdNumber() != null ?
                user.getProfile().getIdNumber().getValue() : null);
        }

        // Map biometric status
        entity.setBiometricEnrolled(user.getBiometricStatus().isEnrolled());
        entity.setVerificationCount(user.getBiometricStatus().getVerificationCount());

        // Map security
        entity.setEmailVerified(user.getSecurity().isEmailVerified());
        entity.setRequirePasswordChange(user.getSecurity().isRequirePasswordChange());
        entity.setPasswordChangedAt(user.getSecurity().getPasswordChangedAt());

        // Map audit info
        entity.setCreatedAt(user.getAuditInfo().getCreatedAt());
        entity.setUpdatedAt(user.getAuditInfo().getUpdatedAt());
        entity.setDeletedAt(user.getAuditInfo().getDeletedAt());
        entity.setLastLoginAt(user.getAuditInfo().getLastLoginAt());
        entity.setLastLoginIp(user.getAuditInfo().getLastLoginIp());

        return entity;
    }

    public User toDomain(UserEntity entity) {
        return User.builder()
            .id(new UserId(entity.getId()))
            .email(new Email(entity.getEmail()))
            .name(new FullName(entity.getFirstName(), entity.getLastName()))
            .password(HashedPassword.fromEncoded(entity.getPasswordHash()))
            .status(entity.getStatus())
            .tenantId(new TenantId(entity.getTenantId()))
            .profile(new UserProfile(
                entity.getPhoneNumber() != null ? new PhoneNumber(entity.getPhoneNumber()) : null,
                entity.getAddress() != null ? Address.parse(entity.getAddress()) : null,
                entity.getIdNumber() != null ? new IdNumber(entity.getIdNumber()) : null
            ))
            .biometricStatus(new BiometricStatus(
                entity.isBiometricEnrolled(),
                entity.getVerificationCount(),
                null  // Not stored in entity
            ))
            .security(new AccountSecurity(
                entity.isEmailVerified(),
                entity.isRequirePasswordChange(),
                entity.getPasswordChangedAt(),
                null  // Password reset token handled separately
            ))
            .auditInfo(new AuditInfo(
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getDeletedAt(),
                entity.getLastLoginAt(),
                entity.getLastLoginIp()
            ))
            .build();
    }
}
```

**Benefits**:
- **SRP**: Each class has one responsibility
- **Testability**: Can test domain logic without database
- **Maintainability**: Changes to persistence don't affect business logic
- **Type Safety**: Value objects prevent invalid states

**Files to Create**:
- `src/main/java/com/fivucsas/identity/entity/UserEntity.java` (renamed from User.java)
- `src/main/java/com/fivucsas/identity/domain/model/user/User.java` (NEW - domain model)
- `src/main/java/com/fivucsas/identity/domain/model/user/UserProfile.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/BiometricStatus.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/AccountSecurity.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/AuditInfo.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/mapper/UserMapper.java` (NEW)

---

### 2.2 Extract Duplicate Mapping Logic

**Current Problem**: mapToUserResponse() duplicated in 5+ service files

**Professional Solution**:

```java
// UserResponseMapper - Single source of truth
@Component
public class UserResponseMapper {

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
            .id(user.getId().getValue())
            .email(user.getEmail().getValue())
            .firstName(user.getName().getFirstName())
            .lastName(user.getName().getLastName())
            .phoneNumber(user.getProfile().getPhone() != null ?
                user.getProfile().getPhone().getValue() : null)
            .address(user.getProfile().getAddress() != null ?
                user.getProfile().getAddress().getFullAddress() : null)
            .idNumber(user.getProfile().getIdNumber() != null ?
                user.getProfile().getIdNumber().getValue() : null)
            .status(user.getStatus().name())
            .isBiometricEnrolled(user.getBiometricStatus().isEnrolled())
            .verificationCount(user.getBiometricStatus().getVerificationCount())
            .tenantId(user.getTenantId().getValue())
            .createdAt(user.getAuditInfo().getCreatedAt())
            .updatedAt(user.getAuditInfo().getUpdatedAt())
            .lastLoginAt(user.getAuditInfo().getLastLoginAt())
            .lastLoginIp(user.getAuditInfo().getLastLoginIp())
            .build();
    }

    public List<UserResponse> toResponseList(List<User> users) {
        return users.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public PagedResponse<UserResponse> toPagedResponse(Page<User> page) {
        return PagedResponse.<UserResponse>builder()
            .content(toResponseList(page.getContent()))
            .pageNumber(page.getNumber())
            .pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }
}

// Update services to inject mapper
@Service
public class AuthenticateUserService implements AuthenticateUserUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoderPort passwordEncoder;
    private final TokenGenerationPort tokenGenerator;
    private final UserResponseMapper responseMapper;  // INJECT THIS

    public AuthenticateUserService(
        UserRepository userRepository,
        PasswordEncoderPort passwordEncoder,
        TokenGenerationPort tokenGenerator,
        UserResponseMapper responseMapper
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenGenerator = tokenGenerator;
        this.responseMapper = responseMapper;
    }

    @Override
    public AuthResponse execute(AuthenticateUserCommand command) {
        User user = userRepository.findByEmail(new Email(command.email()))
            .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        String accessToken = tokenGenerator.generateAccessToken(user.getEmail().getValue());
        String refreshToken = tokenGenerator.generateRefreshToken(user.getEmail().getValue());

        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .expiresIn(3600L)
            .user(responseMapper.toResponse(user))  // USE MAPPER
            .build();
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/application/mapper/UserResponseMapper.java` (NEW)

**Files to Modify** (remove duplicate mapping):
- All service files that currently have mapToUserResponse()

---

## 3. Design Pattern Implementation

### 3.1 Factory Pattern - UserFactory

**Professional Implementation**:

```java
// UserFactory interface
public interface UserFactory {
    User createNewUser(CreateUserCommand command);
    User createFromEntity(UserEntity entity);
}

// Implementation
@Component
public class UserFactoryImpl implements UserFactory {

    private final PasswordValidatorService passwordValidator;
    private final PasswordEncoderPort passwordEncoder;

    public UserFactoryImpl(
        PasswordValidatorService passwordValidator,
        PasswordEncoderPort passwordEncoder
    ) {
        this.passwordValidator = passwordValidator;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User createNewUser(CreateUserCommand command) {
        // Validate password
        HashedPassword password = HashedPassword.fromRaw(
            command.password(),
            passwordValidator,
            passwordEncoder,
            command.email(),
            command.firstName(),
            command.lastName()
        );

        return User.builder()
            .id(UserId.generate())  // Generate new UUID
            .email(new Email(command.email()))
            .name(new FullName(command.firstName(), command.lastName()))
            .password(password)
            .status(UserStatus.ACTIVE)
            .tenantId(new TenantId(command.tenantId()))
            .profile(UserProfile.empty())
            .biometricStatus(BiometricStatus.notEnrolled())
            .security(AccountSecurity.defaults())
            .auditInfo(AuditInfo.now())
            .build();
    }

    @Override
    public User createFromEntity(UserEntity entity) {
        // Delegate to UserMapper
        return new UserMapper().toDomain(entity);
    }
}
```

**Usage in Service**:
```java
@Service
public class RegisterUserService implements RegisterUserUseCase {

    private final UserFactory userFactory;  // INJECT FACTORY
    private final UserRepository userRepository;

    @Override
    public UserResponse execute(RegisterUserCommand command) {
        // Check if user exists
        if (userRepository.existsByEmail(new Email(command.email()))) {
            throw new EmailAlreadyExistsException(command.email());
        }

        // Use factory to create user
        User user = userFactory.createNewUser(command);

        // Save
        User savedUser = userRepository.save(user);

        return responseMapper.toResponse(savedUser);
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/domain/factory/UserFactory.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/factory/UserFactoryImpl.java` (NEW)

---

### 3.2 Strategy Pattern - ID Validation

**Professional Implementation**:

```java
// Strategy interface
public interface IdNumberValidator {
    boolean supports(String country);
    ValidationResult validate(String idNumber);
}

// Turkish ID validator
@Component
public class TurkishIdValidator implements IdNumberValidator {

    private static final String COUNTRY_CODE = "TR";
    private static final int ID_LENGTH = 11;

    @Override
    public boolean supports(String country) {
        return COUNTRY_CODE.equalsIgnoreCase(country);
    }

    @Override
    public ValidationResult validate(String idNumber) {
        if (idNumber == null || idNumber.length() != ID_LENGTH) {
            return ValidationResult.invalid("Turkish ID must be exactly 11 digits");
        }

        if (!idNumber.matches("\\d{11}")) {
            return ValidationResult.invalid("Turkish ID must contain only digits");
        }

        if (idNumber.startsWith("0")) {
            return ValidationResult.invalid("Turkish ID cannot start with 0");
        }

        // Checksum validation
        int[] digits = idNumber.chars()
            .map(c -> c - '0')
            .toArray();

        int sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        int sumEven = digits[1] + digits[3] + digits[5] + digits[7];

        int digit10 = ((sumOdd * 7) - sumEven) % 10;
        int digit11 = (sumOdd + sumEven + digits[9]) % 10;

        if (digits[9] != digit10 || digits[10] != digit11) {
            return ValidationResult.invalid("Invalid Turkish ID checksum");
        }

        return ValidationResult.valid();
    }
}

// US SSN validator
@Component
public class UsSsnValidator implements IdNumberValidator {

    private static final String COUNTRY_CODE = "US";
    private static final Pattern SSN_PATTERN = Pattern.compile("^\\d{3}-\\d{2}-\\d{4}$");

    @Override
    public boolean supports(String country) {
        return COUNTRY_CODE.equalsIgnoreCase(country);
    }

    @Override
    public ValidationResult validate(String idNumber) {
        if (!SSN_PATTERN.matcher(idNumber).matches()) {
            return ValidationResult.invalid("US SSN must be in format XXX-XX-XXXX");
        }

        // Additional SSN rules
        String[] parts = idNumber.split("-");
        if ("000".equals(parts[0]) || "666".equals(parts[0])) {
            return ValidationResult.invalid("Invalid SSN area number");
        }
        if ("00".equals(parts[1])) {
            return ValidationResult.invalid("Invalid SSN group number");
        }
        if ("0000".equals(parts[2])) {
            return ValidationResult.invalid("Invalid SSN serial number");
        }

        return ValidationResult.valid();
    }
}

// Generic/default validator
@Component
public class GenericIdValidator implements IdNumberValidator {

    @Override
    public boolean supports(String country) {
        return true;  // Default fallback
    }

    @Override
    public ValidationResult validate(String idNumber) {
        if (idNumber == null || idNumber.trim().isEmpty()) {
            return ValidationResult.invalid("ID number cannot be empty");
        }

        if (idNumber.length() < 5 || idNumber.length() > 20) {
            return ValidationResult.invalid("ID number must be between 5 and 20 characters");
        }

        return ValidationResult.valid();
    }
}

// Validator registry
@Service
public class IdNumberValidationService {

    private final List<IdNumberValidator> validators;

    public IdNumberValidationService(List<IdNumberValidator> validators) {
        this.validators = validators;
    }

    public ValidationResult validate(String idNumber, String country) {
        IdNumberValidator validator = validators.stream()
            .filter(v -> v.supports(country))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("No validator for country: " + country));

        return validator.validate(idNumber);
    }
}

// Updated IdNumber value object
public class IdNumber {
    private final String value;
    private final String country;

    private IdNumber(String value, String country) {
        this.value = value;
        this.country = country;
    }

    public static IdNumber create(String value, String country, IdNumberValidationService validator) {
        ValidationResult result = validator.validate(value, country);
        if (!result.isValid()) {
            throw new InvalidIdNumberException(result.getMessage());
        }
        return new IdNumber(value, country);
    }

    public String getValue() {
        return value;
    }

    public String getCountry() {
        return country;
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/domain/validation/IdNumberValidator.java` (NEW interface)
- `src/main/java/com/fivucsas/identity/infrastructure/validation/TurkishIdValidator.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/validation/UsSsnValidator.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/validation/GenericIdValidator.java` (NEW)
- `src/main/java/com/fivucsas/identity/service/IdNumberValidationService.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/model/user/IdNumber.java` (MODIFY)

---

### 3.3 Observer Pattern - Domain Events

**Professional Implementation**:

```java
// Domain event base class
public abstract class DomainEvent {
    private final UUID eventId;
    private final LocalDateTime occurredOn;

    protected DomainEvent() {
        this.eventId = UUID.randomUUID();
        this.occurredOn = LocalDateTime.now();
    }

    public UUID getEventId() {
        return eventId;
    }

    public LocalDateTime getOccurredOn() {
        return occurredOn;
    }
}

// Specific events
public class UserRegisteredEvent extends DomainEvent {
    private final UserId userId;
    private final Email email;
    private final TenantId tenantId;

    public UserRegisteredEvent(UserId userId, Email email, TenantId tenantId) {
        super();
        this.userId = userId;
        this.email = email;
        this.tenantId = tenantId;
    }

    // Getters
}

public class BiometricEnrolledEvent extends DomainEvent {
    private final UserId userId;
    private final double qualityScore;

    public BiometricEnrolledEvent(UserId userId, double qualityScore) {
        super();
        this.userId = userId;
        this.qualityScore = qualityScore;
    }

    // Getters
}

public class UserStatusChangedEvent extends DomainEvent {
    private final UserId userId;
    private final UserStatus oldStatus;
    private final UserStatus newStatus;
    private final String reason;

    public UserStatusChangedEvent(UserId userId, UserStatus oldStatus, UserStatus newStatus, String reason) {
        super();
        this.userId = userId;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.reason = reason;
    }

    // Getters
}

// Event publisher port
public interface EventPublisherPort {
    void publish(DomainEvent event);
    <T extends DomainEvent> void publish(List<T> events);
}

// Spring implementation using ApplicationEventPublisher
@Component
public class SpringEventPublisher implements EventPublisherPort {

    private final ApplicationEventPublisher applicationEventPublisher;

    public SpringEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        this.applicationEventPublisher = applicationEventPublisher;
    }

    @Override
    public void publish(DomainEvent event) {
        applicationEventPublisher.publishEvent(event);
    }

    @Override
    public <T extends DomainEvent> void publish(List<T> events) {
        events.forEach(this::publish);
    }
}

// Event listeners
@Component
public class AuditLogEventListener {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogEventListener.class);
    private final AuditLogRepository auditLogRepository;

    public AuditLogEventListener(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @EventListener
    @Async
    public void onUserRegistered(UserRegisteredEvent event) {
        logger.info("User registered: {} at {}", event.getEmail().getValue(), event.getOccurredOn());

        AuditLog log = AuditLog.builder()
            .eventType("USER_REGISTERED")
            .userId(event.getUserId().getValue())
            .details("User " + event.getEmail().getValue() + " registered")
            .timestamp(event.getOccurredOn())
            .build();

        auditLogRepository.save(log);
    }

    @EventListener
    @Async
    public void onBiometricEnrolled(BiometricEnrolledEvent event) {
        logger.info("Biometric enrolled for user: {}", event.getUserId().getValue());

        AuditLog log = AuditLog.builder()
            .eventType("BIOMETRIC_ENROLLED")
            .userId(event.getUserId().getValue())
            .details("Biometric enrolled with quality score: " + event.getQualityScore())
            .timestamp(event.getOccurredOn())
            .build();

        auditLogRepository.save(log);
    }

    @EventListener
    @Async
    public void onUserStatusChanged(UserStatusChangedEvent event) {
        logger.info("User status changed from {} to {}",
            event.getOldStatus(), event.getNewStatus());

        AuditLog log = AuditLog.builder()
            .eventType("USER_STATUS_CHANGED")
            .userId(event.getUserId().getValue())
            .details(String.format("Status changed from %s to %s. Reason: %s",
                event.getOldStatus(), event.getNewStatus(), event.getReason()))
            .timestamp(event.getOccurredOn())
            .build();

        auditLogRepository.save(log);
    }
}

@Component
public class NotificationEventListener {

    private static final Logger logger = LoggerFactory.getLogger(NotificationEventListener.class);
    // In future: inject EmailService

    @EventListener
    @Async
    public void onUserRegistered(UserRegisteredEvent event) {
        // TODO: Send welcome email
        logger.info("Would send welcome email to: {}", event.getEmail().getValue());
    }

    @EventListener
    @Async
    public void onUserStatusChanged(UserStatusChangedEvent event) {
        if (event.getNewStatus() == UserStatus.SUSPENDED) {
            // TODO: Send account suspended notification
            logger.info("Would send suspension notification to user: {}", event.getUserId().getValue());
        }
    }
}

// Update User domain model to collect events
public class User {
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    // ... existing fields and methods

    public void activate() {
        UserStatus oldStatus = this.status;
        this.status = UserStatus.ACTIVE;

        // Record domain event
        domainEvents.add(new UserStatusChangedEvent(
            this.id,
            oldStatus,
            UserStatus.ACTIVE,
            "User activated"
        ));
    }

    public void suspend(String reason) {
        UserStatus oldStatus = this.status;
        this.status = UserStatus.SUSPENDED;

        // Record domain event
        domainEvents.add(new UserStatusChangedEvent(
            this.id,
            oldStatus,
            UserStatus.SUSPENDED,
            reason
        ));
    }

    public List<DomainEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }
}

// Update service to publish events
@Service
public class ManageUserService implements ManageUserUseCase {

    private final UserRepository userRepository;
    private final EventPublisherPort eventPublisher;

    @Override
    @Transactional
    public void suspendUser(UUID userId, String reason) {
        User user = userRepository.findById(new UserId(userId))
            .orElseThrow(() -> new UserNotFoundException(userId));

        user.suspend(reason);

        // Save user
        User savedUser = userRepository.save(user);

        // Publish collected domain events
        eventPublisher.publish(savedUser.getDomainEvents());
        savedUser.clearDomainEvents();
    }
}
```

**Enable Async Processing** (AsyncConfig.java):
```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "eventExecutor")
    public Executor eventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("event-async-");
        executor.initialize();
        return executor;
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/domain/event/DomainEvent.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/event/UserRegisteredEvent.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/event/BiometricEnrolledEvent.java` (NEW)
- `src/main/java/com/fivucsas/identity/domain/event/UserStatusChangedEvent.java` (NEW)
- `src/main/java/com/fivucsas/identity/application/port/output/EventPublisherPort.java` (MODIFY - remove stub)
- `src/main/java/com/fivucsas/identity/infrastructure/adapter/SpringEventPublisher.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/listener/AuditLogEventListener.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/listener/NotificationEventListener.java` (NEW)
- `src/main/java/com/fivucsas/identity/config/AsyncConfig.java` (NEW)

---

## 4. Code Quality Improvements

### 4.1 Extract Constants

**Create Constants Classes**:

```java
// Security constants
public final class SecurityConstants {
    private SecurityConstants() {} // Prevent instantiation

    public static final int BCrypt_WORK_FACTOR = 12;
    public static final long ACCESS_TOKEN_EXPIRATION_MS = 3_600_000L; // 1 hour
    public static final long REFRESH_TOKEN_EXPIRATION_MS = 604_800_000L; // 7 days
    public static final int JWT_SECRET_MIN_LENGTH = 32;
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final int TOKEN_PREFIX_LENGTH = 7;

    // Password policy
    public static final int PASSWORD_MIN_LENGTH = 12;
    public static final int PASSWORD_MAX_LENGTH = 128;
    public static final int PASSWORD_MIN_STRENGTH_SCORE = 3;
}

// Validation constants
public final class ValidationConstants {
    private ValidationConstants() {}

    public static final int EMAIL_MAX_LENGTH = 255;
    public static final int NAME_MIN_LENGTH = 2;
    public static final int NAME_MAX_LENGTH = 100;
    public static final int PHONE_MIN_LENGTH = 10;
    public static final int PHONE_MAX_LENGTH = 20;
    public static final int ADDRESS_MAX_LENGTH = 500;
    public static final int ID_NUMBER_MIN_LENGTH = 5;
    public static final int ID_NUMBER_MAX_LENGTH = 20;
    public static final int TURKISH_ID_LENGTH = 11;
}

// API constants
public final class ApiConstants {
    private ApiConstants() {}

    public static final String API_VERSION = "v1";
    public static final String API_BASE_PATH = "/api/" + API_VERSION;
    public static final String AUTH_PATH = API_BASE_PATH + "/auth";
    public static final String USERS_PATH = API_BASE_PATH + "/users";
    public static final String BIOMETRIC_PATH = API_BASE_PATH + "/biometric";
}
```

**Update Code to Use Constants**:
```java
// Before
if (password.length() < 8) {
    throw new InvalidPasswordException("Password must be at least 8 characters long");
}

// After
if (password.length() < SecurityConstants.PASSWORD_MIN_LENGTH) {
    throw new InvalidPasswordException(
        "Password must be at least " + SecurityConstants.PASSWORD_MIN_LENGTH + " characters long"
    );
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/constants/SecurityConstants.java` (NEW)
- `src/main/java/com/fivucsas/identity/constants/ValidationConstants.java` (NEW)
- `src/main/java/com/fivucsas/identity/constants/ApiConstants.java` (NEW)

---

### 4.2 Remove Dead Code

**Dead Service Layer** - Remove or document deprecation:

```java
// Option 1: Mark as deprecated
@Deprecated(since = "1.1.0", forRemoval = true)
@Service
public class AuthService {
    // ... existing code

    // Add deprecation warning in constructor
    public AuthService(...) {
        logger.warn("═══════════════════════════════════════════════════════");
        logger.warn("  AuthService is DEPRECATED");
        logger.warn("  Use AuthenticateUserUseCase instead");
        logger.warn("  This class will be removed in version 2.0.0");
        logger.warn("═══════════════════════════════════════════════════════");
    }
}

// Option 2: Remove completely (recommended)
// Delete files:
// - src/main/java/com/fivucsas/identity/service/AuthService.java
// - src/main/java/com/fivucsas/identity/service/UserService.java
// - src/main/java/com/fivucsas/identity/service/BiometricService.java
```

**Commented-Out Code** - Remove or enable:

```java
// In IdNumber.java, either enable validation:
public static IdNumber create(String value, String country, IdNumberValidationService validator) {
    ValidationResult result = validator.validate(value, country);
    if (!result.isValid()) {
        throw new InvalidIdNumberException(result.getMessage());
    }
    return new IdNumber(value, country);
}

// Or remove commented code completely:
// DELETE lines 68-113 (commented Turkish ID validation)
```

**Files to Modify/Delete**:
- `src/main/java/com/fivucsas/identity/service/` (DELETE entire directory if removing)
- `src/main/java/com/fivucsas/identity/domain/model/user/IdNumber.java` (CLEAN UP)

---

## 5. Architecture Enhancements

### 5.1 Implement RefreshTokenPort Interface

**Professional Solution**:

```java
// Port interface
public interface RefreshTokenPort {
    RefreshToken create(Email userEmail, String ipAddress, String userAgent);
    Optional<RefreshToken> findByToken(String token);
    void revoke(String token);
    void revokeAllForUser(Email userEmail);
    boolean isValid(String token);
}

// Adapter implementation
@Component
public class RefreshTokenServiceAdapter implements RefreshTokenPort {

    private final RefreshTokenRepository repository;
    private final JwtSecretProvider secretProvider;

    @Value("${jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    public RefreshTokenServiceAdapter(
        RefreshTokenRepository repository,
        JwtSecretProvider secretProvider
    ) {
        this.repository = repository;
        this.secretProvider = secretProvider;
    }

    @Override
    @Transactional
    public RefreshToken create(Email userEmail, String ipAddress, String userAgent) {
        // Generate secure token
        String token = Jwts.builder()
            .setSubject(userEmail.getValue())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
            .signWith(SignatureAlgorithm.HS512, secretProvider.getSecret())
            .compact();

        RefreshToken refreshToken = RefreshToken.builder()
            .token(token)
            .userEmail(userEmail.getValue())
            .expiryDate(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
            .ipAddress(ipAddress)
            .userAgent(userAgent)
            .build();

        return repository.save(refreshToken);
    }

    @Override
    public Optional<RefreshToken> findByToken(String token) {
        return repository.findByToken(token);
    }

    @Override
    @Transactional
    public void revoke(String token) {
        repository.findByToken(token)
            .ifPresent(rt -> {
                rt.setRevoked(true);
                repository.save(rt);
            });
    }

    @Override
    @Transactional
    public void revokeAllForUser(Email userEmail) {
        List<RefreshToken> tokens = repository.findByUserEmail(userEmail.getValue());
        tokens.forEach(rt -> rt.setRevoked(true));
        repository.saveAll(tokens);
    }

    @Override
    public boolean isValid(String token) {
        Optional<RefreshToken> refreshToken = repository.findByToken(token);

        if (refreshToken.isEmpty()) {
            return false;
        }

        RefreshToken rt = refreshToken.get();

        return !rt.isRevoked() && rt.getExpiryDate().isAfter(LocalDateTime.now());
    }
}

// Update services to use port instead of concrete class
@Service
public class RegisterUserService implements RegisterUserUseCase {

    private final UserRepository userRepository;
    private final UserFactory userFactory;
    private final RefreshTokenPort refreshTokenPort;  // USE PORT INTERFACE
    private final EventPublisherPort eventPublisher;

    @Override
    @Transactional
    public AuthResponse execute(RegisterUserCommand command) {
        // ... user creation logic

        // Create refresh token using port
        RefreshToken refreshToken = refreshTokenPort.create(
            user.getEmail(),
            command.ipAddress(),
            command.userAgent()
        );

        // ... rest of logic
    }
}
```

**Files to Create**:
- `src/main/java/com/fivucsas/identity/application/port/output/RefreshTokenPort.java` (NEW)
- `src/main/java/com/fivucsas/identity/infrastructure/adapter/RefreshTokenServiceAdapter.java` (NEW)

**Files to Modify**:
- All services that use RefreshTokenService directly

---

## 6. Implementation Roadmap

### Week 1: Critical Security Fixes (2-3 days)

**Day 1-2: Security Hardening**
- [ ] Move JWT secret to environment variable (2h)
- [ ] Remove default admin password (2h)
- [ ] Disable H2 console in production (2h)
- [ ] Remove JWT token logging (1h)
- [ ] Add password strength validation (3h)

**Day 3: Rate Limiting**
- [ ] Add Bucket4j dependency (15min)
- [ ] Implement RateLimitService (2h)
- [ ] Create RateLimitInterceptor (2h)
- [ ] Add rate limit to auth endpoints (1h)
- [ ] Test rate limiting (1h)

**Testing & Verification** (Day 3 afternoon):
- [ ] Security audit of changes
- [ ] Integration tests for rate limiting
- [ ] Verify H2 console disabled in prod profile
- [ ] Verify JWT secret from environment

---

### Week 2-3: SOLID Refactoring (8-10 days)

**Phase 1: User Entity Refactoring** (3 days)
- [ ] Create UserEntity (persistence only) (4h)
- [ ] Create User domain model (6h)
- [ ] Create value objects (UserProfile, BiometricStatus, etc.) (4h)
- [ ] Create UserMapper (4h)
- [ ] Update repositories to use new structure (4h)
- [ ] Update services to use domain model (6h)
- [ ] Write tests for domain model (4h)

**Phase 2: Extract Duplicate Code** (2 days)
- [ ] Create UserResponseMapper (2h)
- [ ] Update all services to use mapper (4h)
- [ ] Create RequestMetadataExtractor (2h)
- [ ] Update controllers to use extractor (2h)
- [ ] Remove duplicate mapping methods (2h)
- [ ] Write tests (2h)

**Phase 3: Design Patterns** (3-4 days)
- [ ] Implement UserFactory (4h)
- [ ] Implement Strategy pattern for ID validation (6h)
- [ ] Implement Observer pattern for domain events (8h)
- [ ] Create event listeners (audit, notification) (4h)
- [ ] Enable async event processing (2h)
- [ ] Write integration tests (4h)

**Phase 4: Code Quality** (1-2 days)
- [ ] Extract constants to dedicated classes (3h)
- [ ] Remove dead service layer (2h)
- [ ] Clean up commented code (1h)
- [ ] Update documentation (2h)

---

### Week 4: Architecture & Polish (3-4 days)

**Day 1-2: Architecture**
- [ ] Create RefreshTokenPort interface (2h)
- [ ] Create RefreshTokenServiceAdapter (3h)
- [ ] Update services to use port (3h)
- [ ] Split UserRepository interfaces (4h)
- [ ] Write tests (3h)

**Day 3: Integration Testing**
- [ ] E2E tests for auth flow (4h)
- [ ] E2E tests for user management (4h)
- [ ] Performance testing (3h)

**Day 4: Documentation & Review**
- [ ] Update architecture documentation (2h)
- [ ] Create migration guide (2h)
- [ ] Code review and adjustments (4h)
- [ ] Final testing (2h)

---

## Total Effort Estimate

| Phase | Duration | Developer Days |
|-------|----------|----------------|
| Critical Security | 3 days | 3 |
| SOLID Refactoring | 8-10 days | 10 |
| Architecture & Polish | 3-4 days | 4 |
| **Total** | **14-17 days** | **17** |

**Team Recommendation**: 2 developers for 2-3 weeks

---

## Success Criteria

### Security
- [x] No hardcoded secrets in code
- [x] No default credentials
- [x] H2 console disabled in production
- [x] No sensitive data in logs
- [x] Rate limiting active on auth endpoints
- [x] Strong password policy enforced

### SOLID Compliance
- [x] No God Objects (User entity refactored)
- [x] No duplicate code (mapping centralized)
- [x] Proper abstractions (ports defined)
- [x] Interface segregation (repositories split)
- [x] Dependency inversion (all ports injected)

### Code Quality
- [x] No magic numbers
- [x] No dead code
- [x] Consistent naming
- [x] Proper documentation
- [x] 80%+ test coverage

### Architecture
- [x] Hexagonal architecture complete
- [x] Domain events implemented
- [x] Design patterns applied (Factory, Strategy, Observer)
- [x] Clean separation of concerns

---

**Next Steps**:
1. Review and approve this design document
2. Create implementation branches
3. Begin Week 1 security fixes
4. Regular code reviews during implementation
5. Update this document as design evolves

**Document Version**: 1.0
**Last Updated**: 2025-01-24
**Author**: FIVUCSAS Development Team
