import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User, LoginRequest, RegisterRequest, LoginResponse, OtpRequest, OtpResponse } from '../../types'
import { authApi } from '../../services/authApi'

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
      return { message: 'OTP sent successfully' }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send OTP')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      if (state.auth.user?.id) {
        await authApi.logout(state.auth.user.id)
      }
      localStorage.removeItem('token')
      return null
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

export const loadUserFromToken = createAsyncThunk(
  'auth/loadUserFromToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      // Try to get cached user data first
      const cachedUserData = localStorage.getItem('userData')
      let user = cachedUserData ? JSON.parse(cachedUserData) : null
      
      // Get fresh user data from database via API - use authApi instead of direct fetch
      try {
        const { user: freshUser } = await authApi.getProfile();
        user = freshUser;
        // Store user data in localStorage for persistence across page refreshes
        localStorage.setItem('userData', JSON.stringify(user));
      } catch (error) {
        // If API call fails, continue with cached data if available
        console.error('Failed to fetch profile:', error);
        
        // Only throw error if we don't have cached data and we're not in development mode
        if (!user && process.env.NODE_ENV !== 'development') {
          throw new Error('Failed to fetch user profile and no cached data available');
        }
        
        // In development mode, if backend is not available, use mock data
        if (!user && process.env.NODE_ENV === 'development') {
          console.warn('Using mock user data in development mode');
          user = {
            id: 'mock-user-id',
            email: 'mock@example.com',
            fullName: 'Mock User',
            phoneNumber: '1234567890',
            role: 'USER',
            isActive: true,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('userData', JSON.stringify(user));
        }
      }
      
      if (!user) {
        throw new Error('User profile not found')
      }
      
      return { user, token }
    } catch (error: any) {
      // Don't remove token on network errors to prevent logout on temporary issues
      if (error.message === 'No token found' || error.message === 'User profile not found') {
        localStorage.removeItem('token')
      }
      
      // If we have cached user data, don't reject the promise
      const cachedUserData = localStorage.getItem('userData')
      if (cachedUserData) {
        const user = JSON.parse(cachedUserData)
        const token = localStorage.getItem('token')
        if (user && token) {
          return { user, token }
        }
      }
      
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
    setRequiresOtp: (state, action: PayloadAction<boolean>) => {
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
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = !!action.payload.token
        state.requiresOtp = action.payload.requiresOtp
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Login failed'
        state.requiresOtp = false
      })
      
      // Register
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
        state.error = typeof action.payload === 'string' ? action.payload : 'Registration failed'
      })
      
      // Verify OTP
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
        state.error = typeof action.payload === 'string' ? action.payload : 'OTP verification failed'
      })
      
      // Send OTP
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
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to send OTP'
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = null
      })
      
      // Get Profile
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
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to get profile'
        // If profile fetch fails, user might not be authenticated
        if (action.payload === 'Unauthorized') {
          state.isAuthenticated = false
          state.token = null
          localStorage.removeItem('token')
        }
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
        
        // Always save user data to localStorage when it's updated
        if (action.payload.user) {
          localStorage.setItem('userData', JSON.stringify(action.payload.user))
        }
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.requiresOtp = false
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to load user'
      })
  },
})

export const { clearError, setRequiresOtp, clearAuth } = authSlice.actions
export default authSlice.reducer
