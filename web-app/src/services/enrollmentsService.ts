import { EnrollmentJob, PaginatedResponse, EnrollmentStatus } from '../types'

// Mock mode
const MOCK_MODE = true

// Mock enrollments data
const MOCK_ENROLLMENTS: EnrollmentJob[] = [
  {
    id: 'enr_1234567890',
    userId: 1,
    tenantId: 1,
    status: EnrollmentStatus.SUCCESS,
    faceImageUrl: 'https://example.com/faces/user1.jpg',
    qualityScore: 0.95,
    livenessScore: 0.98,
    createdAt: '2025-11-17T10:00:00Z',
    updatedAt: '2025-11-17T10:00:15Z',
    completedAt: '2025-11-17T10:00:15Z',
  },
  {
    id: 'enr_0987654321',
    userId: 2,
    tenantId: 1,
    status: EnrollmentStatus.SUCCESS,
    faceImageUrl: 'https://example.com/faces/user2.jpg',
    qualityScore: 0.88,
    livenessScore: 0.92,
    createdAt: '2025-11-16T14:30:00Z',
    updatedAt: '2025-11-16T14:30:12Z',
    completedAt: '2025-11-16T14:30:12Z',
  },
  {
    id: 'enr_1122334455',
    userId: 3,
    tenantId: 1,
    status: EnrollmentStatus.PENDING,
    faceImageUrl: 'https://example.com/faces/user3.jpg',
    createdAt: '2025-11-17T09:00:00Z',
    updatedAt: '2025-11-17T09:00:00Z',
  },
  {
    id: 'enr_5544332211',
    userId: 4,
    tenantId: 1,
    status: EnrollmentStatus.FAILED,
    faceImageUrl: 'https://example.com/faces/user4.jpg',
    qualityScore: 0.42,
    errorCode: 'LOW_QUALITY',
    errorMessage: 'Face image quality below threshold',
    createdAt: '2025-11-15T11:00:00Z',
    updatedAt: '2025-11-15T11:00:08Z',
    completedAt: '2025-11-15T11:00:08Z',
  },
  {
    id: 'enr_6677889900',
    userId: 5,
    tenantId: 1,
    status: EnrollmentStatus.PROCESSING,
    faceImageUrl: 'https://example.com/faces/user5.jpg',
    createdAt: '2025-11-17T08:45:00Z',
    updatedAt: '2025-11-17T08:45:05Z',
  },
]

class EnrollmentsService {
  async getEnrollments(
    page: number = 0,
    size: number = 20,
    status?: EnrollmentStatus
  ): Promise<PaginatedResponse<EnrollmentJob>> {
    if (MOCK_MODE) {
      await this.delay(400)

      let filtered = MOCK_ENROLLMENTS
      if (status) {
        filtered = filtered.filter(e => e.status === status)
      }

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
    // if (status) params.append('status', status)
    // const response = await api.get<PaginatedResponse<EnrollmentJob>>(`/enrollments?${params}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async getEnrollmentById(id: string): Promise<EnrollmentJob> {
    if (MOCK_MODE) {
      await this.delay(300)
      const enrollment = MOCK_ENROLLMENTS.find(e => e.id === id)
      if (!enrollment) throw new Error('Enrollment not found')
      return enrollment
    }

    // Real API call
    // const response = await api.get<EnrollmentJob>(`/enrollments/${id}`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async retryEnrollment(id: string): Promise<EnrollmentJob> {
    if (MOCK_MODE) {
      await this.delay(500)
      const index = MOCK_ENROLLMENTS.findIndex(e => e.id === id)
      if (index === -1) throw new Error('Enrollment not found')

      MOCK_ENROLLMENTS[index] = {
        ...MOCK_ENROLLMENTS[index],
        status: EnrollmentStatus.PENDING,
        errorCode: undefined,
        errorMessage: undefined,
        updatedAt: new Date().toISOString(),
      }

      return MOCK_ENROLLMENTS[index]
    }

    // Real API call
    // const response = await api.post<EnrollmentJob>(`/enrollments/${id}/retry`)
    // return response.data
    throw new Error('Backend not implemented')
  }

  async deleteEnrollment(id: string): Promise<void> {
    if (MOCK_MODE) {
      await this.delay(300)
      const index = MOCK_ENROLLMENTS.findIndex(e => e.id === id)
      if (index !== -1) {
        MOCK_ENROLLMENTS.splice(index, 1)
      }
      console.log(`Mock: Delete enrollment ${id}`)
      return
    }

    // Real API call
    // await api.delete(`/enrollments/${id}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default new EnrollmentsService()
