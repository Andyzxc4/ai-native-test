import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

// Mock socket class for development when backend is unavailable
class MockSocket {
  listeners = {};
  connected = false;
  id = 'mock-socket-id';

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  emit(event, ...args) {
    console.log(`[MockSocket] Emitted event: ${event}`, args);
    return this;
  }

  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.triggerEvent('disconnect', { reason: 'manual disconnect' });
      console.log('[MockSocket] Disconnected');
    }
    return this;
  }

  connect() {
    if (!this.connected) {
      this.connected = true;
      this.triggerEvent('connect');
      console.log('[MockSocket] Connected');
    }
    return this;
  }

  triggerEvent(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!token) return

    let socketInstance: Socket | any = null;
    let initSocketTimeout: number;

    // Add a small delay before initializing socket to ensure token is properly set
    initSocketTimeout = window.setTimeout(() => {
      try {
        socketInstance = io(WS_URL, {
          auth: {
            token
          },
          transports: ['polling', 'websocket'], // Prioritize polling first
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 20000,
          path: '/socket.io/',
          forceNew: true
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
          
          // If in development mode and we get a connection error, use mock socket
          if (process.env.NODE_ENV === 'development') {
            console.warn('Using mock socket in development mode');
            const mockSocket = new MockSocket();
            setSocket(mockSocket);
            mockSocket.connect();
            setIsConnected(true);
          }
        });

        socketInstance.on('payment-success', (data) => {
          console.log('Payment success event received:', data);
        });

        socketInstance.on('audio-ready', (data) => {
          console.log('Audio ready event received:', data);
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Error initializing socket:', error);
        
        // If in development mode, use mock socket
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock socket in development mode');
          const mockSocket = new MockSocket();
          setSocket(mockSocket);
          mockSocket.connect();
          setIsConnected(true);
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(initSocketTimeout);
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [token]);

  return { socket, isConnected };
}
