import React, { useState } from 'react'
import { QrCode, Camera, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { speakPaymentConfirmation, speakError } from '../utils/tts'

const QRScannerPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [qrInput, setQrInput] = useState('')
  const { user } = useSelector((state: RootState) => state.auth)

  const handleScan = () => {
    setIsScanning(true)
    // TODO: Implement actual QR code scanning with camera
    toast.info('QR scanner functionality coming soon')
    setTimeout(() => {
      setIsScanning(false)
    }, 2000)
  }

  const handleManualQRInput = async () => {
    if (!qrInput.trim()) {
      toast.error('Please enter QR code data')
      return
    }

    try {
      const qrData = JSON.parse(qrInput)
      
      if (qrData.type === 'receive') {
        // This is a QR code for receiving money, not for making a payment
        toast.error('This QR code is for receiving money, not for making payments')
        speakError('This QR code is for receiving money')
        return
      }

      // Process payment from QR code
      const response = await fetch('http://localhost:3001/api/payments/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'user-id': user?.id || ''
        },
        body: JSON.stringify({
          qrData: qrInput
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Payment sent successfully!')
        speakPaymentConfirmation(result.transaction.amount, result.recipient?.fullName)
        setQrInput('')
      } else {
        toast.error(result.message || 'Payment failed')
        speakError(result.message || 'Payment failed')
      }
    } catch (error) {
      console.error('QR processing error:', error)
      toast.error('Invalid QR code format')
      speakError('Invalid QR code format')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
          <p className="mt-2 text-gray-600">
            Scan a QR code to make a payment
          </p>
        </div>

        <div className="space-y-6">
          {/* Camera Scanner */}
          <div className="text-center">
            <div className="bg-gray-100 rounded-lg p-8 mb-6">
              <QrCode className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {isScanning ? 'Scanning...' : 'Camera not available'}
              </p>
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="btn btn-primary px-6 py-3 flex items-center mx-auto"
            >
              <Camera className="h-5 w-5 mr-2" />
              {isScanning ? 'Scanning...' : 'Start Scanning'}
            </button>
          </div>

          {/* Manual QR Input */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Or Enter QR Code Manually</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-input" className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Data
                </label>
                <textarea
                  id="qr-input"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste QR code data here..."
                />
              </div>
              <button
                onClick={handleManualQRInput}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Process QR Code
              </button>
            </div>
          </div>

          {scannedData && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-green-800">QR Code processed successfully!</p>
              </div>
              <p className="mt-2 text-sm text-green-700">
                Data: {scannedData}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QRScannerPage
