import { Tenant, PaginatedResponse, TenantStatus } from '../types'

// Mock mode
const MOCK_MODE = true

// Mock tenants data
const MOCK_TENANTS: Tenant[] = [
  {
    id: 1,
    name: 'Acme Corporation',
    domain: 'acme.com',
    status: TenantStatus.ACTIVE,
    maxUsers: 100,
    currentUsers: 45,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 2,
    name: 'TechStart Inc',
    domain: 'techstart.io',
    status: TenantStatus.TRIAL,
    maxUsers: 50,
    currentUsers: 12,
    createdAt: '2025-02-15T10:00:00Z',
    updatedAt: '2025-02-15T10:00:00Z',
  },
  {
    id: 3,
    name: 'Global Enterprises',
    domain: 'globalent.com',
    status: TenantStatus.ACTIVE,
    maxUsers: 500,
    currentUsers: 287,
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 4,
    name: 'Startup XYZ',
    domain: 'startupxyz.com',
    status: TenantStatus.SUSPENDED,
    maxUsers: 25,
    currentUsers: 8,
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-11-15T10:00:00Z',
  },
]

class TenantsService {
  async getTenants(page: number = 0, size: number = 20): Promise<PaginatedResponse<Tenant>> {
    if (MOCK_MODE) {
      await this.delay(400)

      return {
        content: MOCK_TENANTS,
        totalElements: MOCK_TENANTS.length,
        totalPages: 1,
        page,
        size,
      }
    }

    // Real API call
    // const response = await api.get<PaginatedResponse<Tenant>>(`/tenants?page=${page}&size=${size}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async getTenantById(id: number): Promise<Tenant> {
    if (MOCK_MODE) {
      await this.delay(300)
      const tenant = MOCK_TENANTS.find(t => t.id === id)
      if (!tenant) throw new Error('Tenant not found')
      return tenant
    }

    // Real API call
    // const response = await api.get<Tenant>(`/tenants/${id}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async createTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    if (MOCK_MODE) {
      await this.delay(500)
      const newTenant: Tenant = {
        ...tenant,
        id: Math.max(...MOCK_TENANTS.map(t => t.id)) + 1,
      }
      MOCK_TENANTS.push(newTenant)
      return newTenant
    }

    // Real API call
    // const response = await api.post<Tenant>('/tenants', tenant)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async updateTenant(id: number, tenant: Tenant): Promise<Tenant> {
    if (MOCK_MODE) {
      await this.delay(400)
      const index = MOCK_TENANTS.findIndex(t => t.id === id)
      if (index === -1) throw new Error('Tenant not found')
      MOCK_TENANTS[index] = { ...tenant, id, updatedAt: new Date().toISOString() }
      return MOCK_TENANTS[index]
    }

    // Real API call
    // const response = await api.put<Tenant>(`/tenants/${id}`, tenant)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async deleteTenant(id: number): Promise<void> {
    if (MOCK_MODE) {
      await this.delay(300)
      const index = MOCK_TENANTS.findIndex(t => t.id === id)
      if (index !== -1) {
        MOCK_TENANTS.splice(index, 1)
      }
      console.log(`Mock: Delete tenant ${id}`)
      return
    }

    // Real API call
    // await api.delete(`/tenants/${id}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default new TenantsService()
