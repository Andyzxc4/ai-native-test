import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from './store/store'
import { loadUserFromToken } from './store/slices/authSlice'
import { useSocket } from './hooks/useSocket'
import { useAudioPlayer } from './hooks/useAudioPlayer'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import QRDisplayPage from './pages/QRDisplayPage'
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
    if (token && !isAuthenticated) {
      dispatch(loadUserFromToken())
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
          <Route path="qr-display" element={<QRDisplayPage />} />
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
