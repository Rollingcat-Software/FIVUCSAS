import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Tenant } from '../../types'

interface TenantsState {
  tenants: Tenant[]
  loading: boolean
  error: string | null
}

const initialState: TenantsState = {
  tenants: [],
  loading: false,
  error: null,
}

const tenantsSlice = createSlice({
  name: 'tenants',
  initialState,
  reducers: {
    setTenants: (state, action: PayloadAction<Tenant[]>) => {
      state.tenants = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setTenants, setLoading, setError } = tenantsSlice.actions
export default tenantsSlice.reducer
