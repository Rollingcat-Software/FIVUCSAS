import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User, PaginatedResponse } from '../../types'

interface UsersState {
  users: User[]
  selectedUser: User | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    size: number
    totalPages: number
    totalElements: number
  }
}

const initialState: UsersState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
  pagination: {
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  },
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<PaginatedResponse<User>>) => {
      state.users = action.payload.content
      state.pagination = {
        page: action.payload.page,
        size: action.payload.size,
        totalPages: action.payload.totalPages,
        totalElements: action.payload.totalElements,
      }
    },
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setUsers, setSelectedUser, setLoading, setError } = usersSlice.actions
export default usersSlice.reducer
