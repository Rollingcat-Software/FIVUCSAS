import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material'
import {
  People,
  PersonAdd,
  CheckCircle,
  Error,
  TrendingUp,
  Fingerprint,
} from '@mui/icons-material'
import { AppDispatch, RootState } from '../store'
import { setStats, setLoading } from '../store/slices/dashboardSlice'
import dashboardService from '../services/dashboardService'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight={600}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}.lighter`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { stats, loading } = useSelector((state: RootState) => state.dashboard)

  useEffect(() => {
    const fetchStats = async () => {
      dispatch(setLoading(true))
      try {
        const data = await dashboardService.getStats()
        dispatch(setStats(data))
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        dispatch(setLoading(false))
      }
    }

    fetchStats()
  }, [dispatch])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!stats) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back! Here's what's happening with your platform.
      </Typography>

      <Grid container spacing={3}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<People sx={{ fontSize: 32 }} />}
            color="primary"
          />
        </Grid>

        {/* Active Users */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            icon={<CheckCircle sx={{ fontSize: 32 }} />}
            color="success"
            subtitle={`${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total`}
          />
        </Grid>

        {/* Pending Enrollments */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pending Enrollments"
            value={stats.pendingEnrollments}
            icon={<PersonAdd sx={{ fontSize: 32 }} />}
            color="warning"
          />
        </Grid>

        {/* Successful Enrollments */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Successful Enrollments"
            value={stats.successfulEnrollments.toLocaleString()}
            icon={<Fingerprint sx={{ fontSize: 32 }} />}
            color="success"
          />
        </Grid>

        {/* Failed Enrollments */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Failed Enrollments"
            value={stats.failedEnrollments}
            icon={<Error sx={{ fontSize: 32 }} />}
            color="error"
          />
        </Grid>

        {/* Auth Success Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Auth Success Rate"
            value={`${stats.authSuccessRate}%`}
            icon={<TrendingUp sx={{ fontSize: 32 }} />}
            color="info"
          />
        </Grid>

        {/* Recent Activity Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                System Overview
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Verification Success Rate
                    </Typography>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      {stats.verificationSuccessRate}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Enrollments
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {(stats.successfulEnrollments + stats.failedEnrollments).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
