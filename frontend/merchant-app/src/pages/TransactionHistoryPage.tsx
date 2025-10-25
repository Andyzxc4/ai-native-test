import React from 'react'
import { History, ArrowDownLeft, CheckCircle, Clock, XCircle } from 'lucide-react'

const TransactionHistoryPage: React.FC = () => {
  // Mock data for demonstration
  const transactions = [
    {
      id: '1',
      transactionId: 'TXN-123456',
      amount: 150.00,
      sender: 'John Doe',
      status: 'completed',
      date: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      transactionId: 'TXN-123457',
      amount: 75.50,
      sender: 'Jane Smith',
      status: 'completed',
      date: '2024-01-14T15:45:00Z'
    },
    {
      id: '3',
      transactionId: 'TXN-123458',
      amount: 200.00,
      sender: 'Mike Johnson',
      status: 'pending',
      date: '2024-01-14T12:20:00Z'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="mt-2 text-gray-600">
          View all your received payments
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500">Generate a QR code to start receiving payments</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ArrowDownLeft className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Received from {transaction.sender}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.transactionId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        +₱{transaction.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(transaction.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionHistoryPage
