import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, OtpCode } from '@prisma/client';
import { EmailService } from './email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    role?: 'USER' | 'MERCHANT';
  }): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { phoneNumber: userData.phoneNumber }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or phone number already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        role: userData.role || 'USER',
        twoFactorEnabled: true // Enable 2FA by default
      }
    });

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string; requiresOtp: boolean }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // If 2FA is enabled, require OTP
    if (user.twoFactorEnabled) {
      await this.sendOtp(user.id, 'LOGIN');
      return { 
        user: { ...user, passwordHash: '' as any }, 
        token: '', 
        requiresOtp: true 
      };
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token, requiresOtp: false };
  }

  async verifyOtp(userId: string, code: string, type: 'LOGIN' | 'PAYMENT' | 'RESET_PASSWORD'): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Find valid OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        userId,
        code,
        type,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { isUsed: true }
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async sendOtp(userId: string, type: 'LOGIN' | 'PAYMENT' | 'RESET_PASSWORD'): Promise<void> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP to database
    await prisma.otpCode.create({
      data: {
        userId,
        code,
        type,
        expiresAt
      }
    });

    // Get user for email
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Send OTP via email
    const subject = type === 'LOGIN' ? 'Login Verification Code' : 
                   type === 'PAYMENT' ? 'Payment Verification Code' : 
                   'Password Reset Code';

    await emailService.sendOtpEmail(user.email, code, subject);
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET as jwt.Secret,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, this.JWT_SECRET as jwt.Secret) as any;
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const token = this.generateToken(user.id);

    return { token };
  }

  async logout(userId: string): Promise<void> {
    // In a more sophisticated implementation, you might want to blacklist tokens
    // For now, we'll just remove any active sessions
    await prisma.session.deleteMany({
      where: { userId }
    });
  }
}
