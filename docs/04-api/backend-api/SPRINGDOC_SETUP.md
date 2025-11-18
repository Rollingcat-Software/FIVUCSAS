# Backend API - Complete Implementation Package

**Repository:** identity-core-api
**Time Required:** 1-2 hours
**Status:** Ready to apply

---

## Step 1: Add SpringDoc OpenAPI Dependency

**File:** `build.gradle` or `build.gradle.kts`

### For Gradle (Groovy):
```groovy
dependencies {
    // Existing dependencies...

    // SpringDoc OpenAPI - Auto-generated API documentation
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0'
}
```

### For Gradle (Kotlin DSL):
```kotlin
dependencies {
    // Existing dependencies...

    // SpringDoc OpenAPI - Auto-generated API documentation
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")
}
```

**Test:**
```bash
./gradlew clean build
# Should compile successfully
```

---

## Step 2: Create OpenAPI Configuration

**File:** `src/main/java/com/fivucsas/identity/config/OpenAPIConfig.java`

```java
package com.fivucsas.identity.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 configuration for FIVUCSAS API documentation.
 *
 * Auto-generates interactive API documentation accessible at:
 * - Swagger UI: http://localhost:8080/swagger-ui/index.html
 * - OpenAPI JSON: http://localhost:8080/v3/api-docs
 * - OpenAPI YAML: http://localhost:8080/v3/api-docs.yaml
 *
 * @author FIVUCSAS Team
 * @version 1.0.0
 */
@Configuration
public class OpenAPIConfig {

    @Bean
    public OpenAPI fivucsasOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("FIVUCSAS API")
                .version("1.0.0")
                .description("""
                    # Face and Identity Verification Using Cloud-based SaaS

                    Multi-tenant biometric authentication platform for face recognition,
                    liveness detection, and identity management.

                    ## Features
                    * **User Management** - Complete CRUD operations for users
                    * **JWT Authentication** - Secure token-based authentication
                    * **Biometric Enrollment** - Face embedding extraction and storage
                    * **Biometric Verification** - Face matching with liveness detection
                    * **Multi-tenant Support** - Tenant isolation and management (planned)
                    * **Audit Logging** - Comprehensive activity tracking

                    ## Authentication
                    Most endpoints require JWT authentication. To authenticate:

                    1. Call `POST /api/v1/auth/login` with email and password
                    2. Receive JWT token in response
                    3. Include token in subsequent requests:
                    ```
                    Authorization: Bearer <your-jwt-token>
                    ```

                    ## Rate Limiting
                    Currently not implemented. Planned for production deployment.

                    ## Error Responses
                    All endpoints return standard HTTP status codes:
                    - `200` - Success
                    - `201` - Resource created
                    - `400` - Bad request (validation errors)
                    - `401` - Unauthorized (missing/invalid token)
                    - `403` - Forbidden (insufficient permissions)
                    - `404` - Resource not found
                    - `409` - Conflict (duplicate resource)
                    - `500` - Internal server error

                    ## Pagination
                    List endpoints support pagination with query parameters:
                    - `page` - Page number (0-indexed)
                    - `size` - Items per page (default: 20)
                    - `sort` - Sort field and direction (e.g., `createdAt,desc`)

                    ## Project Information
                    - **University:** Marmara University
                    - **Department:** Computer Engineering
                    - **Course:** Engineering Project (CSE4297)
                    - **Type:** Multi-tenant Biometric SaaS Platform
                    """)
                .contact(new Contact()
                    .name("FIVUCSAS Team")
                    .email("contact@fivucsas.com")
                    .url("https://github.com/Rollingcat-Software/FIVUCSAS"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8080")
                    .description("Local Development Server"),
                new Server()
                    .url("http://localhost:8080/api")
                    .description("Local Development Server (with /api prefix)"),
                new Server()
                    .url("https://api.fivucsas.com")
                    .description("Production Server (Future)")
            ))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new io.swagger.v3.oas.models.Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT authentication token. Obtain by calling POST /api/v1/auth/login")));
    }
}
```

---

## Step 3: Configure Application Properties

**File:** `src/main/resources/application.properties`

Add these configurations:

```properties
# ===================================================================
# SPRINGDOC OPENAPI CONFIGURATION
# ===================================================================

# API Documentation paths
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.swagger-ui.enabled=true

# Swagger UI customization
springdoc.swagger-ui.operationsSorter=method
springdoc.swagger-ui.tagsSorter=alpha
springdoc.swagger-ui.tryItOutEnabled=true
springdoc.swagger-ui.filter=true
springdoc.swagger-ui.displayRequestDuration=true
springdoc.swagger-ui.defaultModelsExpandDepth=1
springdoc.swagger-ui.defaultModelExpandDepth=1
springdoc.swagger-ui.displayOperationId=false
springdoc.swagger-ui.docExpansion=none

# Disable Spring Boot actuator endpoints in API docs
springdoc.show-actuator=false

# Group API endpoints by package
springdoc.group-configs[0].group=authentication
springdoc.group-configs[0].paths-to-match=/api/v1/auth/**
springdoc.group-configs[1].group=users
springdoc.group-configs[1].paths-to-match=/api/v1/users/**
springdoc.group-configs[2].group=biometric
springdoc.group-configs[2].paths-to-match=/api/v1/biometric/**

# Enable pretty-print for JSON responses
spring.jackson.serialization.indent-output=true
```

---

## Step 4: Add Annotations to AuthController

**File:** `src/main/java/com/fivucsas/identity/controller/AuthController.java`

### Add Imports:
```java
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
```

### Add Class-Level Annotation:
```java
@RestController
@RequestMapping("/api/v1/auth")
@Tag(
    name = "Authentication",
    description = "User authentication and authorization endpoints. Handles login, registration, and JWT token management."
)
public class AuthController {
    // ...
}
```

### Add Method Annotations:

#### Login Endpoint:
```java
@PostMapping("/login")
@Operation(
    summary = "User login",
    description = """
        Authenticates a user with email and password credentials.

        Returns a JWT token and user information on successful authentication.
        The token should be included in the Authorization header for subsequent requests.

        **Security:** No authentication required (public endpoint)

        **Example Request:**
        ```json
        {
          "email": "user@example.com",
          "password": "SecurePassword123!"
        }
        ```
        """,
    tags = {"Authentication"}
)
@ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Login successful. Returns JWT token and user information.",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = AuthResponse.class),
            examples = @ExampleObject(
                name = "Successful Login",
                value = """
                {
                  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  "type": "Bearer",
                  "userId": "123e4567-e89b-12d3-a456-426614174000",
                  "email": "user@example.com",
                  "firstName": "John",
                  "lastName": "Doe",
                  "role": "USER",
                  "expiresIn": 86400
                }
                """
            )
        )
    ),
    @ApiResponse(
        responseCode = "401",
        description = "Authentication failed. Invalid email or password.",
        content = @Content(
            mediaType = "application/json",
            examples = @ExampleObject(
                value = """
                {
                  "timestamp": "2025-11-17T10:30:00.000+00:00",
                  "status": 401,
                  "error": "Unauthorized",
                  "message": "Invalid email or password",
                  "path": "/api/v1/auth/login"
                }
                """
            )
        )
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Bad request. Invalid input format or missing required fields.",
        content = @Content(
            mediaType = "application/json",
            examples = @ExampleObject(
                value = """
                {
                  "timestamp": "2025-11-17T10:30:00.000+00:00",
                  "status": 400,
                  "error": "Bad Request",
                  "message": "Validation failed",
                  "errors": {
                    "email": "must be a well-formed email address",
                    "password": "must not be blank"
                  }
                }
                """
            )
        )
    )
})
public ResponseEntity<AuthResponse> login(
    @Parameter(
        description = "Login credentials containing email and password",
        required = true,
        example = """
        {
          "email": "user@example.com",
          "password": "SecurePassword123!"
        }
        """
    )
    @Valid @RequestBody LoginRequest request
) {
    // Existing implementation...
}
```

#### Register Endpoint:
```java
@PostMapping("/register")
@Operation(
    summary = "Register new user",
    description = """
        Creates a new user account with the provided information.

        **Validation Rules:**
        - Email must be unique and valid format
        - Password minimum 8 characters, must contain uppercase, lowercase, number, special char
        - First name and last name required (2-50 characters)
        - Phone number optional (E.164 format: +[country code][number])
        - National ID optional (11 digits for Turkey)

        **Security:** No authentication required (public endpoint)

        **Example Request:**
        ```json
        {
          "email": "newuser@example.com",
          "password": "SecurePassword123!",
          "firstName": "Jane",
          "lastName": "Smith",
          "phoneNumber": "+905551234567",
          "idNumber": "12345678901"
        }
        ```
        """,
    tags = {"Authentication"}
)
@ApiResponses({
    @ApiResponse(
        responseCode = "201",
        description = "User registered successfully. Returns JWT token and user information.",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = AuthResponse.class)
        )
    ),
    @ApiResponse(
        responseCode = "409",
        description = "Conflict. Email already exists in the system.",
        content = @Content(
            mediaType = "application/json",
            examples = @ExampleObject(
                value = """
                {
                  "timestamp": "2025-11-17T10:30:00.000+00:00",
                  "status": 409,
                  "error": "Conflict",
                  "message": "Email already exists",
                  "path": "/api/v1/auth/register"
                }
                """
            )
        )
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Bad request. Validation errors in input data."
    )
})
public ResponseEntity<AuthResponse> register(
    @Parameter(
        description = "User registration data with all required fields",
        required = true
    )
    @Valid @RequestBody RegisterRequest request
) {
    // Existing implementation...
}
```

---

## Step 5: Add Annotations to UserController

**File:** `src/main/java/com/fivucsas/identity/controller/UserController.java`

### Class-Level Annotation:
```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(
    name = "User Management",
    description = "CRUD operations for managing user accounts. Requires ADMIN role for most operations."
)
public class UserController {
    // ...
}
```

### Method Annotations:

```java
@GetMapping
@Operation(
    summary = "Get all users",
    description = """
        Retrieves a paginated list of all registered users in the system.

        **Required Permission:** ADMIN role

        **Pagination:** Supports pagination with query parameters:
        - `page`: Page number (0-indexed, default: 0)
        - `size`: Items per page (default: 20, max: 100)
        - `sort`: Sort field and direction (e.g., `createdAt,desc`)

        **Filtering:** Supports filtering by:
        - `status`: User status (ACTIVE, INACTIVE, SUSPENDED)
        - `search`: Search in email, first name, last name
        - `enrolled`: Filter by biometric enrollment status (true/false)

        **Use Cases:**
        - Admin dashboard user list
        - User management interface
        - Reporting and analytics
        """
)
@ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Successfully retrieved user list",
        content = @Content(
            mediaType = "application/json",
            array = @io.swagger.v3.oas.annotations.media.ArraySchema(
                schema = @Schema(implementation = UserDTO.class)
            )
        )
    ),
    @ApiResponse(
        responseCode = "403",
        description = "Forbidden. Requires ADMIN role."
    )
})
@SecurityRequirement(name = "bearerAuth")
public ResponseEntity<List<UserDTO>> getAllUsers(
    @Parameter(description = "Page number (0-indexed)", example = "0")
    @RequestParam(defaultValue = "0") int page,

    @Parameter(description = "Page size", example = "20")
    @RequestParam(defaultValue = "20") int size,

    @Parameter(description = "Sort field and direction", example = "createdAt,desc")
    @RequestParam(required = false) String sort,

    @Parameter(description = "Filter by status", example = "ACTIVE")
    @RequestParam(required = false) String status,

    @Parameter(description = "Search query", example = "john")
    @RequestParam(required = false) String search
) {
    // Existing implementation...
}

@GetMapping("/{id}")
@Operation(
    summary = "Get user by ID",
    description = """
        Retrieves detailed information about a specific user.

        **Required Permission:** ADMIN role or own user ID

        **Returns:** Complete user profile including:
        - Basic information (name, email, phone)
        - Account status and role
        - Biometric enrollment status
        - Statistics (verification count)
        - Timestamps (created, updated)

        **Use Cases:**
        - User profile page
        - User details view
        - Account management
        """
)
@ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "User found and returned successfully",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = UserDTO.class)
        )
    ),
    @ApiResponse(
        responseCode = "404",
        description = "User not found with the provided ID"
    ),
    @ApiResponse(
        responseCode = "403",
        description = "Forbidden. Not authorized to view this user."
    )
})
@SecurityRequirement(name = "bearerAuth")
public ResponseEntity<UserDTO> getUserById(
    @Parameter(
        description = "User ID (UUID format)",
        required = true,
        example = "123e4567-e89b-12d3-a456-426614174000"
    )
    @PathVariable UUID id
) {
    // Existing implementation...
}

@PostMapping
@Operation(
    summary = "Create new user",
    description = """
        Creates a new user account with the provided information.

        **Required Permission:** ADMIN role

        **Validation Rules:**
        - Email must be unique and valid format
        - Password minimum 8 characters
        - First name and last name required (2-50 characters)
        - Phone number optional (E.164 format)
        - ID number optional (11 digits for Turkey)
        - Default status: ACTIVE
        - Default role: USER

        **Returns:** Created user object with generated UUID

        **Use Cases:**
        - Admin creating new users
        - Bulk user import
        - Self-registration (via /auth/register)
        """
)
@ApiResponses({
    @ApiResponse(
        responseCode = "201",
        description = "User created successfully",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = UserDTO.class)
        )
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Bad request. Invalid input data or validation errors."
    ),
    @ApiResponse(
        responseCode = "409",
        description = "Conflict. Email already exists in the system."
    ),
    @ApiResponse(
        responseCode = "403",
        description = "Forbidden. Requires ADMIN role."
    )
})
@SecurityRequirement(name = "bearerAuth")
public ResponseEntity<UserDTO> createUser(
    @Parameter(
        description = "User creation request with all required fields",
        required = true
    )
    @Valid @RequestBody CreateUserRequest request
) {
    // Existing implementation...
}

@PutMapping("/{id}")
@Operation(
    summary = "Update user",
    description = """
        Updates an existing user's information.

        **Required Permission:** ADMIN role or own user ID

        **Updatable Fields:**
        - First name, last name
        - Phone number
        - ID number
        - Status (ADMIN only)
        - Role (ADMIN only)

        **Non-Updatable Fields:**
        - Email (create new account instead)
        - Password (use /auth/change-password)
        - Biometric data (use /biometric endpoints)
        - Created timestamp

        **Partial Updates:** Supported - only provided fields are updated
        """
)
@ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "User updated successfully",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = UserDTO.class)
        )
    ),
    @ApiResponse(
        responseCode = "404",
        description = "User not found with the provided ID"
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Bad request. Invalid input data."
    ),
    @ApiResponse(
        responseCode = "403",
        description = "Forbidden. Not authorized to update this user."
    )
})
@SecurityRequirement(name = "bearerAuth")
public ResponseEntity<UserDTO> updateUser(
    @Parameter(
        description = "User ID to update",
        required = true,
        example = "123e4567-e89b-12d3-a456-426614174000"
    )
    @PathVariable UUID id,

    @Parameter(
        description = "User update data (partial updates supported)",
        required = true
    )
    @Valid @RequestBody UpdateUserRequest request
) {
    // Existing implementation...
}

@DeleteMapping("/{id}")
@Operation(
    summary = "Delete user",
    description = """
        Soft deletes a user account (marks as INACTIVE rather than permanent deletion).

        **Required Permission:** ADMIN role

        **Behavior:**
        - Sets user status to INACTIVE
        - Preserves all data for audit purposes
        - Prevents user login
        - Biometric data retained but disabled

        **Hard Delete:** Not supported (use database direct access for GDPR compliance)

        **Use Cases:**
        - Account deactivation
        - User termination
        - Temporary suspension
        """
)
@ApiResponses({
    @ApiResponse(
        responseCode = "204",
        description = "User deleted (deactivated) successfully"
    ),
    @ApiResponse(
        responseCode = "404",
        description = "User not found with the provided ID"
    ),
    @ApiResponse(
        responseCode = "403",
        description = "Forbidden. Requires ADMIN role."
    )
})
@SecurityRequirement(name = "bearerAuth")
public ResponseEntity<Void> deleteUser(
    @Parameter(
        description = "User ID to delete",
        required = true,
        example = "123e4567-e89b-12d3-a456-426614174000"
    )
    @PathVariable UUID id
) {
    // Existing implementation...
}
```

---

## Step 6: Add Annotations to DTOs

### UserDTO.java

**File:** `src/main/java/com/fivucsas/identity/dto/UserDTO.java`

```java
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.UUID;

@Schema(
    description = "User data transfer object containing complete user information",
    example = """
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+905551234567",
      "idNumber": "12345678901",
      "status": "ACTIVE",
      "role": "USER",
      "isBiometricEnrolled": true,
      "verificationCount": 42,
      "createdAt": "2025-01-15T10:30:00",
      "updatedAt": "2025-11-17T10:30:00"
    }
    """
)
public class UserDTO {

    @Schema(
        description = "Unique user identifier in UUID format",
        example = "123e4567-e89b-12d3-a456-426614174000",
        accessMode = Schema.AccessMode.READ_ONLY,
        format = "uuid"
    )
    private UUID id;

    @Schema(
        description = "User email address (unique, used for login)",
        example = "john.doe@example.com",
        required = true,
        maxLength = 255,
        format = "email"
    )
    private String email;

    @Schema(
        description = "User first name",
        example = "John",
        required = true,
        minLength = 2,
        maxLength = 50
    )
    private String firstName;

    @Schema(
        description = "User last name",
        example = "Doe",
        required = true,
        minLength = 2,
        maxLength = 50
    )
    private String lastName;

    @Schema(
        description = "User phone number in E.164 international format",
        example = "+905551234567",
        pattern = "^\\+[1-9]\\d{1,14}$",
        nullable = true
    )
    private String phoneNumber;

    @Schema(
        description = "National identification number (Turkey: 11 digits)",
        example = "12345678901",
        minLength = 11,
        maxLength = 11,
        pattern = "^\\d{11}$",
        nullable = true
    )
    private String idNumber;

    @Schema(
        description = "User account status",
        example = "ACTIVE",
        allowableValues = {"ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"},
        defaultValue = "ACTIVE"
    )
    private String status;

    @Schema(
        description = "User role (permission level)",
        example = "USER",
        allowableValues = {"USER", "ADMIN", "SUPER_ADMIN"},
        defaultValue = "USER"
    )
    private String role;

    @Schema(
        description = "Whether user has completed biometric face enrollment",
        example = "true",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private Boolean isBiometricEnrolled;

    @Schema(
        description = "Total number of successful biometric verifications",
        example = "42",
        accessMode = Schema.AccessMode.READ_ONLY,
        minimum = "0"
    )
    private Integer verificationCount;

    @Schema(
        description = "Timestamp when user account was created",
        example = "2025-01-15T10:30:00",
        accessMode = Schema.AccessMode.READ_ONLY,
        format = "date-time"
    )
    private LocalDateTime createdAt;

    @Schema(
        description = "Timestamp when user account was last updated",
        example = "2025-11-17T10:30:00",
        accessMode = Schema.AccessMode.READ_ONLY,
        format = "date-time"
    )
    private LocalDateTime updatedAt;

    // Getters, setters, constructors, equals, hashCode, toString...
}
```

### LoginRequest.java

```java
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Login request containing user credentials")
public class LoginRequest {

    @Schema(
        description = "User email address",
        example = "user@example.com",
        required = true,
        format = "email"
    )
    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    private String email;

    @Schema(
        description = "User password (minimum 8 characters)",
        example = "SecurePassword123!",
        required = true,
        format = "password",
        minLength = 8
    )
    @NotBlank(message = "Password is required")
    private String password;

    // Getters, setters, constructors...
}
```

### AuthResponse.java

```java
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Authentication response containing JWT token and user information")
public class AuthResponse {

    @Schema(
        description = "JWT authentication token",
        example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        required = true
    )
    private String token;

    @Schema(
        description = "Token type (always 'Bearer')",
        example = "Bearer",
        defaultValue = "Bearer"
    )
    private String type = "Bearer";

    @Schema(
        description = "User ID",
        example = "123e4567-e89b-12d3-a456-426614174000",
        format = "uuid"
    )
    private UUID userId;

    @Schema(
        description = "User email",
        example = "user@example.com"
    )
    private String email;

    @Schema(
        description = "User first name",
        example = "John"
    )
    private String firstName;

    @Schema(
        description = "User last name",
        example = "Doe"
    )
    private String lastName;

    @Schema(
        description = "User role",
        example = "USER",
        allowableValues = {"USER", "ADMIN"}
    )
    private String role;

    @Schema(
        description = "Token expiration time in seconds",
        example = "86400",
        minimum = "0"
    )
    private Long expiresIn;

    // Getters, setters, constructors...
}
```

---

## Step 7: Test the Implementation

```bash
# Start the backend
cd identity-core-api
./gradlew bootRun
```

**Access Points:**
- **Swagger UI:** http://localhost:8080/swagger-ui/index.html
- **OpenAPI JSON:** http://localhost:8080/v3/api-docs
- **OpenAPI YAML:** http://localhost:8080/v3/api-docs.yaml

**Verification Checklist:**
- [ ] Swagger UI loads successfully
- [ ] All controllers appear (Authentication, User Management, Biometric)
- [ ] All endpoints documented with descriptions
- [ ] Request/response schemas visible
- [ ] Examples are helpful
- [ ] "Try it out" functionality works
- [ ] Authentication section shows JWT bearer token input
- [ ] Error responses documented

---

## Expected Result

Once implemented, you'll have:

✅ **Professional API Documentation**
- Interactive Swagger UI interface
- Complete endpoint documentation
- Request/response examples
- Authentication flows
- Error scenarios

✅ **Zero Maintenance**
- Auto-generated from code annotations
- Always in sync with actual implementation
- No manual YAML files to maintain

✅ **Developer-Friendly**
- "Try it out" for testing endpoints
- Exportable OpenAPI specification
- Client code generation support

---

## Troubleshooting

### Issue: Swagger UI not loading
**Solution:**
```bash
# Check if dependency is added
./gradlew dependencies | grep springdoc

# Verify application starts
./gradlew bootRun | grep "Swagger"
```

### Issue: Endpoints not appearing
**Solution:**
- Ensure @RestController annotation is present
- Verify @RequestMapping paths are correct
- Check component scanning includes controller package

### Issue: Authentication not working in Swagger UI
**Solution:**
1. Click "Authorize" button in Swagger UI
2. Enter: `Bearer <your-jwt-token>`
3. Click "Authorize"
4. Close dialog
5. Try endpoints

---

**Estimated Time:** 1-2 hours
**Difficulty:** Easy (copy-paste code)
**Result:** Professional, auto-generated API documentation

✅ **This package is ready to apply to identity-core-api repository!**
