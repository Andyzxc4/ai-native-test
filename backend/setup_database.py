#!/usr/bin/env python3
"""
Simple SQLite database setup script for the Payment App
This script creates the necessary tables and initial data
"""

import sqlite3
import hashlib
import json
from datetime import datetime, timedelta

def create_tables(cursor):
    """Create all necessary tables"""
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            fullName TEXT NOT NULL,
            phoneNumber TEXT UNIQUE NOT NULL,
            balance REAL DEFAULT 0.0,
            role TEXT DEFAULT 'USER',
            twoFactorEnabled BOOLEAN DEFAULT 1,
            isActive BOOLEAN DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            transactionId TEXT UNIQUE NOT NULL,
            senderId TEXT NOT NULL,
            recipientId TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'PHP',
            status TEXT DEFAULT 'PENDING',
            paymentMethod TEXT DEFAULT 'GCASH',
            qrCodeData TEXT,
            audioConfirmationUrl TEXT,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            completedAt DATETIME,
            FOREIGN KEY (senderId) REFERENCES users (id),
            FOREIGN KEY (recipientId) REFERENCES users (id)
        )
    ''')
    
    # OTP codes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otp_codes (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            code TEXT NOT NULL,
            type TEXT DEFAULT 'LOGIN',
            expiresAt DATETIME NOT NULL,
            isUsed BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )
    ''')
    
    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expiresAt DATETIME NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )
    ''')
    
    # Payment sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment_sessions (
            id TEXT PRIMARY KEY,
            transactionId TEXT UNIQUE NOT NULL,
            qrCodeData TEXT NOT NULL,
            expiresAt DATETIME NOT NULL,
            isActive BOOLEAN DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

def create_sample_users(cursor):
    """Create sample users for testing"""
    
    # Sample users with hashed passwords
    sample_users = [
        {
            'id': 'user-1',
            'email': 'user1@example.com',
            'passwordHash': hashlib.sha256('password123'.encode()).hexdigest(),
            'fullName': 'John Doe',
            'phoneNumber': '+1234567890',
            'balance': 1000.0,
            'role': 'USER'
        },
        {
            'id': 'user-2',
            'email': 'user2@example.com',
            'passwordHash': hashlib.sha256('password123'.encode()).hexdigest(),
            'fullName': 'Jane Smith',
            'phoneNumber': '+1234567891',
            'balance': 500.0,
            'role': 'USER'
        },
        {
            'id': 'merchant-1',
            'email': 'merchant@example.com',
            'passwordHash': hashlib.sha256('password123'.encode()).hexdigest(),
            'fullName': 'Merchant Store',
            'phoneNumber': '+1234567892',
            'balance': 2000.0,
            'role': 'MERCHANT'
        }
    ]
    
    for user in sample_users:
        cursor.execute('''
            INSERT OR REPLACE INTO users 
            (id, email, passwordHash, fullName, phoneNumber, balance, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user['id'],
            user['email'],
            user['passwordHash'],
            user['fullName'],
            user['phoneNumber'],
            user['balance'],
            user['role']
        ))

def main():
    """Main setup function"""
    print("Setting up SQLite database for Payment App...")
    
    # Connect to database
    conn = sqlite3.connect('dev.db')
    cursor = conn.cursor()
    
    try:
        # Create tables
        print("Creating tables...")
        create_tables(cursor)
        
        # Create sample users
        print("Creating sample users...")
        create_sample_users(cursor)
        
        # Commit changes
        conn.commit()
        print("Database setup completed successfully!")
        
        # Show created users
        cursor.execute('SELECT id, email, fullName, balance, role FROM users')
        users = cursor.fetchall()
        
        print("\nCreated users:")
        for user in users:
            print(f"  - {user[2]} ({user[1]}) - Balance: ${user[3]} - Role: {user[4]}")
            
    except Exception as e:
        print(f"Error setting up database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
