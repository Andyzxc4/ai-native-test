import { createSlice } from '@reduxjs/toolkit'

interface SocketState {
  isConnected: boolean
  error: string | null
}

const initialState: SocketState = {
  isConnected: false,
  error: null
}

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const { setConnected, setError, clearError } = socketSlice.actions
export default socketSlice.reducer