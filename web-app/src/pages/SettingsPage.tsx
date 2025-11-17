import { Box, Typography, Paper } from '@mui/material'

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account and preferences
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <Typography variant="h6" color="text.secondary">
          User Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Coming soon
        </Typography>
      </Paper>
    </Box>
  )
}
