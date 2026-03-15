# FIVUCSAS Backend Comprehensive Test Plan

**API Base URL:** `https://auth.rollingcatsoftware.com`
**Date:** 2026-02-03
**Status:** In Progress

## Test Credentials

| User | Email | Password | Type |
|------|-------|----------|------|
| System Admin | admin@fivucsas.local | Test@123 | ROOT/TENANT_ADMIN |
| Test User | test.user@example.com | Password123 | TENANT_MEMBER |

## 1. Authentication Endpoints (`/api/v1/auth`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 1.1 | `/register` | POST | ✅ PASS | Creates user, returns JWT |
| 1.2 | `/login` | POST | ✅ PASS | Returns accessToken + refreshToken |
| 1.3 | `/me` | GET | ✅ PASS | Returns current user with JWT |
| 1.4 | `/refresh` | POST | ⏳ TODO | Refresh access token |
| 1.5 | `/logout` | POST | ⏳ TODO | Revoke refresh token |
| 1.6 | `/health` | GET | ✅ PASS | Returns "Auth service is healthy" |

## 2. User Endpoints (`/api/v1/users`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 2.1 | `/` | GET | ⏳ TODO | List all users |
| 2.2 | `/{id}` | GET | ⏳ TODO | Get user by ID |
| 2.3 | `/` | POST | ⏳ TODO | Create user (admin) |
| 2.4 | `/{id}` | PUT | ⏳ TODO | Update user |
| 2.5 | `/{id}` | DELETE | ⏳ TODO | Delete user |
| 2.6 | `/{id}/change-password` | POST | ⏳ TODO | Change password |
| 2.7 | `/search` | GET | ⏳ TODO | Search users |

## 3. Tenant Endpoints (`/api/v1/tenants`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 3.1 | `/` | GET | ⏳ TODO | List all tenants |
| 3.2 | `/{id}` | GET | ⏳ TODO | Get tenant by ID |
| 3.3 | `/slug/{slug}` | GET | ⏳ TODO | Get tenant by slug |
| 3.4 | `/` | POST | ⏳ TODO | Create tenant (ROOT only) |
| 3.5 | `/{id}` | PUT | ⏳ TODO | Update tenant |
| 3.6 | `/{id}/activate` | POST | ⏳ TODO | Activate tenant |
| 3.7 | `/{id}/suspend` | POST | ⏳ TODO | Suspend tenant |
| 3.8 | `/{id}` | DELETE | ⏳ TODO | Delete tenant |

## 4. Role Endpoints (`/api/v1/roles`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 4.1 | `/` | GET | ⏳ TODO | List all roles |
| 4.2 | `/{id}` | GET | ⏳ TODO | Get role by ID |
| 4.3 | `/tenant/{tenantId}` | GET | ⏳ TODO | Get roles by tenant |
| 4.4 | `/` | POST | ⏳ TODO | Create role |
| 4.5 | `/{id}` | PUT | ⏳ TODO | Update role |
| 4.6 | `/{id}` | DELETE | ⏳ TODO | Delete role |
| 4.7 | `/{roleId}/permissions/{permId}` | POST | ⏳ TODO | Assign permission |
| 4.8 | `/{roleId}/permissions/{permId}` | DELETE | ⏳ TODO | Revoke permission |

## 5. Permission Endpoints (`/api/v1/permissions`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 5.1 | `/` | GET | ⏳ TODO | List all permissions |
| 5.2 | `/{id}` | GET | ⏳ TODO | Get permission by ID |
| 5.3 | `/resource/{resource}` | GET | ⏳ TODO | Get by resource |

## 6. User Role Endpoints (`/api/v1/users/{userId}/roles`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 6.1 | `/` | GET | ⏳ TODO | Get user's roles |
| 6.2 | `/{roleId}` | POST | ⏳ TODO | Assign role to user |
| 6.3 | `/{roleId}` | DELETE | ⏳ TODO | Revoke role from user |

## 7. Audit Log Endpoints (`/api/v1/audit-logs`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 7.1 | `/` | GET | ⏳ TODO | List audit logs |
| 7.2 | `/{id}` | GET | ⏳ TODO | Get audit log by ID |

## 8. Statistics Endpoints (`/api/v1/statistics`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 8.1 | `/` | GET | ⏳ TODO | Get system statistics |

## 9. Guest Endpoints (`/api/v1/guests`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 9.1 | `/invite` | POST | ⏳ TODO | Invite guest |
| 9.2 | `/accept` | POST | ⏳ TODO | Accept invitation |
| 9.3 | `/` | GET | ⏳ TODO | List guests |
| 9.4 | `/count` | GET | ⏳ TODO | Count active guests |
| 9.5 | `/{guestUserId}/revoke` | POST | ⏳ TODO | Revoke guest |
| 9.6 | `/{guestUserId}/extend` | POST | ⏳ TODO | Extend guest access |

## 10. Enrollment Endpoints (`/api/v1/enrollments`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 10.1 | `/` | GET | ⏳ TODO | List enrollments |
| 10.2 | `/{id}` | GET | ⏳ TODO | Get enrollment by ID |
| 10.3 | `/{id}/retry` | POST | ⏳ TODO | Retry enrollment |
| 10.4 | `/{id}` | DELETE | ⏳ TODO | Delete enrollment |

## 11. Biometric Endpoints (`/api/v1/biometric`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 11.1 | `/enroll/{userId}` | POST | ⏳ TODO | Enroll face (multipart) |
| 11.2 | `/verify/{userId}` | POST | ⏳ TODO | Verify face (multipart) |

## 12. User Settings Endpoints (`/api/v1/users/{userId}/settings`)

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|--------|-------|
| 12.1 | `/` | GET | ⏳ TODO | Get settings |
| 12.2 | `/` | PUT | ⏳ TODO | Update settings |
| 12.3 | `/notifications` | GET | ⏳ TODO | Get notification settings |
| 12.4 | `/notifications` | PUT | ⏳ TODO | Update notification settings |
| 12.5 | `/security` | GET | ⏳ TODO | Get security settings |
| 12.6 | `/security` | PUT | ⏳ TODO | Update security settings |
| 12.7 | `/appearance` | GET | ⏳ TODO | Get appearance settings |
| 12.8 | `/appearance` | PUT | ⏳ TODO | Update appearance settings |

---

## Test Execution Summary

| Category | Total | Passed | Failed | Pending |
|----------|-------|--------|--------|---------|
| Authentication | 6 | 4 | 0 | 2 |
| Users | 7 | 0 | 0 | 7 |
| Tenants | 8 | 0 | 0 | 8 |
| Roles | 8 | 0 | 0 | 8 |
| Permissions | 3 | 0 | 0 | 3 |
| User Roles | 3 | 0 | 0 | 3 |
| Audit Logs | 2 | 0 | 0 | 2 |
| Statistics | 1 | 0 | 0 | 1 |
| Guests | 6 | 0 | 0 | 6 |
| Enrollments | 4 | 0 | 0 | 4 |
| Biometric | 2 | 0 | 0 | 2 |
| User Settings | 8 | 0 | 0 | 8 |
| **TOTAL** | **58** | **4** | **0** | **54** |
