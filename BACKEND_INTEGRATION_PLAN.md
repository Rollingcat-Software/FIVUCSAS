# Backend Integration Plan - Option B

**Date**: 2025-11-17  
**Task**: Connect Web-App to Real Backend API  
**Estimated Time**: 3-4 days  
**Priority**: High

---

## 🎯 Objective

Replace mock data in web-app with real API calls to identity-core-api backend, enabling full end-to-end functionality.

---

## 📋 Current State Analysis

### Backend API (Spring Boot) - Available Endpoints:

**AuthController** (`/api/v1/auth`):
- ✅ `POST /register` - Register new user
- ✅ `POST /login` - Login with email/password
- ✅ `GET /health` - Health check
- ❌ Missing: `POST /refresh` - Refresh token endpoint
- ❌ Missing: `POST /logout` - Logout endpoint

**UserController** (`/api/v1/users`):
- ✅ `GET /` - Get all users
- ✅ `GET /{id}` - Get user by ID
- ✅ `POST /` - Create new user
- ✅ `PUT /{id}` - Update user
- ✅ `DELETE /{id}` - Delete user
- ✅ `GET /search?query={q}` - Search users

**StatisticsController** (`/api/v1/statistics`):
- ✅ Exists (need to check endpoints)

**BiometricController** (`/api/v1/biometric`):
- ✅ Exists (need to check endpoints)

### Frontend Services - Need Integration:

**web-app/src/services/**:
1. ✅ `authService.ts` - Login, logout, refresh token
2. ✅ `usersService.ts` - User CRUD operations
3. ⚠️ `tenantsService.ts` - Tenant management (no backend yet)
4. ⚠️ `enrollmentsService.ts` - Biometric enrollments (partial backend)
5. ⚠️ `auditLogsService.ts` - Audit logs (no backend yet)
6. ⚠️ `dashboardService.ts` - Dashboard statistics (partial backend)

---

## 📝 Integration Strategy

### Phase 1: Core Authentication (Day 1) ✅ START HERE

**Objective**: Enable real login/logout functionality

**Tasks**:
1. Create `.env` file in web-app with backend URL
2. Update `authService.ts` to call real API
3. Update `api.ts` interceptors for real token handling
4. Test login flow end-to-end
5. Handle CORS configuration in backend
6. Test token refresh flow

**Files to Modify**:
- `web-app/.env` - Add `VITE_API_BASE_URL=http://localhost:8080/api/v1`
- `web-app/src/services/authService.ts` - Set `MOCK_MODE = false`
- `web-app/src/services/api.ts` - Verify interceptors
- `identity-core-api/src/main/java/com/fivucsas/identity/config/SecurityConfig.java` - Add CORS

**Success Criteria**:
- [ ] Can login with real credentials
- [ ] JWT token stored in localStorage
- [ ] Token automatically added to requests
- [ ] 401 errors trigger token refresh
- [ ] Can logout successfully

---

### Phase 2: User Management (Day 2)

**Objective**: Enable full user CRUD operations

**Tasks**:
1. Update `usersService.ts` to call real API
2. Map frontend User model to backend UserDto
3. Handle pagination properly
4. Test create/read/update/delete operations
5. Test search functionality

**Files to Modify**:
- `web-app/src/services/usersService.ts` - Set `MOCK_MODE = false`
- `web-app/src/types/index.ts` - Verify User interface matches UserDto

**Success Criteria**:
- [ ] Can view users list from database
- [ ] Can create new users
- [ ] Can edit existing users
- [ ] Can delete users
- [ ] Search works correctly
- [ ] Pagination works

---

### Phase 3: Dashboard Statistics (Day 3)

**Objective**: Display real statistics and metrics

**Tasks**:
1. Check StatisticsController endpoints
2. Update `dashboardService.ts` to call real API
3. Map statistics data correctly
4. Handle loading/error states
5. Test dashboard page

**Files to Modify**:
- `web-app/src/services/dashboardService.ts`
- Check `identity-core-api/.../StatisticsController.java`

**Success Criteria**:
- [ ] Dashboard shows real user counts
- [ ] Charts display real data
- [ ] Statistics update correctly

---

### Phase 4: Biometric Operations (Day 3-4)

**Objective**: Enable enrollment and verification tracking

**Tasks**:
1. Check BiometricController endpoints
2. Update `enrollmentsService.ts`
3. Test enrollment job creation
4. Test enrollment status tracking

**Files to Modify**:
- `web-app/src/services/enrollmentsService.ts`
- Check `identity-core-api/.../BiometricController.java`

**Success Criteria**:
- [ ] Can view enrollments from database
- [ ] Can track enrollment status
- [ ] Can retry failed enrollments

---

### Phase 5: Missing Backend Endpoints (Day 4)

**Objective**: Implement missing backend endpoints

**Tasks**:
1. Add `/auth/refresh` endpoint
2. Add `/auth/logout` endpoint
3. Add tenant endpoints (if time permits)
4. Add audit log endpoints (if time permits)

**Files to Create/Modify**:
- `identity-core-api/.../AuthController.java` - Add refresh/logout
- `identity-core-api/.../TenantController.java` - Create if needed
- `identity-core-api/.../AuditLogController.java` - Create if needed

---

## 🔧 Implementation Details

### Step 1: Environment Configuration

**Create `web-app/.env`**:
```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_BIOMETRIC_API_URL=http://localhost:8001/api/v1
VITE_API_TIMEOUT=30000
VITE_ENABLE_MOCK_API=false
```

### Step 2: Update authService.ts

**Change from**:
```typescript
const MOCK_MODE = true
```

**To**:
```typescript
const MOCK_MODE = import.meta.env.VITE_ENABLE_MOCK_API === 'true'
```

**Update login method**:
```typescript
async login(credentials: LoginRequest): Promise<LoginResponse> {
  if (MOCK_MODE) {
    // ... mock code
  }

  // Real API call
  const response = await api.post<LoginResponse>('/auth/login', credentials)
  return response.data
}
```

### Step 3: Update api.ts

**Verify base URL configuration**:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
})
```

**Verify request interceptor**:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Verify response interceptor (401 handling)**:
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await authService.refreshToken(refreshToken)
          localStorage.setItem('accessToken', response.accessToken)
          // Retry original request
          error.config.headers.Authorization = `Bearer ${response.accessToken}`
          return api.request(error.config)
        } catch {
          // Refresh failed, logout
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
```

### Step 4: CORS Configuration (Backend)

**Update SecurityConfig.java**:
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(
        "http://localhost:5173",  // Vite dev server
        "http://localhost:3000"    // Alternative
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

---

## 🧪 Testing Checklist

### Authentication Tests:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Token stored in localStorage after login
- [ ] Token sent in Authorization header
- [ ] Logout clears tokens
- [ ] Expired token triggers refresh
- [ ] Refresh token failure redirects to login

### User Management Tests:
- [ ] View users list (should show database users)
- [ ] Create new user
- [ ] Edit user details
- [ ] Delete user
- [ ] Search users by name/email
- [ ] Pagination works
- [ ] Filter by status
- [ ] Filter by role

### Dashboard Tests:
- [ ] Statistics show real data
- [ ] Charts render with real data
- [ ] Data updates on page refresh

### Error Handling Tests:
- [ ] Network error shows user-friendly message
- [ ] 400 errors show validation messages
- [ ] 401 errors trigger re-authentication
- [ ] 403 errors show access denied
- [ ] 404 errors show not found
- [ ] 500 errors show server error

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Errors
**Symptom**: Browser blocks requests with CORS error  
**Solution**: Update SecurityConfig.java with proper CORS configuration

### Issue 2: 401 Unauthorized
**Symptom**: All requests return 401  
**Solution**: Check token is being sent in Authorization header

### Issue 3: Token Not Refreshing
**Symptom**: User logged out after token expires  
**Solution**: Implement /auth/refresh endpoint in backend

### Issue 4: Data Format Mismatch
**Symptom**: Frontend shows undefined or null values  
**Solution**: Verify frontend types match backend DTOs

### Issue 5: Network Timeout
**Symptom**: Requests take too long and timeout  
**Solution**: Increase VITE_API_TIMEOUT or optimize backend queries

---

## 📊 Progress Tracking

### Day 1 Progress:
- [ ] Environment setup
- [ ] AuthService integration
- [ ] CORS configuration
- [ ] Login/logout working
- [ ] Token refresh working

### Day 2 Progress:
- [ ] UsersService integration
- [ ] User CRUD operations
- [ ] Search functionality
- [ ] Pagination

### Day 3 Progress:
- [ ] Dashboard statistics
- [ ] Biometric enrollments
- [ ] Data visualization

### Day 4 Progress:
- [ ] Missing endpoints
- [ ] Final testing
- [ ] Documentation
- [ ] Deployment preparation

---

## 🎯 Success Criteria (Overall)

- [ ] Can login with real database credentials
- [ ] Can view/create/edit/delete users from database
- [ ] Dashboard shows real statistics
- [ ] All API calls use real backend
- [ ] No mock data in production
- [ ] Error handling works correctly
- [ ] Token refresh works automatically
- [ ] CORS configured properly
- [ ] All tests passing

---

## 📝 Next Steps After Integration

1. **Desktop App Integration** - Apply same pattern to desktop-app
2. **Production Deployment** - Deploy to staging environment
3. **Load Testing** - Verify performance with real data
4. **Security Audit** - Check for vulnerabilities
5. **User Acceptance Testing** - Get feedback from users

---

**Status**: Ready to start  
**Next Action**: Create .env file and update authService.ts
