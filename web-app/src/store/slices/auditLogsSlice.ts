import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuditLog, PaginatedResponse } from '../../types'

interface AuditLogsState {
  logs: AuditLog[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    size: number
    totalPages: number
    totalElements: number
  }
}

const initialState: AuditLogsState = {
  logs: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    size: 50,
    totalPages: 0,
    totalElements: 0,
  },
}

const auditLogsSlice = createSlice({
  name: 'auditLogs',
  initialState,
  reducers: {
    setLogs: (state, action: PayloadAction<PaginatedResponse<AuditLog>>) => {
      state.logs = action.payload.content
      state.pagination = {
        page: action.payload.page,
        size: action.payload.size,
        totalPages: action.payload.totalPages,
        totalElements: action.payload.totalElements,
      }
    },
    addLog: (state, action: PayloadAction<AuditLog>) => {
      state.logs.unshift(action.payload)
      state.pagination.totalElements += 1
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setLogs, addLog, setLoading, setError } = auditLogsSlice.actions
export default auditLogsSlice.reducer
