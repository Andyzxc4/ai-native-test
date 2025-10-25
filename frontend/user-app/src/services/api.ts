import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors and connection issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    // Handle connection errors in development mode
    if (error.code === 'ERR_NETWORK' && process.env.NODE_ENV === 'development') {
      console.warn('Network error detected. Using mock responses in development mode.')
      
      // Get the request URL path
      const url = error.config.url;
      
      // Return mock responses based on the endpoint
      if (url.includes('/auth/login')) {
        return Promise.resolve({
          data: {
            user: {
              id: 'mock-user-id',
              email: error.config.data ? JSON.parse(error.config.data).email : 'mock@example.com',
              fullName: 'Mock User',
              role: 'USER'
            },
            token: 'mock-token',
            requiresOtp: false
          }
        });
      }
      
      if (url.includes('/users/profile')) {
        return Promise.resolve({
          data: {
            user: {
              id: 'mock-user-id',
              email: 'mock@example.com',
              fullName: 'Mock User',
              phoneNumber: '1234567890',
              role: 'USER',
              isActive: true,
              createdAt: new Date().toISOString()
            }
          }
        });
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
