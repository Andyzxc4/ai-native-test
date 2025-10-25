const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// In-memory storage for demo
let users = [
  { id: '1', email: 'user@example.com', password: 'password', fullName: 'John User', phoneNumber: '+1234567890', balance: 10000, role: 'USER', twoFactorEnabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', email: 'merchant@example.com', password: 'password', fullName: 'Jane Merchant', phoneNumber: '+1234567891', balance: 10000, role: 'MERCHANT', twoFactorEnabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

let transactions = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      token: 'demo-token-' + user.id,
      requiresOtp: false
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, phoneNumber, role = 'USER' } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
  
  const newUser = {
    id: (users.length + 1).toString(),
    email,
    password,
    fullName: fullName || 'New User',
    phoneNumber: phoneNumber || '+1234567890',
    balance: 10000,
    role,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({
    success: true,
    user: userWithoutPassword,
    token: 'demo-token-' + newUser.id
  });
});

// Payment routes
app.post('/api/payments/create', (req, res) => {
  const { amount, recipientId, description } = req.body;
  const senderId = req.headers['user-id'] || '1'; // Demo user ID
  
  // Validate recipient exists
  const recipient = users.find(u => u.id === recipientId);
  if (!recipient) {
    return res.status(400).json({ 
      success: false, 
      message: 'Recipient not found' 
    });
  }
  
  // Validate sender exists and has sufficient balance
  const sender = users.find(u => u.id === senderId);
  if (!sender) {
    return res.status(400).json({ 
      success: false, 
      message: 'Sender not found' 
    });
  }
  
  const amountNum = parseFloat(amount);
  if (sender.balance < amountNum) {
    return res.status(400).json({ 
      success: false, 
      message: 'Insufficient balance' 
    });
  }
  
  const transaction = {
    id: Date.now().toString(),
    senderId,
    recipientId,
    amount: amountNum,
    description: description || 'Payment',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  transactions.push(transaction);
  
  // Generate QR code data
  const qrData = JSON.stringify({
    transactionId: transaction.id,
    amount: transaction.amount,
    recipientId: transaction.recipientId
  });
  
  res.json({
    success: true,
    transaction,
    qrCode: qrData
  });
});

app.post('/api/payments/scan', (req, res) => {
  const { qrData } = req.body;
  
  try {
    const qrInfo = JSON.parse(qrData);
    const transaction = transactions.find(t => t.id === qrInfo.transactionId);
    
    if (transaction) {
      res.json({
        success: true,
        transaction,
        amount: transaction.amount,
        description: transaction.description
      });
    } else {
      res.status(404).json({ success: false, message: 'Transaction not found' });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid QR code' });
  }
});

app.post('/api/payments/confirm', (req, res) => {
  const { transactionId, userId } = req.body;
  
  const transaction = transactions.find(t => t.id === transactionId);
  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }
  
  // Update transaction status
  transaction.status = 'COMPLETED';
  transaction.completedAt = new Date().toISOString();
  
  // Update balances (simplified)
  const sender = users.find(u => u.id === transaction.senderId);
  const recipient = users.find(u => u.id === transaction.recipientId);
  
  if (sender && recipient) {
    sender.balance -= transaction.amount;
    recipient.balance += transaction.amount;
  }
  
  // Emit socket event
  io.emit('payment-completed', {
    transactionId,
    amount: transaction.amount,
    status: 'COMPLETED'
  });
  
  res.json({
    success: true,
    message: 'Payment completed successfully',
    transaction
  });
});

// Get user transactions
app.get('/api/transactions/:userId', (req, res) => {
  const { userId } = req.params;
  const userTransactions = transactions.filter(
    t => t.senderId === userId || t.recipientId === userId
  );
  
  res.json({
    success: true,
    transactions: userTransactions
  });
});

// Generate QR code for receiving money
app.post('/api/payments/generate-qr', (req, res) => {
  const { userId, amount } = req.body;
  
  // Validate user exists
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(400).json({ 
      success: false, 
      message: 'User not found' 
    });
  }
  
  // Generate QR code data for receiving money
  const qrData = JSON.stringify({
    type: 'receive',
    recipientId: userId,
    recipientName: user.fullName,
    amount: amount ? parseFloat(amount) : null, // Optional amount
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    qrCode: qrData,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    }
  });
});

// Get all users for recipient selection
app.get('/api/users', (req, res) => {
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.json({
    success: true,
    users: usersWithoutPasswords
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = { io };
