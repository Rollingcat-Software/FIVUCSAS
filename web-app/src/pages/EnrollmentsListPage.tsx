import { Box, Typography, Paper } from '@mui/material'

export default function EnrollmentsListPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Biometric Enrollments
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Track biometric enrollment jobs and status
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <Typography variant="h6" color="text.secondary">
          Enrollment Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Coming soon
        </Typography>
      </Paper>
    </Box>
  )
}
