import { Box, Typography, Paper } from '@mui/material'

export default function TenantsListPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Tenants
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage tenant organizations
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <Typography variant="h6" color="text.secondary">
          Tenant Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Coming soon
        </Typography>
      </Paper>
    </Box>
  )
}
