import { useParams } from 'react-router-dom'
import { Box, Typography, Paper, Button } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function UserDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/users')}
        sx={{ mb: 2 }}
      >
        Back to Users
      </Button>

      <Typography variant="h4" gutterBottom fontWeight={600}>
        User Details
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <Typography variant="h6" color="text.secondary">
          User ID: {id}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          User details page - Coming soon
        </Typography>
      </Paper>
    </Box>
  )
}
