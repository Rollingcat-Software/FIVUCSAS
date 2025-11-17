import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, LoginRequest, LoginResponse, User } from '../../types'
import authService from '../../services/authService'

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
}

// Async thunks
export const login = createAsyncThunk<LoginResponse, LoginRequest>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const refreshToken = createAsyncThunk<LoginResponse, string>(
  'auth/refreshToken',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken(token)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.error = null
    },
    clearCredentials: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.error = null
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Refresh token
      .addCase(refreshToken.pending, (state) => {
        state.loading = true
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
      })
      .addCase(refreshToken.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.error = null
      })
  },
})

export const { setCredentials, clearCredentials, updateUser } = authSlice.actions
export default authSlice.reducer
