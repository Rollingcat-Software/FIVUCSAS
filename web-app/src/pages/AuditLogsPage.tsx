import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Search,
  ExpandMore,
  Security,
  Person,
  Login,
  Logout,
  Edit,
  Delete,
  Warning,
  Settings,
} from '@mui/icons-material'
import auditLogsService from '../services/auditLogsService'
import { AuditLog } from '../types'
import { format } from 'date-fns'

function getActionIcon(action: string) {
  if (action.includes('LOGIN')) return <Login fontSize="small" />
  if (action.includes('LOGOUT')) return <Logout fontSize="small" />
  if (action.includes('CREATED')) return <Person fontSize="small" />
  if (action.includes('UPDATED')) return <Edit fontSize="small" />
  if (action.includes('DELETED')) return <Delete fontSize="small" />
  if (action.includes('FAILED')) return <Warning fontSize="small" />
  if (action.includes('SETTINGS')) return <Settings fontSize="small" />
  if (action.includes('BIOMETRIC') || action.includes('VERIFICATION')) return <Security fontSize="small" />
  return <Security fontSize="small" />
}

function getActionColor(action: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  if (action.includes('LOGIN') && !action.includes('FAILED')) return 'success'
  if (action.includes('CREATED')) return 'info'
  if (action.includes('DELETED')) return 'error'
  if (action.includes('FAILED')) return 'error'
  if (action.includes('UPDATED') || action.includes('SETTINGS')) return 'warning'
  return 'default'
}

const ACTION_TYPES = [
  'ALL',
  'USER_LOGIN',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'BIOMETRIC_VERIFICATION',
  'FAILED_LOGIN_ATTEMPT',
  'PASSWORD_RESET',
  'SETTINGS_UPDATED',
]

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('ALL')

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const action = actionFilter === 'ALL' ? undefined : actionFilter
      const data = await auditLogsService.getAuditLogs(0, 50, action)
      setAuditLogs(data.content)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [actionFilter])

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery) ||
      log.userId.toString().includes(searchQuery)
  )

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Audit Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Security audit trail and activity monitoring
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <TextField
            fullWidth
            placeholder="Search by action, user ID, IP address..."
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

        <Paper sx={{ p: 2, minWidth: 250 }}>
          <TextField
            select
            fullWidth
            label="Action Type"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {ACTION_TYPES.map((action) => (
              <MenuItem key={action} value={action}>
                {action === 'ALL' ? 'All Actions' : action.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
        </Paper>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={4}>
                      No audit logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getActionIcon(log.action)}
                        label={log.action.replace(/_/g, ' ')}
                        size="small"
                        color={getActionColor(log.action)}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.entityType}</Typography>
                      {log.entityId && (
                        <Typography variant="caption" color="text.secondary">
                          ID: {log.entityId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {log.ipAddress}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <Accordion
                          sx={{
                            boxShadow: 'none',
                            '&:before': { display: 'none' },
                            backgroundColor: 'transparent',
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMore fontSize="small" />}
                            sx={{ minHeight: 0, px: 1, py: 0 }}
                          >
                            <Typography variant="caption" color="primary">
                              View Details
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: 1, py: 1 }}>
                            <Box
                              component="pre"
                              sx={{
                                m: 0,
                                p: 1,
                                backgroundColor: 'grey.100',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                overflow: 'auto',
                                fontFamily: 'monospace',
                              }}
                            >
                              {JSON.stringify(log.details, null, 2)}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
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
