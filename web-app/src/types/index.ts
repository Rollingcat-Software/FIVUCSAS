// ============================================================================
// Type Definitions for FIVUCSAS Admin Dashboard
// ============================================================================

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  tenantId: number
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  lastLoginIp?: string
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  PENDING_ENROLLMENT = 'PENDING_ENROLLMENT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  LOCKED = 'LOCKED',
}

export interface Tenant {
  id: number
  name: string
  domain: string
  status: TenantStatus
  maxUsers: number
  currentUsers: number
  createdAt: string
  updatedAt: string
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export interface EnrollmentJob {
  id: string
  userId: number
  tenantId: number
  status: EnrollmentStatus
  faceImageUrl: string
  qualityScore?: number
  livenessScore?: number
  errorCode?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface AuditLog {
  id: number
  userId: number
  tenantId: number
  action: string
  entityType: string
  entityId?: number
  ipAddress: string
  userAgent: string
  details?: Record<string, unknown>
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
  mfaCode?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  pendingEnrollments: number
  successfulEnrollments: number
  failedEnrollments: number
  authSuccessRate: number
  verificationSuccessRate: number
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}
