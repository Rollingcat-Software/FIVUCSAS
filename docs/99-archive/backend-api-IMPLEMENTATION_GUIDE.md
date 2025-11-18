# Backend API Documentation Implementation Guide

This guide provides step-by-step instructions to add auto-generated API documentation to the `identity-core-api` backend.

## Prerequisites

- Identity-core-api repository cloned
- Java 21 installed
- Gradle working

## Step 1: Add SpringDoc OpenAPI Dependency

**File:** `identity-core-api/build.gradle`

Add this dependency to the `dependencies` section:

```groovy
dependencies {
    // ... existing dependencies

    // SpringDoc OpenAPI for auto-generated API documentation
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0'
}
```

**Test:**
```bash
cd identity-core-api
./gradlew clean build
```

Expected: Build succeeds

## Step 2: Create OpenAPI Configuration

**File:** `identity-core-api/src/main/java/com/fivucsas/identity/config/OpenAPIConfig.java`

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
 * OpenAPI 3.0 configuration for auto-generating API documentation.
 *
 * Accessible at:
 * - Swagger UI: http://localhost:8080/swagger-ui/index.html
 * - OpenAPI JSON: http://localhost:8080/v3/api-docs
 * - OpenAPI YAML: http://localhost:8080/v3/api-docs.yaml
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
                    * User management (CRUD operations)
                    * JWT-based authentication
                    * Biometric enrollment and verification
                    * Multi-tenant support (planned)
                    * Comprehensive audit logging

                    ## Authentication
                    Most endpoints require JWT authentication. Obtain a token by calling `/api/v1/auth/login`,
                    then include it in the Authorization header:
                    ```
                    Authorization: Bearer <your-jwt-token>
                    ```

                    ## Error Handling
                    All endpoints return standard HTTP status codes:
                    - 200: Success
                    - 201: Created
                    - 400: Bad Request (validation errors)
                    - 401: Unauthorized (missing or invalid token)
                    - 403: Forbidden (insufficient permissions)
                    - 404: Not Found
                    - 409: Conflict (duplicate resource)
                    - 500: Internal Server Error

                    ## Rate Limiting
                    Currently not implemented. Planned for production deployment.
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
                    .description("Development Server"),
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
                        .description("JWT authentication. Obtain token from /api/v1/auth/login")));
    }
}
```

## Step 3: Add Annotations to Controllers (Example)

**File:** `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java`

Add these imports:
```java
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
```

Add class-level annotation:
```java
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "User authentication and authorization endpoints")
public class AuthController {
    // ...
}
```

Add method-level annotations:
```java
@PostMapping("/login")
@Operation(
    summary = "User login",
    description = "Authenticate a user with email and password. Returns JWT token and user details on success."
)
@ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Login successful. Returns JWT token and user information.",
        content = @Content(
            mediaType = "application/json",
            schema = @Schema(implementation = AuthResponse.class)
        )
    ),
    @ApiResponse(
        responseCode = "401",
        description = "Authentication failed. Invalid email or password."
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Bad request. Invalid input format or missing required fields."
    )
})
public ResponseEntity<AuthResponse> login(
    @Parameter(description = "Login credentials with email and password", required = true)
    @Valid @RequestBody LoginRequest request
) {
    // ... existing implementation
}
```

Repeat for all controllers:
- `AuthController`
- `UserController`
- `BiometricController`
- Any other controllers

## Step 4: Add Annotations to DTOs (Example)

**File:** `identity-core-api/src/main/java/com/fivucsas/identity/dto/UserDTO.java`

```java
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "User data transfer object containing user information")
public class UserDTO {

    @Schema(
        description = "Unique user identifier (UUID format)",
        example = "123e4567-e89b-12d3-a456-426614174000",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private UUID id;

    @Schema(
        description = "User email address (must be unique in the system)",
        example = "john.doe@example.com",
        required = true,
        maxLength = 255
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
        description = "User phone number in E.164 format",
        example = "+905551234567",
        pattern = "^\\+[1-9]\\d{1,14}$"
    )
    private String phoneNumber;

    @Schema(
        description = "National ID number (Turkey: 11 digits)",
        example = "12345678901",
        minLength = 11,
        maxLength = 11
    )
    private String idNumber;

    @Schema(
        description = "User account status",
        example = "ACTIVE",
        allowableValues = {"ACTIVE", "INACTIVE", "SUSPENDED"}
    )
    private String status;

    @Schema(
        description = "Whether user has completed biometric enrollment",
        example = "true",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private Boolean isBiometricEnrolled;

    @Schema(
        description = "Number of successful biometric verifications",
        example = "42",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private Integer verificationCount;

    @Schema(
        description = "Timestamp when user was created",
        example = "2025-11-17T10:30:00Z",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private LocalDateTime createdAt;

    @Schema(
        description = "Timestamp when user was last updated",
        example = "2025-11-17T10:30:00Z",
        accessMode = Schema.AccessMode.READ_ONLY
    )
    private LocalDateTime updatedAt;

    // Getters, setters, constructors...
}
```

Repeat for all DTOs.

## Step 5: Configure Application Properties (Optional)

**File:** `identity-core-api/src/main/resources/application.properties`

Add these configurations:

```properties
# OpenAPI / Swagger Configuration
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.swagger-ui.operationsSorter=method
springdoc.swagger-ui.tagsSorter=alpha
springdoc.swagger-ui.tryItOutEnabled=true
springdoc.swagger-ui.filter=true
springdoc.swagger-ui.displayRequestDuration=true

# Show request/response examples
springdoc.show-actuator=false
```

## Step 6: Test the Documentation

```bash
# Start the backend
cd identity-core-api
./gradlew bootRun
```

**Access Points:**
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs
- OpenAPI YAML: http://localhost:8080/v3/api-docs.yaml

**Verification Checklist:**
- [ ] Swagger UI loads successfully
- [ ] All controllers appear in navigation
- [ ] All endpoints are documented
- [ ] Request/response schemas visible
- [ ] "Try it out" functionality works
- [ ] Authentication section shows JWT bearer token
- [ ] Examples are helpful and accurate

## Benefits

✅ **Zero maintenance** - Auto-generated from code
✅ **Always accurate** - Reflects current API state
✅ **Interactive testing** - Try endpoints directly from browser
✅ **Client generation** - Export OpenAPI spec for code generation
✅ **Single source of truth** - Code annotations → documentation

## Troubleshooting

### Swagger UI not loading
- Check SpringDoc dependency is added
- Verify application starts without errors
- Check port 8080 is not in use

### Annotations not working
- Verify imports are correct
- Check SpringDoc version compatibility
- Rebuild project: `./gradlew clean build`

### Documentation incomplete
- Add @Tag to all controllers
- Add @Operation to all endpoints
- Add @Schema to all DTOs

---

**Estimated Time:** 1-2 hours
**Maintenance:** Zero (auto-generated)
**Value:** High (100% accurate, always in sync)
