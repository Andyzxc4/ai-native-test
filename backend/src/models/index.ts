// Re-export Prisma models for convenience
export * from '@prisma/client';

// Additional model interfaces for API responses
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    balance: number;
    role: string;
    twoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
  requiresOtp?: boolean;
}

export interface TransactionResponse {
  id: string;
  transactionId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  qrCodeData?: string;
  audioConfirmationUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  sender?: {
    id: string;
    fullName: string;
    email: string;
  };
  recipient?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface QRCodeData {
  transactionId: string;
  amount: number;
  currency: string;
  recipientId: string;
  timestamp: string;
}

export interface AudioConfirmationData {
  transactionId: string;
  amount: number;
  recipientName: string;
  userBalance: number;
  type: 'user' | 'merchant';
}

export interface PaymentSessionData {
  transactionId: string;
  qrCodeData: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}
