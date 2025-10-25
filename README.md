# Payment Web App with AI Audio Confirmation

A comprehensive payment web application system with real-time audio confirmation using AI text-to-speech technology.

## 🏗️ System Architecture

### Core Components

1. **User Web App** (React + TypeScript) - Port 3002
   - Payment initiation interface
   - QR code scanner
   - Transaction history
   - Real-time audio confirmation

2. **Merchant Web App** (React + TypeScript) - Port 3003
   - QR code display for payments
   - Payment monitoring dashboard
   - Transaction management
   - Audio notifications

3. **Backend API Server** (Node.js + Express + TypeScript) - Port 3001
   - RESTful API for transactions
   - WebSocket server for real-time updates
   - Payment processing with mock GCash integration
   - Gmail-based 2FA authentication
   - Google Cloud TTS integration

4. **Database** (PostgreSQL)
   - User accounts and profiles
   - Transaction records
   - Payment sessions
   - Authentication tokens

5. **Cache** (Redis)
   - OTP storage
   - Session management
   - Rate limiting

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Google Cloud account (for TTS)
- Gmail account (for email service)

### Environment Setup

1. **Clone and setup the project:**
```bash
cd payment-app
npm install
```

2. **Configure environment variables:**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
cd backend
npx prisma generate
npx prisma db push
```

4. **Start the system:**
```bash
# Development mode
npm run dev

# Or with Docker
docker-compose up
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/payment_app"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="1h"

# Email (Gmail)
GMAIL_USER="your-email@gmail.com"
GMAIL_PASS="your-app-password"

# Google Cloud TTS
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_KEY_FILE="./service-account.json"

# Server
PORT=3001
NODE_ENV="development"
```

### Frontend Environment Variables

```env
# User App (.env)
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# Merchant App (.env)
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

## 📱 Application URLs

- **User App**: http://localhost:3002
- **Merchant App**: http://localhost:3003
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs

## 🔄 Payment Flow

### Step-by-Step Process

1. **User Registration/Login**
   - User registers with email and phone
   - Gmail-based 2FA authentication
   - JWT token management

2. **Payment Initiation**
   - User enters recipient and amount
   - Backend generates unique transaction ID
   - QR code created with transaction data

3. **QR Code Display (Merchant)**
   - Merchant app displays QR code
   - Real-time WebSocket connection
   - Payment status monitoring

4. **Payment Processing**
   - User scans QR code
   - OTP verification via Gmail
   - Mock GCash payment processing
   - Balance updates

5. **Audio Confirmation**
   - Google Cloud TTS generates audio
   - Real-time audio delivery via WebSocket
   - Automatic playback in both apps

6. **Transaction Completion**
   - Email notifications sent
   - Transaction history updated
   - Receipt generation

## 🎵 Audio Confirmation Features

### TTS Integration
- **Google Cloud Text-to-Speech API**
- High-quality voice synthesis
- Custom transaction messages
- Real-time audio streaming

### Audio Messages
- **User**: "Payment successful. You have sent ₱150 to John Doe. Transaction ID TXN-123456. Your new balance is ₱850."
- **Merchant**: "Payment received. ₱150 from Jane Smith. Transaction ID TXN-123456."

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Gmail-based 2FA** for all transactions
- **Rate limiting** on sensitive endpoints
- **Input validation** with Zod schemas
- **CORS protection** with whitelisted origins
- **SQL injection prevention** with Prisma ORM

## 🛠️ Development

### Project Structure

```
payment-app/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── websocket/       # Socket.IO handlers
│   │   └── routes/          # API routes
│   └── prisma/              # Database schema
├── frontend/
│   ├── user-app/            # User React app
│   └── merchant-app/        # Merchant app
└── docker-compose.yml       # Container orchestration
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/send-otp` - Send OTP

#### Transactions
- `POST /api/transactions/initiate` - Start transaction
- `GET /api/transactions/history` - Transaction history
- `POST /api/transactions/:id/process` - Process payment

#### Payments
- `GET /api/payments/qr/:transactionId` - Get QR code
- `POST /api/payments/scan` - Handle QR scan

### WebSocket Events

- `payment-initiated` - New payment started
- `payment-confirmed` - Payment confirmed
- `payment-success` - Payment completed
- `audio-ready` - TTS audio ready
- `transaction-updated` - Status change

## 🧪 Testing

### Manual Testing Flow

1. **Start the system:**
```bash
docker-compose up
```

2. **Register users:**
   - Create a user account
   - Create a merchant account

3. **Test payment flow:**
   - User initiates payment
   - Merchant displays QR code
   - User scans QR code
   - Complete payment with OTP
   - Verify audio confirmation

### Test Scenarios

- ✅ User registration and login
- ✅ 2FA authentication flow
- ✅ Payment initiation and QR generation
- ✅ QR code scanning and payment processing
- ✅ Real-time WebSocket communication
- ✅ Audio confirmation generation and playback
- ✅ Transaction history and notifications

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Considerations

- Configure production database
- Set up Google Cloud service account
- Configure Gmail app password
- Set up SSL certificates
- Configure domain names
- Set up monitoring and logging

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Database connection status
- Redis connection status
- WebSocket connection status

### Metrics
- Transaction volume
- Payment success rate
- Audio generation time
- WebSocket connection count

## 🔧 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env

2. **Redis connection failed**
   - Check Redis is running
   - Verify REDIS_URL in .env

3. **TTS not working**
   - Check Google Cloud credentials
   - Verify service account file
   - Check project ID configuration

4. **Email not sending**
   - Verify Gmail credentials
   - Check app password setup
   - Enable 2FA on Gmail account

### Logs

```bash
# Backend logs
docker-compose logs backend

# Database logs
docker-compose logs postgres

# All services
docker-compose logs
```

## 📝 API Documentation

The API documentation is available at:
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI Spec**: http://localhost:3001/api-docs.json

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Check the logs for error messages
- Create an issue in the repository

---

**Note**: This is a demonstration system for educational purposes. For production use, additional security measures, monitoring, and compliance features should be implemented.
