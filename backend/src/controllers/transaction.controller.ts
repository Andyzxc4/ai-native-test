import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { TTSService } from '../services/tts.service';

const paymentService = new PaymentService();
const ttsService = new TTSService();

export class TransactionController {
  async initiateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipientId, amount, description } = req.body;
      const senderId = req.user!.id;

      const transaction = await paymentService.initiateTransaction({
        senderId,
        recipientId,
        amount,
        description
      });

      res.status(201).json({
        message: 'Transaction initiated successfully',
        transaction
      });
    } catch (error) {
      next(error);
    }
  }

  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const { otp } = req.body;
      const userId = req.user!.id;

      const transaction = await paymentService.processPayment(transactionId, otp, userId);

      // Generate audio confirmations
      const [userAudioUrl, merchantAudioUrl] = await Promise.all([
        ttsService.generatePaymentConfirmationAudio({
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          recipientName: transaction.recipient.fullName,
          userBalance: transaction.sender.balance,
          type: 'user'
        }),
        ttsService.generatePaymentReceivedAudio({
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          senderName: transaction.sender.fullName,
          type: 'merchant'
        })
      ]);

      res.json({
        message: 'Payment processed successfully',
        transaction,
        audioUrl: userAudioUrl
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await paymentService.getTransactionHistory(userId, page, limit);

      res.json({
        message: 'Transaction history retrieved successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const userId = req.user!.id;

      const transaction = await paymentService.getTransactionById(transactionId, userId);

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found'
        });
      }

      res.json({
        message: 'Transaction retrieved successfully',
        transaction
      });
    } catch (error) {
      next(error);
    }
  }
}
