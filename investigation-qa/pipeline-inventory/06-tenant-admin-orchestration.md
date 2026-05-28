# Tenant / Admin / RBAC / Audit / Orchestration — Pipeline Inventory (2026-05-28)

Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## Tenant Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create | `tenants` V1, V20, V44, V49 | `TenantController.java:44` → `POST /api/v1/tenants` (`@rbac.isRoot()`) | N/A | `TenantFormPage.tsx` (create mode) | N/A | N/A | ✅ | Root-only gate correct |
| Read by ID | `tenants` V1 | `TenantController.java:64` → `GET /api/v1/tenants/{id}` (`isAuthenticated()` + scope check) | N/A | `TenantFormPage.tsx` | N/A | N/A | ✅ | Non-SUPER_ADMIN receives 404 for other tenants (info-leak avoidance) |
| Read by slug | `tenants` V1 | `TenantController.java:82` → `GET /api/v1/tenants/slug/{slug}` (`isAuthenticated()` + scope) | N/A | N/A | N/A | N/A | 🟡 | Web does not expose slug lookup UI; used internally |
| List/page | `tenants` V1 | `TenantController.java:99` → `GET /api/v1/tenants` (`isAuthenticated()`) | N/A | `TenantsListPage.tsx` | N/A | N/A | 🟡 | Non-SUPER_ADMIN gets single-element list (own tenant). In-memory pagination for SUPER_ADMIN: no SQL-level page/sort |
| Update config | `tenants` V1, V44 | `TenantController.java:140` → `PUT /api/v1/tenants/{id}` (`@rbac.hasPermission('tenant:configure')`) | N/A | `TenantFormPage.tsx` | N/A | N/A | 🐞 | **Cross-tenant write gap**: `ManageTenantService.java:123` `updateTenant()` does NOT call `tenantScopeResolver.canAccessTenant()`. A TENANT_ADMIN who has `tenant:configure` permission on tenant A can supply any `{tenantId}` in the path and update a different tenant. Controller does not re-scope the path variable before passing to the service. |
| Soft-delete | `tenants` V49 (`deleted_at`), V53 trigger | `TenantController.java:179` → `DELETE /api/v1/tenants/{id}` (`@rbac.isRoot()`) | N/A | `TenantsListPage.tsx` (delete button) | N/A | N/A | ✅ | Routed through `@SQLDelete`; trigger forbids hard DELETE |
| Suspend | `tenants` status enum | `TenantController.java:170` → `POST /api/v1/tenants/{id}/suspend` (`@rbac.isRoot()`) | N/A | N/A | N/A | N/A | 🟡 | Backend complete; no web UI for suspend/activate (only list/form pages exist) |
| Reactivate | `tenants` status enum | `TenantController.java:163` → `POST /api/v1/tenants/{id}/activate` (`@rbac.isRoot()`) | N/A | N/A | N/A | N/A | 🟡 | Same — no web UI for activate button on list page |
| Limits (max_users) | `tenants.max_users` V20 | embedded in Create/Update commands | N/A | `TenantFormPage.tsx` field | N/A | N/A | ✅ | Enforced at tenant gate in `CreateTenantCommand` |
| Auth methods config | `tenant_auth_methods` V16 | `AuthMethodController.java` (separate) | N/A | `TenantAuthMethods.tsx` | N/A | N/A | ✅ | Out of scope but noted for completeness |

---

## User (Admin) Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create | `users` V2, V12, V32, V54 | `UserController.java:131` → `POST /api/v1/users` (`user:create`) | N/A | `UserFormPage.tsx` | N/A | `AdminDashboard.kt` / `AddUserDialog.kt` | ✅ | |
| List | `users` V2 | `UserController.java:91` → `GET /api/v1/users` (`user:read`) | N/A | `UsersListPage.tsx` | N/A | `UsersTab.kt` | ✅ | |
| Get by ID | `users` V2 | `UserController.java:118` → `GET /api/v1/users/{id}` (`user:read` OR self) | N/A | `UserDetailsPage.tsx` | N/A | N/A | ✅ | |
| Search | `users` | `UserController.java:197` → `GET /api/v1/users/search` (`user:read`) | N/A | N/A (no search box on UsersListPage) | N/A | N/A | 🟡 | Backend endpoint exists; no web UI search input exposed |
| Update | `users` V2, V54 | `UserController.java:152` → `PUT /api/v1/users/{id}` (`user:update` OR self) | N/A | `UserFormPage.tsx` | N/A | `EditUserDialog.kt` | ✅ | |
| Change password | `users.password_hash` | `UserController.java:180` → `POST /api/v1/users/{id}/change-password` | N/A | `ChangePasswordDialog.tsx` | N/A | N/A | ✅ | |
| Soft-delete | `users.deleted_at` V32, V53 trigger, `@SQLDelete` V70-PR | `UserController.java:171` → `DELETE /api/v1/users/{id}` (`user:delete`) | N/A | `UserDetailsPage.tsx` (button) | N/A | `DeleteUserDialog.kt` | ✅ | V53 trigger prevents hard-delete; `@SQLRestriction` auto-filters |
| Settings (read/write) | `user_settings` V11, V14 | `UserController.java:212,224` → `GET/PUT /api/v1/users/{userId}/settings` | N/A | `SettingsPage.tsx` | N/A | N/A | ✅ | Also per-section endpoints (notifications, security, appearance) |
| GDPR Data Export | various | `UserDataExportController.java:49` → `GET /api/v1/users/{id}/export` | N/A | `MyProfilePage.tsx:345` (self-only UI) | N/A | N/A | 🟡 | Backend supports admin-export for any tenant user; web UI only exposes self-export on profile page. No admin-UI to export another user's data |
| GDPR Purge (dry-run) | `users.deleted_at` | `PurgeAdminController.java:38` → `DELETE /api/v1/admin/purge/dry-run` (`@rbac.isSuperAdmin()`) | N/A | ❌ No web page | N/A | N/A | 🟡 | Backend only; **no execute endpoint** — only dry-run exists; purge is triggered by the scheduled `SoftDeletePurgeJob`; no on-demand execute API at all |

---

## Roles / Permissions (RBAC) Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Role list | `roles` V3 | `RoleController.java:45` → `GET /api/v1/roles` (`role:read`) | N/A | `RolesListPage.tsx` | N/A | N/A | ✅ | |
| Role get by ID | `roles` V3 | `RoleController.java:61` → `GET /api/v1/roles/{id}` (`role:read`) | N/A | N/A | N/A | N/A | 🟡 | No dedicated detail page |
| Roles by tenant | `roles` V3 | `RoleController.java:76` → `GET /api/v1/roles/tenant/{tenantId}` (`role:read + canAccessTenant`) | N/A | N/A | N/A | N/A | 🟡 | Backend only |
| Role create | `roles` V3 | `RoleController.java:91` → `POST /api/v1/roles` (`role:create + canAccessTenant`) | N/A | `RoleFormPage.tsx` | N/A | N/A | ✅ | systemRole forced false; SUPER_ADMIN still cannot create system roles via API |
| Role update | `roles` V3 | `RoleController.java:110` → `PUT /api/v1/roles/{id}` (`role:update`) | N/A | `RoleFormPage.tsx` | N/A | N/A | ✅ | |
| Role delete (soft) | `roles.deleted_at` V3 | `RoleController.java:130` → `DELETE /api/v1/roles/{id}` (`role:delete`) | N/A | `RolesListPage.tsx` | N/A | N/A | ✅ | |
| Assign permission to role | `role_permissions` V3 | `RoleController.java:141` → `POST /api/v1/roles/{roleId}/permissions/{permId}` (`role:update`) | N/A | N/A | N/A | N/A | 🟡 | No web UI for per-permission assignment on role form |
| Revoke permission from role | `role_permissions` V3 | `RoleController.java:159` → `DELETE /api/v1/roles/{roleId}/permissions/{permId}` (`role:update`) | N/A | N/A | N/A | N/A | 🟡 | Same — no web UI |
| Assign role to user | `user_roles` V3 | `RoleController.java:192` → `POST /api/v1/users/{userId}/roles/{roleId}` (`user_role:assign`) | N/A | N/A | N/A | N/A | 🟡 | No web UI to assign role on user detail page |
| Revoke role from user | `user_roles` V3 | `RoleController.java:215` → `DELETE /api/v1/users/{userId}/roles/{roleId}` (`user_role:revoke`) | N/A | N/A | N/A | N/A | 🟡 | Same |
| List user roles | `user_roles` V3 | `RoleController.java:179` → `GET /api/v1/users/{userId}/roles` (`user_role:read` OR self) | N/A | N/A | N/A | N/A | 🟡 | No web UI |
| List all permissions | `permissions` V3 | `RoleController.java:248` → `GET /api/v1/permissions` (`isAuthenticated()`) | N/A | N/A | N/A | N/A | 🐞 | **Authz leakage**: annotated `@PreAuthorize("isAuthenticated()")` but service-layer silently returns empty list for non-SUPER_ADMIN (`RoleController.java:257–259`). The annotation is correct but misleadingly weak — a regular user hitting this gets `[]` with 200 OK instead of 403; the silent downgrade may confuse callers |
| Get permission by ID | `permissions` V3 | `RoleController.java:263` → `GET /api/v1/permissions/{id}` (`permission:read`) | N/A | N/A | N/A | N/A | 🟡 | No web UI |
| Permissions by resource | `permissions` V3 | `RoleController.java:276` → `GET /api/v1/permissions/resource/{resource}` (`permission:read`) | N/A | N/A | N/A | N/A | 🟡 | No web UI |

---

## API Keys Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create | `api_keys` V19 | ❌ No controller | N/A | ❌ No UI | N/A | N/A | ❌ | `ApiKey` entity + `ApiKeyResponse` DTO exist but there is zero controller, service, or use-case wiring. The table is defined and indexed but the entire CRUD pipeline is absent |
| List | `api_keys` V19 | ❌ No controller | N/A | ❌ No UI | N/A | N/A | ❌ | Same |
| Revoke | `api_keys` V19 | ❌ No controller | N/A | ❌ No UI | N/A | N/A | ❌ | `ApiKey.revoke()` domain method exists but is unreachable via API |
| Get | `api_keys` V19 | ❌ No controller | N/A | ❌ No UI | N/A | N/A | ❌ | Complete gap — entity + table are orphaned |

---

## OAuth2 Clients Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create/register | `oauth2_clients` V24, V34, V37, V38, V58 | `OAuth2ClientController.java:88` → `POST /api/v1/oauth2/clients` (`@rbac.isTenantAdmin()`) | N/A | `DeveloperPortalPage.tsx:195` | N/A | N/A | ✅ | Secret returned once in plaintext; bcrypt-hashed at rest |
| List | `oauth2_clients` V24 | `OAuth2ClientController.java:67` → `GET /api/v1/oauth2/clients` (`@rbac.isTenantAdmin()`) | N/A | `DeveloperPortalPage.tsx:153` | N/A | N/A | ✅ | Scoped to caller's tenant |
| Get by ID | `oauth2_clients` V24 | `OAuth2ClientController.java:136` → `GET /api/v1/oauth2/clients/{id}` (`@rbac.isTenantAdmin()`) | N/A | N/A | N/A | N/A | 🟡 | No detail page in web; list-only UI |
| Delete | `oauth2_clients` V24 | `OAuth2ClientController.java:154` → `DELETE /api/v1/oauth2/clients/{id}` (`@rbac.isTenantAdmin()`) | N/A | `DeveloperPortalPage.tsx:232` | N/A | N/A | ✅ | Hard-delete (intentional — revoked clients should be gone) |
| Toggle status | `oauth2_clients.active` | `OAuth2ClientController.java:217` → `PATCH /api/v1/oauth2/clients/{id}/status` (`@rbac.isTenantAdmin()`) | N/A | ❌ No web UI | N/A | N/A | 🟡 | Backend exists; no toggle button on DeveloperPortalPage — table shows status chip but it is read-only |
| Rotate secret | `oauth2_clients.previous_client_secret`, `previous_secret_expires_at` V58 | `OAuth2ClientController.java:188` → `POST /api/v1/oauth2/clients/{id}/rotate-secret` (`@rbac.isTenantAdmin()`) | N/A | ❌ No web UI | N/A | N/A | 🟡 | Backend with 24h grace window shipped; no web UI rotate button |
| Update (name/URIs/scopes) | `oauth2_clients` | ❌ No `PUT` endpoint | N/A | ❌ No UI | N/A | N/A | ❌ | No update endpoint — tenants must delete and recreate to change redirect URIs or scopes |

---

## Audit Logs Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| List/query (paginated) | `audit_logs` V5, V8, V40, V57 (pg_partman), V59 | `AuditLogController.java:49` → `GET /api/v1/audit-logs` (`@rbac.isTenantAdmin() OR audit:read`) | N/A | `AuditLogsPage.tsx` | N/A | N/A | 🟡 | **Architectural concern**: controller injects `AuditLogRepository` directly (line 44), bypassing hexagonal output ports (`AuditLogPort`/`AuditLogQueryPort`). Tenant-scoped userId filter is applied in-memory after DB fetch (lines 87–99), breaking pagination — filtered page can return fewer rows than `size` with no real total count |
| Get by ID | `audit_logs` V5 | `AuditLogController.java:160` → `GET /api/v1/audit-logs/{id}` (`@rbac.isTenantAdmin() OR audit:read`) | N/A | N/A | N/A | N/A | 🟡 | No detail view in web |
| Action-type enum | static | `AuditLogController.java:138` → `GET /api/v1/audit-logs/action-types` | N/A | `AuditLogsPage.tsx` (filter) | N/A | N/A | ✅ | |
| My activity (self) | `audit_logs` | `AuditLogController.java:115` → `GET /api/v1/my/activity` (`isAuthenticated()`) | N/A | N/A (separate section in profile) | N/A | N/A | ✅ | |
| Event publishing | `audit_logs` V5 | `AuditEventPublisher.java:105` `publish()` | N/A | N/A | N/A | N/A | ✅ | Async; Micrometer counter `audit.publish.failure` on drops; injected via `AuditLogPort` |
| Statistics | N/A | `AuditLogController.java:181` → `GET /api/v1/statistics` (`analytics:view`) | `admin.py:get_system_stats` → `GET /admin/stats` | `AnalyticsPage.tsx` | N/A | `AnalyticsTab.kt` | ✅ | Biometric-processor stats are in-memory (restart-reset) |
| Admin activity feed | N/A | `AuditLogController.java:191` → `GET /api/v1/statistics/dashboard` | `admin.py:get_recent_activity` → `GET /admin/activity` | N/A | N/A | N/A | 🟡 | In-memory ring buffer in processor (100 entries max, no persistence) |

---

## GDPR / KVKK Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| User data export | `users`, `user_settings`, `user_roles`, `webauthn_credentials`, etc. | `UserDataExportController.java:49` → `GET /api/v1/users/{id}/export` (`isAuthenticated()`) | N/A | `MyProfilePage.tsx:345` (self only) | N/A | N/A | 🟡 | Backend allows tenant-admin export; web only exposes self-export. **No admin-UI** to pull another user's bundle |
| Soft-delete purge (dry-run preview) | `users.deleted_at` V49 | `PurgeAdminController.java:38` → `DELETE /api/v1/admin/purge/dry-run` (`@rbac.isSuperAdmin()`) | N/A | ❌ No web page | N/A | N/A | 🟡 | |
| Soft-delete purge (execute) | `users.deleted_at` V49 | ❌ No on-demand endpoint; only scheduled `SoftDeletePurgeJob` | N/A | ❌ No web UI | N/A | N/A | ❌ | **Gap**: No `DELETE /api/v1/admin/purge/execute` endpoint. Operators cannot trigger a purge run on-demand; must wait for the cron schedule or enable the feature flag and restart |
| Purge web UI | — | — | — | ❌ None | N/A | N/A | ❌ | No admin page for purge management |

---

## Verification-Flow Orchestration Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create flow | `auth_flows` V16 | `AuthFlowController.java:41` → `POST /api/v1/tenants/{tenantId}/auth-flows` (`@rbac.isTenantAdmin() + canAccessTenant`) | N/A | `AuthFlowBuilderPage.tsx` / `AuthFlowsPage.tsx` | N/A | N/A | ✅ | |
| List flows | `auth_flows` V16 | `AuthFlowController.java:26` → `GET /api/v1/tenants/{tenantId}/auth-flows` (`canAccessTenant`) | N/A | `AuthFlowsPage.tsx` | N/A | N/A | ✅ | |
| Get flow | `auth_flows` V16 | `AuthFlowController.java:33` → `GET /api/v1/tenants/{tenantId}/auth-flows/{flowId}` (`canAccessTenant`) | N/A | `AuthFlowBuilder.tsx` | N/A | N/A | ✅ | |
| Update flow | `auth_flows` V16 | `AuthFlowController.java:50` → `PUT /api/v1/tenants/{tenantId}/auth-flows/{flowId}` (`isTenantAdmin + canAccessTenant`) | N/A | `AuthFlowBuilder.tsx` | N/A | N/A | ✅ | |
| Delete flow | `auth_flows` V16 | `AuthFlowController.java:60` → `DELETE /api/v1/tenants/{tenantId}/auth-flows/{flowId}` (`isTenantAdmin + canAccessTenant`) | N/A | `AuthFlowsPage.tsx` | N/A | N/A | ✅ | |
| List verification flows | `auth_flows` (VERIFICATION type) V26 | `VerificationController.java:68` → `GET /api/v1/verification/flows` (`isAuthenticated()`) | N/A | `VerificationDashboardPage.tsx` | N/A | N/A | ✅ | Tenant-scoped |
| Create verification session | `verification_sessions` V26 | `VerificationController.java:32` → `POST /api/v1/verification/sessions` | N/A | N/A | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** — endpoint is accessible without authentication (SecurityConfig default is `authenticated()` at line 166, so Spring catches it there, but the controller has no explicit annotation — relies on catch-all) |
| Submit session step | `verification_step_results` V26 | `VerificationController.java:39` → `POST /api/v1/verification/sessions/{id}/steps/{n}` | N/A | N/A | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** — same as above; relies on SecurityConfig catch-all |
| Get session | `verification_sessions` | `VerificationController.java:47` → `GET /api/v1/verification/sessions/{id}` | N/A | `VerificationSessionDetailPage.tsx` | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** + no tenant-scope check (any authenticated user can read any session by UUID) |
| Complete session | `verification_sessions` | `VerificationController.java:52` → `POST /api/v1/verification/sessions/{id}/complete` | N/A | N/A | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** |
| List sessions | `verification_sessions` | `VerificationController.java:113` → `GET /api/v1/verification/sessions` (`isAuthenticated()`) | N/A | `VerificationDashboardPage.tsx` | N/A | N/A | ✅ | Tenant-scoped |
| Stats | aggregate | `VerificationController.java:91` → `GET /api/v1/verification/stats` (`isAuthenticated()`) | N/A | `VerificationDashboardPage.tsx` | N/A | N/A | ✅ | |
| Get user verification status | `verification_sessions` | `VerificationController.java:130` → `GET /api/v1/verification/results/{userId}` | N/A | N/A | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** — no auth gate; any unauthenticated caller can probe verification status of any userId |
| Industry templates | static/seeded V27 | `VerificationController.java:57` → `GET /api/v1/verification/templates` | N/A | `VerificationFlowBuilderPage.tsx` (`TemplateSelector.tsx`) | N/A | N/A | 🐞 | **Missing `@PreAuthorize`** — public, but content is not sensitive |
| Review step | `verification_step_results` | `VerificationController.java:134` → `POST /api/v1/verification/sessions/{id}/steps/{n}/review` (`ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_TENANT_ADMIN`) | N/A | N/A | N/A | N/A | 🟡 | Gated correctly; no web UI for reviewer action |

---

## QR Pipeline

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Processor (file:func) | Web (page/component) | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Generate QR token | in-memory / `QrCodeService` | `QrController.java:40` → `POST /api/v1/qr/generate/{userId}` (`qr:generate` OR self) | N/A | N/A | N/A | N/A | ✅ | |
| Invalidate QR token | in-memory | `QrController.java:55` → `DELETE /api/v1/qr/{token}` (`isAuthenticated()`) | N/A | N/A | N/A | N/A | ✅ | |
| Create QR session | in-memory / `QrSessionService` | `QrController.java:66` → `POST /api/v1/auth/qr/session` (`permitAll`) | N/A | `QrCodeStep.tsx` | N/A | N/A | ✅ | Public — intended for unauthenticated display device |
| Get QR session (poll) | in-memory | `QrController.java:77` → `GET /api/v1/auth/qr/session/{sessionId}` (`permitAll`) | N/A | `QrCodeStep.tsx` | N/A | N/A | ✅ | Public polling |
| Approve QR session | in-memory | `QrController.java:84` → `POST /api/v1/auth/qr/session/{sessionId}/approve` (authenticated via `rbacService.getCurrentUser()`) | N/A | N/A | Android: `QrCodeStep.tsx` equivalent | N/A | ✅ | Requires authenticated mobile approver |

---

## Proctoring Pipeline (biometric-processor)

| Operation | DB | Backend (processor file:func → endpoint) | Web | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|
| Create session | `proctor_sessions` | `proctor.py:create_session` → `POST /proctoring/sessions` (X-Tenant-ID header) | N/A | N/A | N/A | ✅ | Tenant validated from header; no JWT — API-key auth via middleware |
| Start session | `proctor_sessions` | `proctor.py:start_session` → `POST /proctoring/sessions/{id}/start` | N/A | N/A | N/A | ✅ | |
| Submit frame | `proctor_sessions` | `proctor.py:submit_frame` → `POST /proctoring/sessions/{id}/frames` | N/A | N/A | N/A | ✅ | |
| Pause session | `proctor_sessions` | `proctor.py:pause_session` → `POST /proctoring/sessions/{id}/pause` | N/A | N/A | N/A | ✅ | |
| Resume session | `proctor_sessions` | `proctor.py:resume_session` → `POST /proctoring/sessions/{id}/resume` | N/A | N/A | N/A | ✅ | |
| End session | `proctor_sessions` | `proctor.py:end_session` → `POST /proctoring/sessions/{id}/end` | N/A | N/A | N/A | ✅ | |
| Get session | `proctor_sessions` | `proctor.py:get_session` → `GET /proctoring/sessions/{id}` | N/A | N/A | N/A | ✅ | |
| List sessions | `proctor_sessions` | `proctor.py:list_sessions` → `GET /proctoring/sessions` | N/A | N/A | N/A | ✅ | |
| Create incident | `proctor_incidents` | `proctor.py:create_incident` → `POST /proctoring/sessions/{id}/incidents` | N/A | N/A | N/A | ✅ | |
| List incidents | `proctor_incidents` | `proctor.py:list_incidents` → `GET /proctoring/sessions/{id}/incidents` | N/A | N/A | N/A | ✅ | |
| Get incident | `proctor_incidents` | `proctor.py:get_incident` → `GET /proctoring/incidents/{id}` | N/A | N/A | N/A | 🐞 | **No tenant check**: `proctor.py` `get_incident` does not validate tenant ownership — any caller with API key can read any incident by UUID |
| Review incident | `proctor_incidents` | `proctor.py:review_incident` → `POST /proctoring/incidents/{id}/review` | N/A | N/A | N/A | 🟡 | Requires `X-Reviewer-ID` header only — no auth JWT or permission check |
| Session report | `proctor_sessions` + `proctor_incidents` | `proctor.py:get_session_report` → `GET /proctoring/sessions/{id}/report` | N/A | N/A | N/A | ✅ | |
| Rate-limit status | in-memory | `proctor.py:get_rate_limit_status` → `GET /proctoring/sessions/{id}/rate-limit` | N/A | N/A | N/A | ✅ | |
| Admin stats | in-memory | `admin.py:get_system_stats` → `GET /admin/stats` (JWT `require_auth`) | `AnalyticsPage.tsx` | N/A | `AnalyticsTab.kt` | 🟡 | Stats reset on restart; not persisted |
| Admin activity | in-memory ring buffer | `admin.py:get_recent_activity` → `GET /admin/activity` | N/A | N/A | N/A | 🟡 | 100-entry max, restart-volatile |

---

## Biometric Puzzles Pipeline (biometric-processor)

| Operation | DB | Backend (processor file:func → endpoint) | Web | Mobile | Desktop | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|
| Generate puzzle | `puzzles` (in-memory / ephemeral) | `puzzle.py:generate_puzzle` → `POST /liveness/generate-puzzle` | `BiometricPuzzlesPage.tsx` → `BiometricPuzzleRunnerModal.tsx` | N/A | N/A | ✅ | No JWT/auth on generate — tenant from optional header |
| Verify puzzle | `puzzles` | `puzzle.py:verify_puzzle` → `POST /liveness/verify` | `BiometricPuzzleRunnerModal.tsx` | N/A | N/A | ✅ | |
| Verify single challenge | — | `puzzle.py:verify_challenge` → `POST /liveness/verify-challenge` | `FacePuzzle.tsx`, `HandGesturePuzzle.tsx` | N/A | N/A | ✅ | Structural validation only; not a heavier ML re-run |

---

## Verification Pipeline (biometric-processor / identity-core-api bridge)

| Operation | DB | Backend file → endpoint | Web | Status | Notes/gaps |
|---|---|---|---|---|---|
| Document scan | `verification_sessions` | `verification_pipeline.py:document_scan` → `POST /verification/document-scan` | `VerificationFlowBuilderPage.tsx` | ✅ | YOLO card detection |
| Data extract (OCR/MRZ) | `verification_sessions` | `verification_pipeline.py:data_extract` → `POST /verification/data-extract` | N/A | ✅ | MRZ + OCR |
| Face match | `verification_sessions` | `verification_pipeline.py:face_match` → `POST /verification/face-match` | N/A | ✅ | DeepFace cosine |
| Liveness check | `verification_sessions` | `verification_pipeline.py:liveness_check` → `POST /verification/liveness-check` | N/A | ✅ | |
| Pipeline test | — | `verification_pipeline.py:pipeline_test` → `POST /verification/pipeline-test` | N/A | ✅ | Dev/QA only |
| Video interview upload | file storage | `verification_pipeline.py:video_interview` → `POST /verification/video-interview` | N/A | 🟡 | Upload only; no admin review UI in web-app |

---

## Guest Lifecycle Pipeline

| Operation | DB | Backend → endpoint | Web | Status | Notes/gaps |
|---|---|---|---|---|---|
| Invite guest | `guest_invitations` V10 | `UserController.java:297` → `POST /api/v1/guests/invite` (`isTenantAdmin OR guest:invite`) | `GuestsPage.tsx` | ✅ | SUPER_ADMIN must pass `?tenantId=` |
| Accept invitation | `guest_invitations` | `UserController.java:347` → `POST /api/v1/guests/accept` (public) | N/A | ✅ | |
| List invitations | `guest_invitations` | `UserController.java:364` → `GET /api/v1/guests` (`isTenantAdmin OR guest:read`) | `GuestsPage.tsx` | 🟡 | Cross-tenant listing capped at 1000 rows; no server-side pagination |
| Count guests | `guest_invitations` | `UserController.java:413` → `GET /api/v1/guests/count` | N/A | ✅ | |
| Revoke access | `guest_invitations` + `users` | `UserController.java:435` → `POST /api/v1/guests/{id}/revoke` (`guest:revoke`) | `GuestsPage.tsx` | ✅ | |
| Extend access | `guest_invitations` | `UserController.java:450` → `POST /api/v1/guests/{id}/extend` (`guest:extend`) | N/A | 🟡 | Backend exists; no web UI extend button |

---

## Cross-Cutting Findings

### Authz / RBAC Issues

1. **TenantController.java:140–160 + ManageTenantService.java:123** — `PUT /api/v1/tenants/{tenantId}` is gated by `@rbac.hasPermission('tenant:configure')` but `ManageTenantService.updateTenant()` never calls `tenantScopeResolver.canAccessTenant()`. A TENANT_ADMIN with the `tenant:configure` permission who knows a foreign `tenantId` UUID can overwrite name, contact email, maxUsers, biometricEnabled, mfaRequired, and session timeouts of any other tenant. **Cross-tenant write vulnerability.**

2. **VerificationController.java:32–61, 130** — `POST /verification/sessions`, `POST /verification/sessions/{id}/steps/{n}`, `GET /verification/sessions/{id}`, `POST /verification/sessions/{id}/complete`, `GET /verification/results/{userId}`, `GET /verification/templates` all have no `@PreAuthorize`. They rely on the SecurityConfig catch-all `.requestMatchers("/api/v1/**").authenticated()` (line 166 of SecurityConfig.java). This is security-by-convention, not security-by-code — a future SecurityConfig refactor adding a new permitAll rule higher in the chain could silently open these. No tenant-scope enforcement on individual session reads.

3. **VerificationController.java:130** — `GET /api/v1/verification/results/{userId}` has no `@PreAuthorize` AND no authorization check in the service — any authenticated user can query the verification status of any arbitrary `userId` UUID.

4. **RoleController.java:248–259** — `GET /api/v1/permissions` annotated `isAuthenticated()` but silently returns `[]` for non-SUPER_ADMIN at service layer. The HTTP 200 + empty body misleads API clients into thinking no permissions exist, rather than returning 403.

5. **biometric-processor/app/api/routes/proctor.py:get_incident** — No tenant ownership validation on incident GET. Any bearer with a valid API key can read any incident by UUID across tenants.

6. **biometric-processor/app/api/routes/proctor.py:review_incident** — `POST /proctoring/incidents/{id}/review` only requires `X-Reviewer-ID` header (string, no auth). Reviewers are not authenticated — the header is taken at face value.

### Structural / Architectural Issues

7. **AuditLogController.java:44** — Controller directly injects `AuditLogRepository` (concrete Spring Data repo), bypassing the hexagonal `AuditLogPort` / `AuditLogQueryPort` output ports. This violates the project's hexagonal contract and makes the controller untestable without a live DB.

8. **AuditLogController.java:87–99** — Tenant-scoped `userId` filter is applied in-memory after database fetch (`auditLogs.getContent().stream().filter(...)`). Combined with the JPA `Page` limit, this produces incorrect pagination (page may have fewer rows than `size`; total count is wrong). Breaks reliable audit paging for tenant admins filtering by userId.

9. **TenantsListPage / getAllTenants** — `ManageTenantUseCase.getAllTenants()` returns all tenants in memory and then the controller slices in Java (`visible.subList`). No SQL-level pagination for SUPER_ADMIN — full table scan on every list request.

### Missing Pipelines

10. **API Keys** — `api_keys` table (V19), `ApiKey.java` entity, `ApiKeyResponse.java` DTO exist, but there is no controller, service, use-case, repository port, or web-app surface for any CRUD operation. The table and entity are completely orphaned.

11. **GDPR Purge execute** — Only a dry-run preview endpoint exists (`PurgeAdminController.java:38`). There is no on-demand execute endpoint. Operators cannot trigger a purge run without modifying the `app.purge.softDelete.enabled` flag and waiting for the cron.

12. **OAuth2 Client Update** — No `PUT /api/v1/oauth2/clients/{id}` endpoint. Changing redirect URIs or scopes requires delete + recreate, breaking active integrations.

13. **RBAC assignment UI** — Permission → role assignment, role → user assignment, and user role revocation all have backend endpoints but zero web-app UI surface. Role management page (`RolesListPage.tsx`, `RoleFormPage.tsx`) does not wire these operations.

14. **Tenant suspend/activate web UI** — `POST /api/v1/tenants/{id}/suspend` and `/activate` exist but there is no button on `TenantsListPage.tsx` or `TenantFormPage.tsx` to invoke them.

15. **Video interview admin review** — `POST /verification/video-interview` stores video but there is no admin review queue, listing, or approval UI anywhere in web-app or desktop.

16. **Guest invite extend UI** — `POST /api/v1/guests/{id}/extend` exists; `GuestsPage.tsx` has revoke but no extend button.
