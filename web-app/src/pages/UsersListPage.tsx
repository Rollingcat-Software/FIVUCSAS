import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  Add,
  Search,
  Visibility,
  Edit,
  Delete,
} from '@mui/icons-material'
import { AppDispatch, RootState } from '../store'
import { setUsers, setLoading } from '../store/slices/usersSlice'
import usersService from '../services/usersService'
import { UserStatus, UserRole } from '../types'
import { format } from 'date-fns'

function getStatusColor(status: UserStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case UserStatus.ACTIVE:
      return 'success'
    case UserStatus.PENDING_ENROLLMENT:
      return 'warning'
    case UserStatus.SUSPENDED:
    case UserStatus.LOCKED:
      return 'error'
    default:
      return 'default'
  }
}

function getRoleColor(role: UserRole): 'primary' | 'secondary' | 'default' {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'secondary'
    case UserRole.ADMIN:
      return 'primary'
    default:
      return 'default'
  }
}

export default function UsersListPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { users, loading } = useSelector((state: RootState) => state.users)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      dispatch(setLoading(true))
      try {
        const data = await usersService.getUsers(0, 20)
        dispatch(setUsers(data))
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        dispatch(setLoading(false))
      }
    }

    fetchUsers()
  }, [dispatch])

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersService.deleteUser(id)
        // Refresh users list
        const data = await usersService.getUsers(0, 20)
        dispatch(setUsers(data))
      } catch (error) {
        console.error('Failed to delete user:', error)
      }
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Users
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user accounts and permissions
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/users/create')}
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={4}>
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" color={getRoleColor(user.role)} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(user.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt
                        ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')
                        : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/users/${user.id}`)}
                        title="View details"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/users/${user.id}/edit`)}
                        title="Edit user"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id)}
                        color="error"
                        title="Delete user"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
