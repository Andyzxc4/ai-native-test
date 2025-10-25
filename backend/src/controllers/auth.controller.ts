import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, phoneNumber, role } = req.body;
      const result = await authService.register({
        email,
        password,
        fullName,
        phoneNumber,
        role
      });
      
      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      if (result.requiresOtp) {
        res.json({
          message: 'OTP sent to your email',
          requiresOtp: true,
          user: result.user
        });
      } else {
        res.json({
          message: 'Login successful',
          user: result.user,
          token: result.token,
          requiresOtp: false
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, code, type } = req.body;
      const result = await authService.verifyOtp(userId, code, type);
      
      res.json({
        message: 'OTP verified successfully',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      next(error);
    }
  }

  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, type } = req.body;
      await authService.sendOtp(userId, type);
      
      res.json({
        message: 'OTP sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      await authService.logout(userId);
      
      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
