import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected with role ${socket.userRole}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join merchant to merchant room if they are a merchant
    if (socket.userRole === 'MERCHANT') {
      socket.join('merchants');
    }

    // Handle joining transaction room
    socket.on('join-transaction', (transactionId: string) => {
      socket.join(`transaction:${transactionId}`);
      console.log(`User ${socket.userId} joined transaction room: ${transactionId}`);
    });

    // Handle leaving transaction room
    socket.on('leave-transaction', (transactionId: string) => {
      socket.leave(`transaction:${transactionId}`);
      console.log(`User ${socket.userId} left transaction room: ${transactionId}`);
    });

    // Handle payment initiation
    socket.on('initiate-payment', async (data: {
      transactionId: string;
      amount: number;
      recipientId: string;
      description?: string;
    }) => {
      try {
        // Emit to recipient (merchant)
        socket.to(`user:${data.recipientId}`).emit('payment-initiated', {
          transactionId: data.transactionId,
          amount: data.amount,
          senderId: socket.userId,
          description: data.description
        });

        // Emit to transaction room
        io.to(`transaction:${data.transactionId}`).emit('payment-initiated', {
          transactionId: data.transactionId,
          amount: data.amount,
          senderId: socket.userId,
          recipientId: data.recipientId,
          description: data.description
        });

        console.log(`Payment initiated: ${data.transactionId} by user ${socket.userId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to initiate payment' });
        console.error('Payment initiation error:', error);
      }
    });

    // Handle payment confirmation
    socket.on('confirm-payment', async (data: {
      transactionId: string;
      otp: string;
    }) => {
      try {
        // Emit to transaction room
        io.to(`transaction:${data.transactionId}`).emit('payment-confirmed', {
          transactionId: data.transactionId,
          confirmedBy: socket.userId
        });

        console.log(`Payment confirmed: ${data.transactionId} by user ${socket.userId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to confirm payment' });
        console.error('Payment confirmation error:', error);
      }
    });

    // Handle payment completion
    socket.on('payment-completed', async (data: {
      transactionId: string;
      audioUrl?: string;
    }) => {
      try {
        // Emit to transaction room
        io.to(`transaction:${data.transactionId}`).emit('payment-success', {
          transactionId: data.transactionId,
          audioUrl: data.audioUrl,
          timestamp: new Date().toISOString()
        });

        // Emit to all merchants
        io.to('merchants').emit('payment-received', {
          transactionId: data.transactionId,
          audioUrl: data.audioUrl,
          timestamp: new Date().toISOString()
        });

        console.log(`Payment completed: ${data.transactionId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process payment completion' });
        console.error('Payment completion error:', error);
      }
    });

    // Handle audio ready notification
    socket.on('audio-ready', (data: {
      transactionId: string;
      audioUrl: string;
      type: 'user' | 'merchant';
    }) => {
      try {
        if (data.type === 'user') {
          // Send to user
          socket.emit('audio-ready', {
            transactionId: data.transactionId,
            audioUrl: data.audioUrl,
            type: 'user'
          });
        } else {
          // Send to merchant
          io.to('merchants').emit('audio-ready', {
            transactionId: data.transactionId,
            audioUrl: data.audioUrl,
            type: 'merchant'
          });
        }

        console.log(`Audio ready for ${data.type}: ${data.transactionId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process audio notification' });
        console.error('Audio ready error:', error);
      }
    });

    // Handle QR code scan
    socket.on('qr-scanned', (data: {
      transactionId: string;
      qrData: string;
    }) => {
      try {
        // Emit to transaction room
        io.to(`transaction:${data.transactionId}`).emit('qr-scanned', {
          transactionId: data.transactionId,
          scannedBy: socket.userId,
          qrData: data.qrData
        });

        console.log(`QR code scanned for transaction: ${data.transactionId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process QR scan' });
        console.error('QR scan error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Broadcast functions for server-side events
  export const broadcastTransactionUpdate = (transactionId: string, data: any) => {
    io.to(`transaction:${transactionId}`).emit('transaction-updated', data);
  };

  export const broadcastPaymentSuccess = (transactionId: string, audioUrl: string) => {
    io.to(`transaction:${transactionId}`).emit('payment-success', {
      transactionId,
      audioUrl,
      timestamp: new Date().toISOString()
    });
  };

  export const broadcastAudioReady = (userId: string, transactionId: string, audioUrl: string, type: 'user' | 'merchant') => {
    if (type === 'user') {
      io.to(`user:${userId}`).emit('audio-ready', {
        transactionId,
        audioUrl,
        type: 'user'
      });
    } else {
      io.to('merchants').emit('audio-ready', {
        transactionId,
        audioUrl,
        type: 'merchant'
      });
    }
  };
};
