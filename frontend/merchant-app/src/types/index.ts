export interface User {
  id: string
  email: string
  fullName: string
  phoneNumber: string
  balance: number
  role: 'USER' | 'MERCHANT'
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  transactionId: string
  senderId: string
  recipientId: string
  amount: number
  currency: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  paymentMethod: string
  qrCodeData?: string
  audioConfirmationUrl?: string
  description?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  sender?: {
    id: string
    fullName: string
    email: string
  }
  recipient?: {
    id: string
    fullName: string
    email: string
  }
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface TransactionState {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface PaymentState {
  qrCodeData: string | null
  isProcessing: boolean
  error: string | null
}

export interface SocketState {
  isConnected: boolean
  error: string | null
}

export interface AudioState {
  currentAudio: string | null
  isPlaying: boolean
  volume: number
}

export interface RootState {
  auth: AuthState
  transactions: TransactionState
  payment: PaymentState
  socket: SocketState
  audio: AudioState
}

// API Response types
export interface ApiResponse<T = any> {
  message: string
  data?: T
  error?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  phoneNumber: string
  role?: 'USER' | 'MERCHANT'
}

export interface LoginResponse {
  user: User
  token: string
  requiresOtp: boolean
}

export interface OtpRequest {
  userId: string
  code: string
  type: 'LOGIN' | 'PAYMENT' | 'RESET_PASSWORD'
}

export interface OtpResponse {
  user: User
  token: string
}

export interface InitiateTransactionRequest {
  recipientId: string
  amount: number
  description?: string
}

export interface ProcessPaymentRequest {
  transactionId: string
  otp: string
}

export interface QRScanData {
  transactionId: string
  amount: number
  currency: string
  recipientId: string
  timestamp: string
}

// Socket event types
export interface SocketEvents {
  'payment-initiated': {
    transactionId: string
    amount: number
    senderId: string
    recipientId: string
    description?: string
  }
  'payment-confirmed': {
    transactionId: string
    confirmedBy: string
  }
  'payment-success': {
    transactionId: string
    audioUrl: string
    timestamp: string
  }
  'audio-ready': {
    transactionId: string
    audioUrl: string
    type: 'user' | 'merchant'
  }
  'transaction-updated': {
    transactionId: string
    status: string
    amount?: number
    senderId?: string
    recipientId?: string
  }
  'qr-scanned': {
    transactionId: string
    scannedBy: string
    qrData: string
  }
}
