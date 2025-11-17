import { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Avatar,
  Alert,
} from '@mui/material'
import {
  Save,
  Person,
  Security,
  Notifications,
  Palette,
} from '@mui/icons-material'
import { RootState } from '../store'

export default function SettingsPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [saved, setSaved] = useState(false)

  // Profile settings
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [email, setEmail] = useState(user?.email || '')

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState(true)

  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('30')

  // Appearance settings
  const [darkMode, setDarkMode] = useState(false)
  const [compactView, setCompactView] = useState(false)

  const handleSaveProfile = () => {
    // Save profile settings
    console.log('Saving profile settings:', { firstName, lastName, email })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveNotifications = () => {
    // Save notification settings
    console.log('Saving notification settings:', {
      emailNotifications,
      loginAlerts,
      weeklyReports,
      securityAlerts,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveSecurity = () => {
    // Save security settings
    console.log('Saving security settings:', { twoFactorAuth, sessionTimeout })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveAppearance = () => {
    // Save appearance settings
    console.log('Saving appearance settings:', { darkMode, compactView })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account preferences and settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Profile Information
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mr: 3,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                }}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Button variant="outlined" size="small">
                Change Avatar
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Role"
                  value={user?.role || ''}
                  disabled
                  helperText="Role is managed by administrators"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveProfile}
              >
                Save Profile
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Security sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Security
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorAuth}
                    onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  />
                }
                label="Enable Two-Factor Authentication"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Add an extra layer of security to your account
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <TextField
              fullWidth
              select
              label="Session Timeout"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">8 hours</option>
            </TextField>

            <Divider sx={{ my: 2 }} />

            <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
              Change Password
            </Button>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveSecurity}
              >
                Save Security
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Notifications sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Notifications
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                }
                label="Email Notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={loginAlerts}
                    onChange={(e) => setLoginAlerts(e.target.checked)}
                  />
                }
                label="Login Alerts"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={securityAlerts}
                    onChange={(e) => setSecurityAlerts(e.target.checked)}
                  />
                }
                label="Security Alerts"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={weeklyReports}
                    onChange={(e) => setWeeklyReports(e.target.checked)}
                  />
                }
                label="Weekly Reports"
              />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveNotifications}
              >
                Save Notifications
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Palette sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Appearance
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Use dark theme for reduced eye strain
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={compactView}
                      onChange={(e) => setCompactView(e.target.checked)}
                    />
                  }
                  label="Compact View"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Show more content with reduced spacing
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveAppearance}
              >
                Save Appearance
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
