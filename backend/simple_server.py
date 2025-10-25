#!/usr/bin/env python3
"""
Simple HTTP server for the Payment App backend
This serves as a fallback when Node.js is not available
"""

import http.server
import socketserver
import json
import sqlite3
import hashlib
import jwt
import time
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta

# Simple JWT secret (in production, use a proper secret)
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"

class PaymentAPIHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/health':
            self.send_health_response()
        elif parsed_path.path == '/api/users/profile':
            self.send_profile_response()
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/auth/login':
            self.handle_login()
        elif parsed_path.path == '/api/auth/register':
            self.handle_register()
        elif parsed_path.path == '/api/payments/generate-qr':
            self.handle_generate_qr()
        elif parsed_path.path == '/api/transactions':
            self.handle_create_transaction()
        else:
            self.send_error(404, "Not Found")

    def send_health_response(self):
        """Send health check response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'status': 'OK',
            'timestamp': datetime.now().isoformat(),
            'uptime': time.time()
        }
        self.wfile.write(json.dumps(response).encode())

    def send_profile_response(self):
        """Send user profile response"""
        # Get token from Authorization header
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            self.send_error(401, "Unauthorized")
            return
            
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        try:
            # Decode JWT token
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = decoded['userId']
            
            # Get user from database
            conn = sqlite3.connect('dev.db')
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, email, fullName, phoneNumber, balance, role, isActive, createdAt
                FROM users WHERE id = ?
            ''', (user_id,))
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                self.send_error(404, "User not found")
                return
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            user_data = {
                'id': user[0],
                'email': user[1],
                'fullName': user[2],
                'phoneNumber': user[3],
                'balance': user[4],
                'role': user[5],
                'isActive': bool(user[6]),
                'createdAt': user[7]
            }
            
            response = {
                'user': user_data
            }
            self.wfile.write(json.dumps(response).encode())
            
        except jwt.InvalidTokenError:
            self.send_error(401, "Invalid token")

    def handle_login(self):
        """Handle login request"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                self.send_error(400, "Email and password required")
                return
                
            # Get user from database
            conn = sqlite3.connect('dev.db')
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, email, passwordHash, fullName, phoneNumber, balance, role, isActive
                FROM users WHERE email = ?
            ''', (email,))
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                self.send_error(401, "Invalid credentials")
                return
                
            # Check password (simple hash comparison)
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if password_hash != user[2]:
                self.send_error(401, "Invalid credentials")
                return
                
            if not user[7]:  # isActive
                self.send_error(401, "Account deactivated")
                return
                
            # Generate JWT token
            token = jwt.encode(
                {'userId': user[0], 'exp': datetime.utcnow() + timedelta(hours=24)},
                JWT_SECRET,
                algorithm='HS256'
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            user_data = {
                'id': user[0],
                'email': user[1],
                'fullName': user[3],
                'phoneNumber': user[4],
                'balance': user[5],
                'role': user[6],
                'isActive': bool(user[7])
            }
            
            response = {
                'message': 'Login successful',
                'user': user_data,
                'token': token,
                'requiresOtp': False
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def handle_register(self):
        """Handle registration request"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            email = data.get('email')
            password = data.get('password')
            fullName = data.get('fullName')
            phoneNumber = data.get('phoneNumber')
            
            if not all([email, password, fullName, phoneNumber]):
                self.send_error(400, "All fields required")
                return
                
            # Check if user already exists
            conn = sqlite3.connect('dev.db')
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = ? OR phoneNumber = ?', (email, phoneNumber))
            existing = cursor.fetchone()
            
            if existing:
                conn.close()
                self.send_error(400, "User already exists")
                return
                
            # Create new user
            user_id = f"user-{int(time.time())}"
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cursor.execute('''
                INSERT INTO users (id, email, passwordHash, fullName, phoneNumber, balance, role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, email, password_hash, fullName, phoneNumber, 0.0, 'USER'))
            
            conn.commit()
            conn.close()
            
            # Generate JWT token
            token = jwt.encode(
                {'userId': user_id, 'exp': datetime.utcnow() + timedelta(hours=24)},
                JWT_SECRET,
                algorithm='HS256'
            )
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            user_data = {
                'id': user_id,
                'email': email,
                'fullName': fullName,
                'phoneNumber': phoneNumber,
                'balance': 0.0,
                'role': 'USER',
                'isActive': True
            }
            
            response = {
                'message': 'User registered successfully',
                'user': user_data,
                'token': token
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def handle_generate_qr(self):
        """Handle QR code generation"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            user_id = data.get('userId')
            amount = data.get('amount')
            
            # Get token from Authorization header
            auth_header = self.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                self.send_error(401, "Unauthorized")
                return
                
            token = auth_header[7:]
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            
            # Get user from database
            conn = sqlite3.connect('dev.db')
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, fullName, email, isActive
                FROM users WHERE id = ?
            ''', (user_id,))
            user = cursor.fetchone()
            conn.close()
            
            if not user or not user[3]:
                self.send_error(404, "User not found or inactive")
                return
                
            # Create QR data
            qr_data = {
                'type': 'PAYMENT_REQUEST',
                'recipientId': user[0],
                'recipientName': user[1],
                'amount': amount,
                'timestamp': datetime.now().isoformat(),
                'expiresAt': (datetime.now() + timedelta(minutes=10)).isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'message': 'QR code generated successfully',
                'qrCode': f"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",  # Placeholder
                'qrData': json.dumps(qr_data),
                'expiresAt': qr_data['expiresAt']
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def handle_create_transaction(self):
        """Handle transaction creation"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            recipient_id = data.get('recipientId')
            amount = data.get('amount')
            description = data.get('description', '')
            
            # Get token from Authorization header
            auth_header = self.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                self.send_error(401, "Unauthorized")
                return
                
            token = auth_header[7:]
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            sender_id = decoded['userId']
            
            # Get users from database
            conn = sqlite3.connect('dev.db')
            cursor = conn.cursor()
            
            # Check recipient exists
            cursor.execute('SELECT id, fullName, isActive FROM users WHERE id = ?', (recipient_id,))
            recipient = cursor.fetchone()
            
            if not recipient or not recipient[2]:
                conn.close()
                self.send_error(404, "Recipient not found or inactive")
                return
                
            # Check sender balance
            cursor.execute('SELECT balance FROM users WHERE id = ?', (sender_id,))
            sender = cursor.fetchone()
            
            if not sender:
                conn.close()
                self.send_error(404, "Sender not found")
                return
                
            if sender[0] < amount:
                conn.close()
                self.send_error(400, "Insufficient balance")
                return
                
            # Create transaction
            transaction_id = f"TXN-{int(time.time())}-{sender_id[:8]}"
            cursor.execute('''
                INSERT INTO transactions 
                (id, transactionId, senderId, recipientId, amount, status, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (transaction_id, transaction_id, sender_id, recipient_id, amount, 'PENDING', description))
            
            conn.commit()
            conn.close()
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            transaction_data = {
                'id': transaction_id,
                'transactionId': transaction_id,
                'senderId': sender_id,
                'recipientId': recipient_id,
                'amount': amount,
                'status': 'PENDING',
                'description': description,
                'createdAt': datetime.now().isoformat()
            }
            
            response = {
                'message': 'Transaction created successfully',
                'transaction': transaction_data
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

def main():
    """Start the server"""
    PORT = 3001
    
    print(f"Starting Payment App backend server on port {PORT}")
    print("Note: This is a simplified Python server for development")
    print("For production, use the Node.js server with proper authentication")
    
    with socketserver.TCPServer(("", PORT), PaymentAPIHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Available endpoints:")
        print("  GET  /health - Health check")
        print("  POST /api/auth/login - User login")
        print("  POST /api/auth/register - User registration")
        print("  GET  /api/users/profile - Get user profile")
        print("  POST /api/payments/generate-qr - Generate QR code")
        print("  POST /api/transactions - Create transaction")
        print("\nPress Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == '__main__':
    main()
