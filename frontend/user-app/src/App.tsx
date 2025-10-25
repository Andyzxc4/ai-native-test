import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { RootState, AppDispatch } from './store/store'
import { loadUserFromToken } from './store/slices/authSlice'
import { useSocket } from './hooks/useSocket'
import { useAudioPlayer } from './hooks/useAudioPlayer'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PaymentPage from './pages/PaymentPage'
import QRScannerPage from './pages/QRScannerPage'
import QRGeneratePage from './pages/QRGeneratePage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import ProfilePage from './pages/ProfilePage'

// Components
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)
  
  // Load user from token on app initialization
  useEffect(() => {
    const token = localStorage.getItem('token')
    const cachedUserData = localStorage.getItem('userData')
    
    if (token) {
      if (!user && cachedUserData) {
        // Immediately set user from cache to prevent flashing
        dispatch({ 
          type: 'auth/loadUserFromToken/fulfilled',
          payload: { 
            user: JSON.parse(cachedUserData), 
            token: token 
          }
        })
      }
      
      // Always load fresh data from server
      dispatch(loadUserFromToken())
    }
  }, [dispatch])
  
  // Reload user data when navigating between pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        dispatch(loadUserFromToken())
      }
    }
    
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', () => dispatch(loadUserFromToken()))
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', () => dispatch(loadUserFromToken()))
    }
  }, [dispatch, isAuthenticated])
  
  // Initialize socket connection
  useSocket()
  
  // Initialize audio player
  useAudioPlayer()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />} 
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="qr-scanner" element={<QRScannerPage />} />
          <Route path="qr-generate" element={<QRGeneratePage />} />
          <Route path="transactions" element={<TransactionHistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
