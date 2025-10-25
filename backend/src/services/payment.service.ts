import { PrismaClient, Transaction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';

const prisma = new PrismaClient();
const authService = new AuthService();
const emailService = new EmailService();

export class PaymentService {
  async initiateTransaction(data: {
    senderId: string;
    recipientId: string;
    amount: number;
    description?: string;
  }): Promise<Transaction> {
    // Validate sender has sufficient balance
    const sender = await prisma.user.findUnique({
      where: { id: data.senderId }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    if (sender.balance < data.amount) {
      throw new Error('Insufficient balance');
    }

    // Validate recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientId }
    });

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        transactionId,
        senderId: data.senderId,
        recipientId: data.recipientId,
        amount: data.amount,
        status: 'PENDING',
        description: data.description
      }
    });

    // Generate QR code data
    const qrData = JSON.stringify({
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      recipientId: transaction.recipientId,
      timestamp: transaction.createdAt.toISOString()
    });

    // Generate QR code image
    const qrCodeData = await QRCode.toDataURL(qrData);

    // Update transaction with QR code
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { qrCodeData }
    });

    // Create payment session
    await prisma.paymentSession.create({
      data: {
        transactionId: transaction.transactionId,
        qrCodeData,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    return {
      ...transaction,
      qrCodeData
    };
  }

  async processPayment(transactionId: string, otp: string, userId: string): Promise<Transaction> {
    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        sender: true,
        recipient: true
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Transaction is not in pending status');
    }

    if (transaction.senderId !== userId) {
      throw new Error('Unauthorized to process this transaction');
    }

    // Verify OTP
    await authService.verifyOtp(userId, otp, 'PAYMENT' as any);

    // Update transaction status to processing
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'PROCESSING' }
    });

    // Simulate payment processing (mock GCash integration)
    await this.simulatePaymentProcessing(transaction);

    // Update balances
    await prisma.user.update({
      where: { id: transaction.senderId },
      data: { balance: { decrement: transaction.amount } }
    });

    await prisma.user.update({
      where: { id: transaction.recipientId },
      data: { balance: { increment: transaction.amount } }
    });

    // Update transaction status to completed
    const completedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: {
        sender: true,
        recipient: true
      }
    });

    // Send email notifications
    await emailService.sendPaymentNotification(
      transaction.sender.email,
      transaction.transactionId,
      transaction.amount,
      'sent',
      transaction.recipient.fullName
    );

    await emailService.sendPaymentNotification(
      transaction.recipient.email,
      transaction.transactionId,
      transaction.amount,
      'received'
    );

    // Send receipt
    await emailService.sendReceipt(
      transaction.sender.email,
      transaction.transactionId,
      transaction.amount,
      transaction.recipient.fullName,
      transaction.description || undefined
    );

    return completedTransaction;
  }

  private async simulatePaymentProcessing(transaction: Transaction): Promise<void> {
    // Simulate network delay (2-3 seconds)
    const delay = Math.random() * 1000 + 2000; // 2-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' }
      });
      throw new Error('Payment processing failed');
    }
  }

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, fullName: true, email: true }
          },
          recipient: {
            select: { id: true, fullName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTransactionById(transactionId: string, userId: string): Promise<Transaction | null> {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true }
        },
        recipient: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    if (!transaction) {
      return null;
    }

    // Check if user is authorized to view this transaction
    if (transaction.senderId !== userId && transaction.recipientId !== userId) {
      throw new Error('Unauthorized to view this transaction');
    }

    return transaction;
  }

  async cancelTransaction(transactionId: string, userId: string): Promise<Transaction> {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.senderId !== userId) {
      throw new Error('Unauthorized to cancel this transaction');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Cannot cancel transaction that is not pending');
    }

    return await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'CANCELLED' }
    });
  }

  async getQRCode(transactionId: string): Promise<string> {
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { transactionId }
    });

    if (!paymentSession) {
      throw new Error('Payment session not found');
    }

    if (!paymentSession.isActive || paymentSession.expiresAt < new Date()) {
      throw new Error('Payment session expired');
    }

    return paymentSession.qrCodeData;
  }
}
