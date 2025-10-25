import { createSlice } from '@reduxjs/toolkit'

interface PaymentState {
  qrCodeData: string | null
  isProcessing: boolean
  error: string | null
}

const initialState: PaymentState = {
  qrCodeData: null,
  isProcessing: false,
  error: null
}

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setQRCode: (state, action) => {
      state.qrCodeData = action.payload
    },
    setProcessing: (state, action) => {
      state.isProcessing = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    clearPayment: (state) => {
      state.qrCodeData = null
      state.isProcessing = false
      state.error = null
    }
  }
})

export const { setQRCode, setProcessing, setError, clearError, clearPayment } = paymentSlice.actions
export default paymentSlice.reducer