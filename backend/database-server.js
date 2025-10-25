const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
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

// Initialize SQLite database
const db = new sqlite3.Database('./payment_app.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    phoneNumber TEXT,
    balance REAL DEFAULT 10000,
    role TEXT DEFAULT 'USER',
    twoFactorEnabled BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Transactions table
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transactionId TEXT UNIQUE NOT NULL,
    senderId INTEGER NOT NULL,
    recipientId INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'PENDING',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users (id),
    FOREIGN KEY (recipientId) REFERENCES users (id)
  )`);

  // Insert default users if they don't exist (with hashed passwords)
  const defaultPassword = bcrypt.hashSync('password', 10);
  db.run(`INSERT OR IGNORE INTO users (id, email, password, fullName, phoneNumber, balance, role) VALUES 
    (1, 'user@example.com', ?, 'John User', '+1234567890', 10000, 'USER'),
    (2, 'user1@example.com', ?, 'Andre Lacra', '+1234567891', 10000, 'USER'),
    (3, 'merchant@example.com', ?, 'Jane Merchant', '+1234567892', 10000, 'MERCHANT')`, 
    [defaultPassword, defaultPassword]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Payment App API is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (user && bcrypt.compareSync(password, user.password)) {
        const { password: _, ...userWithoutPassword } = user;
        res.json({
          success: true,
          user: userWithoutPassword,
          token: 'demo-token-' + user.id,
          requiresOtp: false
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }
  );
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, phoneNumber, role = 'USER' } = req.body;
  
  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Insert new user
    db.run(
      'INSERT INTO users (email, password, fullName, phoneNumber, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, fullName || 'New User', phoneNumber || '+1234567890', role],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create user' });
        }
        
        // Get the created user
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve user' });
          }
          
          const { password: _, ...userWithoutPassword } = newUser;
          res.json({
            success: true,
            user: userWithoutPassword,
            token: 'demo-token-' + newUser.id
          });
        });
      }
    );
  });
});

// Get all users for recipient selection
app.get('/api/users', (req, res) => {
  db.all('SELECT id, email, fullName, phoneNumber, balance, role, twoFactorEnabled, createdAt, updatedAt FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({
      success: true,
      users: users
    });
  });
});

// Payment routes
app.post('/api/payments/create', (req, res) => {
  const { amount, recipientId, description } = req.body;
  const senderId = req.headers['user-id'] || '1';
  
  // Validate recipient exists
  db.get('SELECT * FROM users WHERE id = ?', [recipientId], (err, recipient) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient not found' });
    }
    
    // Validate sender exists and has sufficient balance
    db.get('SELECT * FROM users WHERE id = ?', [senderId], (err, sender) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (!sender) {
        return res.status(400).json({ success: false, message: 'Sender not found' });
      }
      
      const amountNum = parseFloat(amount);
      if (sender.balance < amountNum) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }
      
      // Create transaction
      const transactionId = 'TXN-' + Date.now();
      db.run(
        'INSERT INTO transactions (transactionId, senderId, recipientId, amount, description, status) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionId, senderId, recipientId, amountNum, description || 'Payment', 'PENDING'],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to create transaction' });
          }
          
          // Update balances
          db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amountNum, senderId]);
          db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amountNum, recipientId]);
          
          // Get updated transaction
          db.get('SELECT * FROM transactions WHERE id = ?', [this.lastID], (err, transaction) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Failed to retrieve transaction' });
            }
            
            // Generate QR code data
            const qrData = JSON.stringify({
              transactionId: transaction.transactionId,
              amount: transaction.amount,
              recipientId: transaction.recipientId
            });
            
            res.json({
              success: true,
              transaction: transaction,
              qrCode: qrData
            });
          });
        }
      );
    });
  });
});

// Generate QR code for receiving money
app.post('/api/payments/generate-qr', (req, res) => {
  const { userId, amount } = req.body;
  
  // Validate user exists
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    
    // Generate QR code data for receiving money
    const qrData = JSON.stringify({
      type: 'receive',
      recipientId: userId,
      recipientName: user.fullName,
      amount: amount ? parseFloat(amount) : null,
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
});

// Get user transactions
app.get('/api/transactions/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.all(
    'SELECT * FROM transactions WHERE senderId = ? OR recipientId = ? ORDER BY createdAt DESC',
    [userId, userId],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        transactions: transactions
      });
    }
  );
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Database server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
