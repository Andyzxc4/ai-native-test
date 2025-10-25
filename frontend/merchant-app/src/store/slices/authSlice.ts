import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../services/authApi'
import { LoginRequest, RegisterRequest, OtpRequest, User, LoginResponse, OtpResponse } from '../../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  requiresOtp: boolean
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  requiresOtp: false,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      if (response.requiresOtp) {
        return { ...response, token: null }
      }
      localStorage.setItem('token', response.token)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData)
      localStorage.setItem('token', response.token)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed')
    }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (otpData: OtpRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOtp(otpData)
      localStorage.setItem('token', response.token)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'OTP verification failed')
    }
  }
)

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (data: { userId: string; type: 'LOGIN' | 'PAYMENT' | 'RESET_PASSWORD' }, { rejectWithValue }) => {
    try {
      await authApi.sendOtp(data.userId, data.type)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send OTP')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (userId: string, { rejectWithValue }) => {
    try {
      await authApi.logout(userId)
      localStorage.removeItem('token')
    } catch (error: any) {
      localStorage.removeItem('token')
      return rejectWithValue(error.response?.data?.error || 'Logout failed')
    }
  }
)

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getProfile()
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get profile')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const response = await authApi.refreshToken(refreshToken)
      localStorage.setItem('token', response.token)
      return response
    } catch (error: any) {
      localStorage.removeItem('token')
      return rejectWithValue(error.response?.data?.error || 'Token refresh failed')
    }
  }
)

export const loadUserFromToken = createAsyncThunk(
  'auth/loadUserFromToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      // Extract user ID from token
      const tokenParts = token.split('-')
      const userId = tokenParts[tokenParts.length - 1]
      
      // Get user data from database via API
      const response = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (!data.success) {
        throw new Error('Failed to fetch users')
      }
      
      // Find the user by ID
      const user = data.users.find((u: any) => u.id.toString() === userId)
      if (!user) {
        throw new Error('User not found')
      }
      
      return { user, token }
    } catch (error: any) {
      localStorage.removeItem('token')
      return rejectWithValue(error.message || 'Failed to load user')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setRequiresOtp: (state, action) => {
      state.requiresOtp = action.payload
    },
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.requiresOtp = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.requiresOtp = action.payload.requiresOtp
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Login failed'
        state.requiresOtp = false
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.requiresOtp = false
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.requiresOtp = false
        state.error = null
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      .addCase(sendOtp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.error = null
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.error = null
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
      
      // Load user from token
      .addCase(loadUserFromToken.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadUserFromToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.requiresOtp = false
        state.error = null
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Operation failed'
      })
  },
})

export const { clearError, setRequiresOtp, clearAuth } = authSlice.actions
export default authSlice.reducer