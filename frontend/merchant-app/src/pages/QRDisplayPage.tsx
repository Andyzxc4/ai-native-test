import React, { useState } from 'react'
import { QrCode, RefreshCw, Download, Volume2 } from 'lucide-react'
import toast from 'react-hot-toast'

const QRDisplayPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)

  const generateQRCode = async () => {
    setIsGenerating(true)
    try {
      // Mock QR code generation
      await new Promise(resolve => setTimeout(resolve, 1000))
      setQrCodeData('mock-qr-data')
      toast.success('QR code generated successfully')
    } catch (error) {
      toast.error('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (qrCodeData) {
      toast.success('QR code downloaded')
    }
  }

  const playAudioNotification = () => {
    toast.success('Audio notification played')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Display</h1>
        <p className="mt-2 text-gray-600">
          Generate and display QR codes for customer payments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Display */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment QR Code</h2>
          
          {qrCodeData ? (
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <QrCode className="h-32 w-32 text-gray-600 mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Customer can scan this QR code to make a payment
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={downloadQRCode}
                  className="btn btn-secondary px-4 py-2 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={playAudioNotification}
                  className="btn btn-primary px-4 py-2 flex items-center"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Test Audio
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No QR code generated yet</p>
              <button
                onClick={generateQRCode}
                disabled={isGenerating}
                className="btn btn-primary px-6 py-3 flex items-center mx-auto"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Waiting for Payment</p>
                  <p className="text-xs text-yellow-600">QR code is active</p>
                </div>
              </div>
              <span className="text-xs text-yellow-600">Active</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Recent Payments</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">+₱150.00</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Jane Smith</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">+₱75.50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRDisplayPage
