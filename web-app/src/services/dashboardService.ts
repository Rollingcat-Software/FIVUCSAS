import { DashboardStats } from '../types'

// Mock mode
const MOCK_MODE = true

// Mock dashboard statistics
const MOCK_STATS: DashboardStats = {
  totalUsers: 1247,
  activeUsers: 1089,
  pendingEnrollments: 23,
  successfulEnrollments: 1156,
  failedEnrollments: 68,
  authSuccessRate: 98.5,
  verificationSuccessRate: 94.4,
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    if (MOCK_MODE) {
      await this.delay(300)
      return MOCK_STATS
    }

    // Real API call
    // const response = await api.get<DashboardStats>('/dashboard/stats')
    // return response.data
    throw new Error('Backend not implemented')
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default new DashboardService()
