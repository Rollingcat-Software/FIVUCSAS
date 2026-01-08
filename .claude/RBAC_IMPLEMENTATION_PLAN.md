# RBAC Implementation Plan

## Current Status

**Completed:**
- Database tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- Entity classes: `Role`, `Permission`, `User` with authorities
- `CustomUserDetailsService` - loads roles/permissions into Spring Security
- Basic authentication flow

**Not Implemented:**
- `@PreAuthorize` annotations on endpoints
- Role-based route protection
- Permission checking in services

## Implementation Steps

### Phase 1: Enable Method Security (1-2 hours)

1. **Update SecurityConfig.java:**
```java
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    // ...
}
```

2. **Add @PreAuthorize to controllers:**
```java
// UserController.java
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
@GetMapping
public ResponseEntity<List<UserDTO>> getAllUsers() { ... }

@PreAuthorize("hasAuthority('USER_CREATE')")
@PostMapping
public ResponseEntity<UserDTO> createUser(...) { ... }

@PreAuthorize("hasAuthority('USER_DELETE')")
@DeleteMapping("/{id}")
public ResponseEntity<Void> deleteUser(...) { ... }
```

### Phase 2: Define Permission Structure (1 hour)

**Suggested Permissions:**
| Resource | Permissions |
|----------|-------------|
| USER | USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE |
| TENANT | TENANT_READ, TENANT_CREATE, TENANT_UPDATE, TENANT_DELETE |
| ENROLLMENT | ENROLLMENT_READ, ENROLLMENT_CREATE, ENROLLMENT_DELETE |
| AUDIT_LOG | AUDIT_READ |
| SETTINGS | SETTINGS_READ, SETTINGS_UPDATE |

**Suggested Roles:**
| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | All permissions |
| ADMIN | All except TENANT_DELETE |
| OPERATOR | READ operations + ENROLLMENT_CREATE |
| VIEWER | READ operations only |

### Phase 3: Update Flyway Migration (30 min)

Create `V7__seed_rbac_data.sql`:
```sql
-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('USER_READ', 'View users', 'USER', 'READ'),
('USER_CREATE', 'Create users', 'USER', 'CREATE'),
-- ... etc

-- Insert default roles
INSERT INTO roles (name, description, tenant_id) VALUES
('SUPER_ADMIN', 'Full system access', NULL),
('ADMIN', 'Tenant administrator', NULL),
-- ... etc

-- Map permissions to roles
INSERT INTO role_permissions (role_id, permission_id) ...
```

### Phase 4: Update Controllers (2-3 hours)

Files to update:
- `UserController.java`
- `TenantController.java`
- `EnrollmentController.java`
- `AuditLogController.java`
- `SettingsController.java`

### Phase 5: Frontend Integration (2 hours)

1. Include roles/permissions in JWT claims
2. Update `useAuth` hook to expose permissions
3. Conditionally render UI elements based on permissions

## Quick Start Command

To begin implementation:
```
Use the api-integrator agent to implement RBAC Phase 1 - Enable method security and add @PreAuthorize annotations to UserController
```

## Testing

```bash
# Test with different roles
curl -H "Authorization: Bearer $ADMIN_TOKEN" /api/v1/users
curl -H "Authorization: Bearer $VIEWER_TOKEN" /api/v1/users
curl -H "Authorization: Bearer $VIEWER_TOKEN" -X DELETE /api/v1/users/1  # Should fail
```

## Estimated Total Time: 6-8 hours
