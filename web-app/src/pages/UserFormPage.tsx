import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Save, Cancel } from '@mui/icons-material'
import usersService from '../services/usersService'
import { UserRole, UserStatus, User } from '../types'

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  tenantId: z.number().min(1, 'Tenant ID is required'),
})

type UserFormData = z.infer<typeof userSchema>

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: UserRole.USER,
      status: UserStatus.PENDING_ENROLLMENT,
      tenantId: 1,
    },
  })

  useEffect(() => {
    if (isEditMode && id) {
      const fetchUser = async () => {
        setFetchLoading(true)
        try {
          const user = await usersService.getUserById(parseInt(id))
          reset({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            tenantId: user.tenantId,
          })
        } catch (error: any) {
          setError(error.message || 'Failed to load user')
        } finally {
          setFetchLoading(false)
        }
      }
      fetchUser()
    }
  }, [id, isEditMode, reset])

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    setError(null)

    try {
      if (isEditMode && id) {
        const updatedUser: User = {
          id: parseInt(id),
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await usersService.updateUser(parseInt(id), updatedUser)
      } else {
        const newUser: Omit<User, 'id'> = {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await usersService.createUser(newUser)
      }
      navigate('/users')
    } catch (error: any) {
      setError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} user`)
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {isEditMode ? 'Edit User' : 'Create New User'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {isEditMode ? 'Update user information and permissions' : 'Add a new user to the system'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, maxWidth: 800 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isEditMode}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    fullWidth
                    required
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />

              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    fullWidth
                    required
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Box>

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Role"
                  select
                  fullWidth
                  required
                  error={!!errors.role}
                  helperText={errors.role?.message}
                >
                  <MenuItem value={UserRole.USER}>User</MenuItem>
                  <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                  <MenuItem value={UserRole.SUPER_ADMIN}>Super Admin</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Status"
                  select
                  fullWidth
                  required
                  error={!!errors.status}
                  helperText={errors.status?.message}
                >
                  <MenuItem value={UserStatus.PENDING_ENROLLMENT}>Pending Enrollment</MenuItem>
                  <MenuItem value={UserStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={UserStatus.SUSPENDED}>Suspended</MenuItem>
                  <MenuItem value={UserStatus.LOCKED}>Locked</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="tenantId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tenant ID"
                  type="number"
                  fullWidth
                  required
                  error={!!errors.tenantId}
                  helperText={errors.tenantId?.message}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => navigate('/users')}
                disabled={isSubmitting || loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={isSubmitting || loading}
              >
                {isEditMode ? 'Update User' : 'Create User'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  )
}
