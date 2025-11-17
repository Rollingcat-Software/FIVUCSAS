import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EnrollmentJob } from '../../types'

interface EnrollmentsState {
  enrollments: EnrollmentJob[]
  loading: boolean
  error: string | null
}

const initialState: EnrollmentsState = {
  enrollments: [],
  loading: false,
  error: null,
}

const enrollmentsSlice = createSlice({
  name: 'enrollments',
  initialState,
  reducers: {
    setEnrollments: (state, action: PayloadAction<EnrollmentJob[]>) => {
      state.enrollments = action.payload
    },
    addEnrollment: (state, action: PayloadAction<EnrollmentJob>) => {
      state.enrollments.unshift(action.payload)
    },
    updateEnrollment: (state, action: PayloadAction<EnrollmentJob>) => {
      const index = state.enrollments.findIndex(e => e.id === action.payload.id)
      if (index !== -1) {
        state.enrollments[index] = action.payload
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setEnrollments, addEnrollment, updateEnrollment, setLoading, setError } = enrollmentsSlice.actions
export default enrollmentsSlice.reducer
