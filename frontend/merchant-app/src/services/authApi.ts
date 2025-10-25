import api from './api'
import { LoginRequest, RegisterRequest, OtpRequest, User, LoginResponse, OtpResponse } from '../types'

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  async register(userData: RegisterRequest): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  async verifyOtp(otpData: OtpRequest): Promise<OtpResponse> {
    const response = await api.post('/auth/verify-otp', otpData)
    return response.data
  },

  async sendOtp(userId: string, type: 'LOGIN' | 'PAYMENT' | 'RESET_PASSWORD'): Promise<void> {
    await api.post('/auth/send-otp', { userId, type })
  },

  async logout(userId: string): Promise<void> {
    await api.post('/auth/logout', { userId })
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get('/users/profile')
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },
}
