import { AuditLog, PaginatedResponse } from '../types'

// Mock mode
const MOCK_MODE = true

// Mock audit logs data
const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    userId: 1,
    tenantId: 1,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: 1,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { loginMethod: 'email', success: true },
    createdAt: '2025-11-17T10:30:00Z',
  },
  {
    id: 2,
    userId: 2,
    tenantId: 1,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: 5,
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    details: { role: 'USER', createdBy: 'admin@fivucsas.com' },
    createdAt: '2025-11-17T09:15:00Z',
  },
  {
    id: 3,
    userId: 1,
    tenantId: 1,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: 3,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { field: 'status', oldValue: 'PENDING_ENROLLMENT', newValue: 'ACTIVE' },
    createdAt: '2025-11-17T08:45:00Z',
  },
  {
    id: 4,
    userId: 5,
    tenantId: 1,
    action: 'BIOMETRIC_VERIFICATION',
    entityType: 'EnrollmentJob',
    entityId: undefined,
    ipAddress: '192.168.1.100',
    userAgent: 'FIVUCSAS Mobile App/1.0',
    details: { userId: 5, result: 'success', confidence: 0.98 },
    createdAt: '2025-11-16T18:20:00Z',
  },
  {
    id: 5,
    userId: 1,
    tenantId: 1,
    action: 'USER_DELETED',
    entityType: 'User',
    entityId: 7,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { deletedBy: 'admin@fivucsas.com', reason: 'Account closure requested' },
    createdAt: '2025-11-16T16:00:00Z',
  },
  {
    id: 6,
    userId: 3,
    tenantId: 1,
    action: 'FAILED_LOGIN_ATTEMPT',
    entityType: 'User',
    entityId: 3,
    ipAddress: '203.0.113.42',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    details: { reason: 'Invalid password', attemptCount: 3 },
    createdAt: '2025-11-16T14:30:00Z',
  },
  {
    id: 7,
    userId: 2,
    tenantId: 1,
    action: 'SETTINGS_UPDATED',
    entityType: 'Tenant',
    entityId: 1,
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    details: { setting: 'maxUsers', oldValue: 50, newValue: 100 },
    createdAt: '2025-11-16T12:00:00Z',
  },
  {
    id: 8,
    userId: 1,
    tenantId: 1,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: 4,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { resetBy: 'admin@fivucsas.com', method: 'admin_reset' },
    createdAt: '2025-11-16T10:15:00Z',
  },
]

class AuditLogsService {
  async getAuditLogs(
    page: number = 0,
    size: number = 20,
    action?: string
  ): Promise<PaginatedResponse<AuditLog>> {
    if (MOCK_MODE) {
      await this.delay(400)

      let filtered = MOCK_AUDIT_LOGS
      if (action && action !== 'ALL') {
        filtered = filtered.filter(log => log.action === action)
      }

      // Sort by most recent first
      filtered = filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return {
        content: filtered,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
        page,
        size,
      }
    }

    // Real API call
    // const params = new URLSearchParams({ page: page.toString(), size: size.toString() })
    // if (action) params.append('action', action)
    // const response = await api.get<PaginatedResponse<AuditLog>>(`/audit-logs?${params}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async getAuditLogById(id: number): Promise<AuditLog> {
    if (MOCK_MODE) {
      await this.delay(300)
      const log = MOCK_AUDIT_LOGS.find(l => l.id === id)
      if (!log) throw new Error('Audit log not found')
      return log
    }

    // Real API call
    // const response = await api.get<AuditLog>(`/audit-logs/${id}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default new AuditLogsService()
