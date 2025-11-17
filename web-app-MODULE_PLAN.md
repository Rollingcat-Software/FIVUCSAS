# Web App - Module Implementation Plan

**Module Name**: web-app
**Repository**: https://github.com/Rollingcat-Software/web-app
**Technology**: React 18 + TypeScript + Vite
**Purpose**: Admin dashboard for managing users, tenants, and viewing analytics
**Status**: ✅ UI 100% Complete (Mock Mode), ⚠️ Backend Integration 75% Complete
**Priority**: 🟠 HIGH - Primary admin interface

---

## 📋 Table of Contents

1. [Module Overview](#module-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Component Structure](#component-structure)
5. [State Management](#state-management)
6. [Implementation Tasks](#implementation-tasks)
7. [Testing Requirements](#testing-requirements)
8. [Deployment](#deployment)
9. [Integration Points](#integration-points)

---

## 🎯 Module Overview

### Purpose
The Web App is the primary administrative interface for the FIVUCSAS platform. It provides:
- User authentication and session management
- User CRUD operations
- Tenant management
- Biometric enrollment tracking
- Security audit log viewing
- Dashboard analytics and visualizations
- System settings and configuration

### Key Features
1. **Authentication**: JWT-based login/logout with auto-refresh
2. **Dashboard**: Statistics, charts, and KPIs
3. **User Management**: Full CRUD with search and filters
4. **Tenant Management**: Multi-tenant administration
5. **Biometric Tracking**: Enrollment job status monitoring
6. **Audit Logs**: Security event viewer
7. **Settings**: Profile and system configuration

---

## 📊 Current Status

### ✅ What's Implemented (100% UI Complete)

#### Pages & Components (43 files, 7,957 lines)
- ✅ **Authentication**
  - `LoginPage.tsx` - Full login form with validation
  - `ProtectedRoute.tsx` - Route guards for authenticated users

- ✅ **Dashboard**
  - `DashboardPage.tsx` - Main dashboard with 6 KPI cards
  - Statistics cards (Total Users, Active, Inactive, Pending, Enrollments, Success Rate)
  - Line chart: User growth over 7 months
  - Pie chart: Authentication methods distribution
  - Bar chart: Enrollment success vs failed

- ✅ **User Management**
  - `UsersPage.tsx` - User list with table
  - `UserFormDialog.tsx` - Create/Edit user form with validation
  - Search functionality
  - Status filters (All, Active, Inactive, Pending)
  - Role badges
  - Delete confirmation dialog

- ✅ **Tenant Management**
  - `TenantsPage.tsx` - Tenant list
  - Capacity tracking with progress bars
  - Status badges (Active, Trial, Suspended)
  - CRUD operations

- ✅ **Biometric Enrollments**
  - `EnrollmentsPage.tsx` - Enrollment job tracking
  - Quality and liveness score display
  - Job status filtering
  - Retry failed enrollments

- ✅ **Audit Logs**
  - `AuditLogsPage.tsx` - Security activity viewer
  - Action type filters (8 types)
  - Expandable JSON details
  - IP address and user agent display

- ✅ **Settings**
  - `SettingsPage.tsx` - Profile and system settings
  - Security settings (2FA, session timeout)
  - Notification preferences
  - Appearance settings

#### Services (8 files)
- ✅ `api.ts` - Axios client configuration
- ✅ `authService.ts` - Authentication (75% backend integrated)
- ✅ `usersService.ts` - User CRUD (100% backend integrated)
- ✅ `dashboardService.ts` - Statistics (100% backend integrated)
- ✅ `enrollmentsService.ts` - Biometric enrollments (50% integrated)
- ✅ `tenantsService.ts` - Tenant management (mock mode only)
- ✅ `auditLogsService.ts` - Audit logs (mock mode only)
- ✅ `settingsService.ts` - Settings (mock mode only)

#### State Management (Redux Toolkit)
- ✅ `authSlice.ts` - Auth state with token persistence
- ✅ `usersSlice.ts` - Users state management
- ✅ Redux Persist for token storage
- ✅ Automatic token refresh logic

#### UI Components
- ✅ Material-UI v5 components
- ✅ Custom theme with primary/secondary colors
- ✅ Responsive layout
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications (snackbar)

### ⚠️ What's Partially Complete (75% Backend Integration)

#### Completed Integrations
- ✅ `authService.ts` - Login endpoint connected
- ✅ `usersService.ts` - All CRUD operations connected
- ✅ `dashboardService.ts` - Statistics endpoint connected
- ✅ `.env` file created with API URL configuration
- ✅ CORS configured in backend

#### Remaining Integrations (25%)
- ⚠️ `authService.ts` - Missing: refresh, logout, me endpoints
- ⚠️ `enrollmentsService.ts` - Prepared but needs testing
- ❌ `tenantsService.ts` - Waiting for backend endpoints
- ❌ `auditLogsService.ts` - Waiting for backend endpoints
- ❌ Token refresh automatic retry logic
- ❌ Error handling for network failures
- ❌ Loading states for all API calls

---

## 🏗️ Architecture

### Technology Stack
```yaml
Framework: React 18
Language: TypeScript 5
Build Tool: Vite 5
UI Library: Material-UI (MUI) v5
State Management: Redux Toolkit + Redux Persist
Routing: React Router v6
Forms: React Hook Form + Zod validation
Charts: Recharts 2.12
HTTP Client: Axios 1.6+
Date Handling: date-fns
```

### Project Structure
```
web-app/
├── src/
│   ├── pages/              # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── TenantsPage.tsx
│   │   ├── EnrollmentsPage.tsx
│   │   ├── AuditLogsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── LoginPage.tsx
│   ├── components/         # Reusable components
│   │   ├── Layout.tsx
│   │   ├── UserFormDialog.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   ├── services/           # API services
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── usersService.ts
│   │   ├── dashboardService.ts
│   │   └── ...
│   ├── store/              # Redux store
│   │   ├── store.ts
│   │   ├── authSlice.ts
│   │   └── usersSlice.ts
│   ├── types/              # TypeScript interfaces
│   │   ├── user.ts
│   │   ├── tenant.ts
│   │   └── ...
│   ├── utils/              # Utility functions
│   ├── App.tsx
│   └── main.tsx
├── .env                    # Environment variables
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Component Architecture
```
┌─────────────────────────────────────────┐
│            App.tsx                       │
│  (Router, Theme Provider, Redux)        │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Layout.tsx                     │     │
│  │  (Sidebar, Header, Content)    │     │
│  │  ┌──────────────────────────┐  │     │
│  │  │  Page Components          │  │     │
│  │  │  - DashboardPage         │  │     │
│  │  │  - UsersPage             │  │     │
│  │  │  - TenantsPage           │  │     │
│  │  │  - etc.                  │  │     │
│  │  └──────────────────────────┘  │     │
│  └────────────────────────────────┘     │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Services (API Layer)          │     │
│  │  - authService.ts              │     │
│  │  - usersService.ts             │     │
│  │  - dashboardService.ts         │     │
│  └────────────────────────────────┘     │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Redux Store                   │     │
│  │  - authSlice                   │     │
│  │  - usersSlice                  │     │
│  └────────────────────────────────┘     │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🧩 Component Structure

### Key Components

#### 1. Authentication
```tsx
// LoginPage.tsx
- Email/password form
- Form validation (Zod)
- Error messages
- Loading state
- Remember me checkbox

// ProtectedRoute.tsx
- Checks auth token
- Redirects to login if not authenticated
- Validates token expiration
```

#### 2. Dashboard
```tsx
// DashboardPage.tsx
- 6 statistics cards with icons
- Line chart: User growth (7 months)
- Pie chart: Auth methods distribution
- Bar chart: Enrollment success/failed
- Refresh button
- Date range filter (future)
```

#### 3. User Management
```tsx
// UsersPage.tsx
- Search bar
- Status filter dropdown
- User table with pagination
- Add user button
- Edit/Delete actions
- UserFormDialog component

// UserFormDialog.tsx
- Create/Edit form
- Field validation (React Hook Form + Zod)
- Email, firstName, lastName, role, status
- Save/Cancel buttons
```

#### 4. Tenant Management
```tsx
// TenantsPage.tsx
- Tenant list table
- Capacity progress bars
- Status badges
- Add tenant button
- Edit/Delete actions
```

#### 5. Enrollments
```tsx
// EnrollmentsPage.tsx
- Enrollment job list
- Quality/liveness scores
- Status badges (Pending, Processing, Complete, Failed)
- Retry failed button
- Filter by status
```

#### 6. Audit Logs
```tsx
// AuditLogsPage.tsx
- Audit log table
- Action type filter
- IP address display
- Expandable JSON details
- Date range filter
```

---

## 🔄 State Management

### Redux Store Structure

```typescript
// Root State
interface RootState {
  auth: AuthState;
  users: UsersState;
}

// Auth Slice
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Users Slice (example)
interface UsersState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
  };
}
```

### Redux Actions
```typescript
// authSlice.ts
- login(credentials)
- logout()
- refreshToken()
- setUser(user)
- clearError()

// usersSlice.ts
- fetchUsers()
- createUser(user)
- updateUser(id, user)
- deleteUser(id)
- setFilters(filters)
```

---

## 📝 Implementation Tasks

### Phase 1: Fix npm/Vite Installation (0.5-1 hour)
**Priority**: 🔴 CRITICAL (Prerequisite for all other work)

#### Task 1.1: Resolve Package Manager Issues
- [ ] Try pnpm: `npm install -g pnpm && pnpm install`
- [ ] Try yarn: `npm install -g yarn && yarn install`
- [ ] If both fail, move project out of OneDrive
- [ ] Verify `npm run dev` starts successfully

**Acceptance Criteria**:
- ✅ Can install dependencies without errors
- ✅ Can run `pnpm dev` (or `yarn dev`)
- ✅ App loads at http://localhost:5173
- ✅ No console errors on startup

---

### Phase 2: Complete Backend Integration (2-3 hours)
**Priority**: 🔴 CRITICAL

#### Task 2.1: Complete AuthService Integration
- [ ] Implement `POST /auth/refresh` endpoint call
- [ ] Implement `POST /auth/logout` endpoint call
- [ ] Implement `GET /auth/me` endpoint call
- [ ] Add automatic token refresh logic (refresh 5 min before expiry)
- [ ] Add retry logic for network failures
- [ ] Update Redux authSlice actions

```typescript
// authService.ts additions
export const refreshAccessToken = async (): Promise<AuthResponse> => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await api.post('/auth/refresh', { refreshToken });
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};
```

#### Task 2.2: Complete EnrollmentsService Integration
- [ ] Connect to `GET /api/v1/biometric/enrollments`
- [ ] Connect to `POST /api/v1/biometric/enroll`
- [ ] Connect to `POST /api/v1/biometric/enrollments/{id}/retry`
- [ ] Map backend response to frontend types
- [ ] Test enrollment flow end-to-end

#### Task 2.3: Connect TenantsService (if backend ready)
- [ ] Check if backend has tenant endpoints implemented
- [ ] If yes: Connect all CRUD operations
- [ ] If no: Keep in mock mode with TODO comments
- [ ] Update service documentation

#### Task 2.4: Connect AuditLogsService (if backend ready)
- [ ] Check if backend has audit log endpoints implemented
- [ ] If yes: Connect `GET /audit-logs` with filters
- [ ] If no: Keep in mock mode with TODO comments
- [ ] Update service documentation

**Acceptance Criteria**:
- ✅ Login → Dashboard → Users works end-to-end
- ✅ Token automatically refreshes before expiration
- ✅ Logout invalidates tokens
- ✅ All user CRUD operations use real API
- ✅ Dashboard statistics show real data
- ✅ Enrollments page shows real biometric data (if available)

---

### Phase 3: Error Handling & UX Improvements (1-2 hours)
**Priority**: 🟠 HIGH

#### Task 3.1: Implement Global Error Handling
- [ ] Create Axios interceptor for 401 errors (auto logout)
- [ ] Create Axios interceptor for 500 errors (show error toast)
- [ ] Add network error detection (offline mode)
- [ ] Add retry logic for transient failures

```typescript
// api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      // If refresh fails, logout and redirect to login
    }
    if (error.response?.status === 500) {
      // Show error toast
    }
    if (!error.response) {
      // Network error - show offline message
    }
    return Promise.reject(error);
  }
);
```

#### Task 3.2: Add Loading States
- [ ] Add loading spinners to all API calls
- [ ] Add skeleton loaders for tables
- [ ] Add progress bars for long operations
- [ ] Disable buttons during submission

#### Task 3.3: Improve Form Validation
- [ ] Add real-time validation feedback
- [ ] Add field-level error messages
- [ ] Add password strength indicator
- [ ] Add email format validation

**Acceptance Criteria**:
- ✅ User sees loading indicators during API calls
- ✅ 401 errors trigger automatic logout
- ✅ 500 errors show user-friendly messages
- ✅ Network errors show offline indicator
- ✅ Forms show clear validation errors

---

### Phase 4: Testing (2-3 hours)
**Priority**: 🟡 MEDIUM

#### Task 4.1: Integration Testing
- [ ] Test login flow (login → dashboard → logout)
- [ ] Test user CRUD flow (create → edit → delete)
- [ ] Test navigation between all pages
- [ ] Test authentication expiration and refresh
- [ ] Test error scenarios (invalid credentials, network errors)

#### Task 4.2: Cross-browser Testing
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge

#### Task 4.3: Responsive Testing
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)

**Acceptance Criteria**:
- ✅ All features work in all major browsers
- ✅ UI is responsive on all screen sizes
- ✅ No console errors during normal operation
- ✅ Forms validate correctly
- ✅ Navigation works smoothly

---

### Phase 5: Performance Optimization (1-2 hours)
**Priority**: 🟢 LOW

#### Task 5.1: Code Splitting
- [ ] Implement lazy loading for routes
- [ ] Split large components into chunks
- [ ] Optimize bundle size

```typescript
// App.tsx
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
// ...
```

#### Task 5.2: Memoization
- [ ] Use React.memo for expensive components
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for event handlers

#### Task 5.3: API Optimization
- [ ] Implement request debouncing for search
- [ ] Add caching for frequently accessed data
- [ ] Implement pagination for large lists

**Acceptance Criteria**:
- ✅ Initial page load < 2 seconds
- ✅ Route transitions < 500ms
- ✅ Search input is debounced (300ms)
- ✅ No unnecessary re-renders

---

## 🧪 Testing Requirements

### Manual Testing Checklist

#### Authentication Flow
- [ ] Login with valid credentials → Success
- [ ] Login with invalid credentials → Error message
- [ ] Token refresh before expiration → New token received
- [ ] Token expiration → Auto logout and redirect to login
- [ ] Logout → Token cleared, redirected to login
- [ ] Access protected route without token → Redirect to login

#### User Management
- [ ] View users list → Data loads from API
- [ ] Search users → Filtered results
- [ ] Create user → User appears in list
- [ ] Edit user → Changes saved and reflected
- [ ] Delete user → User removed from list
- [ ] Form validation → Invalid inputs show errors

#### Dashboard
- [ ] Statistics cards show correct numbers
- [ ] Charts render without errors
- [ ] Data refreshes when page loads

#### Tenant Management
- [ ] View tenants list
- [ ] Create tenant
- [ ] Edit tenant
- [ ] Delete tenant
- [ ] Capacity tracking shows correct percentages

#### Audit Logs
- [ ] View audit logs
- [ ] Filter by action type
- [ ] Expand JSON details
- [ ] Pagination works

---

## 🚀 Deployment

### Environment Variables

```bash
# .env (development)
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENV=development
VITE_MOCK_MODE=false

# .env.production
VITE_API_BASE_URL=https://api.fivucsas.com/api/v1
VITE_ENV=production
VITE_MOCK_MODE=false
```

### Build Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm tsc --noEmit

# Linting
pnpm eslint src/
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://identity-core-api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔗 Integration Points

### Backend API Integration

```typescript
// Expected API contracts

// Auth endpoints
POST   /api/v1/auth/login           → { accessToken, refreshToken, user }
POST   /api/v1/auth/refresh         → { accessToken, refreshToken }
POST   /api/v1/auth/logout          → 204 No Content
GET    /api/v1/auth/me              → { user }

// User endpoints
GET    /api/v1/users                → { users: User[], total: number }
GET    /api/v1/users/{id}           → User
POST   /api/v1/users                → User
PUT    /api/v1/users/{id}           → User
DELETE /api/v1/users/{id}           → 204 No Content

// Dashboard endpoints
GET    /api/v1/statistics           → DashboardStats

// Tenant endpoints (if implemented)
GET    /api/v1/tenants              → Tenant[]
POST   /api/v1/tenants              → Tenant
PUT    /api/v1/tenants/{id}         → Tenant
DELETE /api/v1/tenants/{id}         → 204 No Content

// Audit log endpoints (if implemented)
GET    /api/v1/audit-logs           → AuditLog[]
GET    /api/v1/audit-logs/{id}      → AuditLog

// Biometric endpoints
GET    /api/v1/biometric/enrollments → Enrollment[]
POST   /api/v1/biometric/enroll      → { jobId }
```

### Type Definitions

```typescript
// User type
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

// Auth response
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: User;
}

// Dashboard statistics
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  totalEnrollments: number;
  successRate: number;
  userGrowth: Array<{ month: string; users: number }>;
  authMethods: Array<{ name: string; value: number }>;
  enrollmentStats: Array<{ month: string; success: number; failed: number }>;
}
```

---

## 📈 Success Criteria

### Functionality
- ✅ All pages load without errors
- ✅ Authentication flow works end-to-end
- ✅ User CRUD operations complete successfully
- ✅ Dashboard shows real-time data
- ✅ Forms validate inputs correctly
- ✅ Error messages are user-friendly

### Performance
- ✅ Initial page load < 2 seconds
- ✅ Route transitions < 500ms
- ✅ API calls < 1 second (p95)
- ✅ No UI freezes or jank

### User Experience
- ✅ UI is responsive on all screen sizes
- ✅ Loading states provide feedback
- ✅ Error messages are clear
- ✅ Navigation is intuitive
- ✅ Forms are easy to use

### Quality
- ✅ No console errors in production
- ✅ TypeScript strict mode enabled
- ✅ Code is well-organized and documented
- ✅ Follows React best practices

---

## 📅 Implementation Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **Phase 1** | Fix npm/Vite Installation | 0.5-1 hour | 🔴 CRITICAL |
| **Phase 2** | Complete Backend Integration | 2-3 hours | 🔴 CRITICAL |
| **Phase 3** | Error Handling & UX | 1-2 hours | 🟠 HIGH |
| **Phase 4** | Testing | 2-3 hours | 🟡 MEDIUM |
| **Phase 5** | Performance Optimization | 1-2 hours | 🟢 LOW |
| **Total** | | **7-11 hours** | **~1-2 days** |

---

## 📞 Next Steps

### Immediate Actions
1. Pull latest code from repository
2. Fix npm/Vite installation issue
3. Verify app runs at http://localhost:5173
4. Test in mock mode to ensure UI works
5. Start backend integration (Phase 2)

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/Rollingcat-Software/web-app.git
cd web-app

# Install dependencies (try pnpm first)
npm install -g pnpm
pnpm install

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENV=development
VITE_MOCK_MODE=false
EOF

# Start development server
pnpm dev

# Open in browser
# http://localhost:5173
```

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Owner**: Frontend Team
**Review Date**: Weekly during implementation
