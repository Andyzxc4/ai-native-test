import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
// OtpType is now a string type

const router = Router();
const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
  role: z.enum(['USER', 'MERCHANT']).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const verifyOtpSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['LOGIN', 'PAYMENT', 'RESET_PASSWORD'])
});

const sendOtpSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['LOGIN', 'PAYMENT', 'RESET_PASSWORD'])
});

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    return next(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData.email, validatedData.password);
    
    if (result.requiresOtp) {
      return res.json({
        message: 'OTP sent to your email',
        requiresOtp: true,
        user: result.user
      });
    } else {
      return res.json({
        message: 'Login successful',
        user: result.user,
        token: result.token,
        requiresOtp: false
      });
    }
  } catch (error) {
    return next(error);
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res, next) => {
  try {
    const validatedData = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(
      validatedData.userId,
      validatedData.code,
      validatedData.type
    );
    
    return res.json({
      message: 'OTP verified successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    return next(error);
  }
});

// Send OTP endpoint
router.post('/send-otp', async (req, res, next) => {
  try {
    const validatedData = sendOtpSchema.parse(req.body);
    await authService.sendOtp(
      validatedData.userId,
      validatedData.type
    );
    
    return res.json({
      message: 'OTP sent successfully'
    });
  } catch (error) {
    return next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    return res.json({
      message: 'Token refreshed successfully',
      token: result.token
    });
  } catch (error) {
    return next(error);
  }
});

// Logout endpoint
router.post('/logout', async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }
    
    await authService.logout(userId);
    
    return res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
