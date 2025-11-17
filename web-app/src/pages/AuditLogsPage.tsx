import { Box, Typography, Paper } from '@mui/material'

export default function AuditLogsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Audit Logs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Security audit trail and activity monitoring
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <Typography variant="h6" color="text.secondary">
          Audit Log Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Coming soon
        </Typography>
      </Paper>
    </Box>
  )
}
