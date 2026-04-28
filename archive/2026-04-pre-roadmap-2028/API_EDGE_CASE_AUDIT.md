# API Edge Case & Contract Audit

**Date**: 2026-03-18
**Scope**: identity-core-api (16 controllers), biometric-processor (error handler)

## Issues Found & Fixed

### 1. Missing Exception Handlers (Critical)

**Problem**: Invalid JSON, missing content-type, and unsupported HTTP methods all returned generic 500 errors instead of proper 4xx responses. This leaked `Internal Server Error` for client mistakes.

**Before**:
- `POST /api/v1/auth/login` with `not json` body => 500
- `POST /api/v1/auth/login` without Content-Type => 500
- `PATCH /api/v1/auth/login` => 500

**Fix**: Added 6 exception handlers to `GlobalExceptionHandler.java`:
- `HttpMessageNotReadableException` => 400 (malformed JSON)
- `HttpMediaTypeNotSupportedException` => 415 (wrong content type)
- `HttpRequestMethodNotSupportedException` => 405 (method not allowed)
- `MissingServletRequestParameterException` => 400 (missing query param)
- `MethodArgumentTypeMismatchException` => 400 (e.g., UUID parse failure)
- `MaxUploadSizeExceededException` => 413 (file too large)

**After**: All return proper JSON `ErrorResponse` with correct status codes.

### 2. Inconsistent 401/403 Response Format (Medium)

**Problem**: Spring Security's `authenticationEntryPoint` returned `{status, error, message}` (3 fields) while `GlobalExceptionHandler` returned `{timestamp, status, error, message, path, errors}` (6 fields). Clients had to handle two different error shapes.

**Fix**: Updated `SecurityConfig.java` to include `timestamp`, `path`, and `errors` fields in both the `authenticationEntryPoint` and the new `accessDeniedHandler`.

### 3. Wrong HTTP Status Codes (Medium)

| Endpoint | Was | Now | Reason |
|----------|-----|-----|--------|
| `POST /api/v1/auth/register` | 200 | 201 | Resource creation |
| `POST /api/v1/auth/logout` | 200 | 204 | No content returned |
| `POST /api/v1/users/{id}/change-password` | 200 | 204 | No content returned |
| `DELETE /api/v1/sessions/{id}` | 200 | 204 | Resource deletion |
| `DELETE /api/v1/sessions/all` | 200 | 204 | Resource deletion |
| `POST /api/v1/guests/{id}/extend` | 200 | 204 | No content returned |
| `POST /api/v1/roles/{id}/permissions/{id}` | 200 | 204 | No content returned |

### 4. Inconsistent Error Response in Auth Endpoints (Medium)

**Problem**: `forgot-password` and `reset-password` returned `Map.of("message", ...)` for errors, while all other endpoints use `ErrorResponse`. Frontend had to handle two error shapes.

**Fix**: Changed to use `ErrorResponse.of(...)` for all error cases in these endpoints.

### 5. Missing Input Validation Constraints (Low-Medium)

| DTO | Field | Added |
|-----|-------|-------|
| `LoginRequest` | email | `@Size(max=255)` |
| `LoginRequest` | password | `@Size(max=128)` |
| `RegisterRequest` | email | `@Size(max=255)` |
| `RegisterRequest` | password | max=128 added to existing `@Size` |
| `CreateUserRequest` | email | `@Size(max=255)` |
| `CreateUserRequest` | password | max=128 added to existing `@Size` |
| `ChangePasswordRequest` | newPassword | max=128 added to existing `@Size` |
| `TenantController.CreateTenantRequest` | all fields | Added `@NotBlank`, `@Size`, `@Email`, `@Min` |
| `TenantController.UpdateTenantRequest` | all fields | Added `@Size`, `@Email`, `@Min` |

### 6. Missing @Valid on @RequestBody (Low)

Added `@Valid` to:
- `AuthFlowController.createFlow()`
- `AuthFlowController.updateFlow()`
- `DeviceController.registerDevice()`

### 7. Empty Body on Bad Request (Low)

**Problem**: `DeviceController.getDevices()` returned `ResponseEntity.badRequest().build()` (empty body) when neither userId nor tenantId was provided.

**Fix**: Changed to throw `IllegalArgumentException` which is caught by `GlobalExceptionHandler` and returns proper `ErrorResponse`.

## Verified Secure (No Changes Needed)

- SQL injection: Email validation rejects before reaching DB (`@Email` annotation)
- XSS: Email validation rejects HTML tags; no output encoding issues (JSON API, not HTML)
- Stack trace leakage: Generic `Exception` handler masks all details with safe message
- Token handling: Expired/invalid tokens return 401 with no information leakage
- Rate limiting: Login and password reset endpoints are rate-limited
- Biometric-processor: Has proper `error_handler.py` with domain exception mapping, no stack trace leakage

## Files Modified

- `identity-core-api/src/main/java/com/fivucsas/identity/exception/GlobalExceptionHandler.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/config/SecurityConfig.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthSessionController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/UserController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/RoleController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/TenantController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthFlowController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/DeviceController.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/dto/LoginRequest.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/dto/RegisterRequest.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/dto/CreateUserRequest.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/dto/ChangePasswordRequest.java`
