import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { QrCode, Download, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode.react'

const QRGeneratePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [amount, setAmount] = useState('')
  const [qrData, setQrData] = useState('')
  const [copied, setCopied] = useState(false)

  const generateQR = async () => {
    if (!user) return

    try {
      const response = await fetch('http://localhost:3001/api/payments/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          amount: amount ? parseFloat(amount) : null
        })
      })

      const data = await response.json()
      if (response.ok && data.qrCode) {
        setQrData(data.qrCode)
      } else {
        alert('Failed to generate QR code: ' + (data.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Error generating QR code')
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement
    if (canvas) {
      const link = document.createElement('a')
      link.download = `payment-qr-${user?.id}-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Generate Payment QR</h1>
          </div>

          <div className="space-y-6">
            {/* Amount Input */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (Optional)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in PHP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to allow any amount
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateQR}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Generate QR Code
            </button>

            {/* QR Code Display */}
            {qrData && (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Payment QR Code
                </h3>
                
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <QRCode
                      id="qr-code"
                      value={qrData}
                      size={200}
                      level="H"
                      includeMargin={true}
                      renderAs="canvas"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Share this QR code with others to receive payments
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy QR Data'}
                    </button>
                    
                    <button
                      onClick={downloadQR}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download QR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Generate a QR code with or without a specific amount</li>
                <li>• Share the QR code with others who want to send you money</li>
                <li>• They can scan it using the QR Scanner in their app</li>
                <li>• You'll receive the payment instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRGeneratePage
