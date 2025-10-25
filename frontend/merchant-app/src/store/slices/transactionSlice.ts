import { createSlice } from '@reduxjs/toolkit'

interface TransactionState {
  transactions: any[]
  currentTransaction: any | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const initialState: TransactionState = {
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  }
}

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null
    }
  },
  extraReducers: (builder) => {
    // Add async thunks here when needed
  }
})

export const { clearError, setCurrentTransaction, clearCurrentTransaction } = transactionSlice.actions
export default transactionSlice.reducer
