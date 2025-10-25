import React, { useState, useEffect } from 'react'
import { History, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import LoadingSpinner from '../components/LoadingSpinner'

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  type: 'sent' | 'received';
  recipient?: string;
  sender?: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

const TransactionHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, token } = useSelector((state: RootState) => state.auth)
  
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('http://localhost:3001/api/transactions/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transaction history')
        }
        
        // Transform the data to match our component's expected format
        const formattedTransactions = data.transactions.map((tx: any) => ({
          id: tx.id,
          transactionId: tx.transactionId || `TXN-${tx.id}`,
          amount: tx.amount,
          type: tx.senderId === user?.id ? 'sent' : 'received',
          recipient: tx.receiverName || tx.receiverId,
          sender: tx.senderName || tx.senderId,
          status: tx.status.toLowerCase(),
          date: tx.createdAt || tx.timestamp
        }))
        
        setTransactions(formattedTransactions)
      } catch (err: any) {
        setError(err.message || 'Failed to load transaction history')
        console.error('Error fetching transactions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) {
      fetchTransactions()
    }
  }, [token, user?.id])

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
          View all your payment transactions
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading transaction history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading transactions</h3>
            <p className="text-red-500">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500">Start by sending money or scanning a QR code</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {transaction.type === 'sent' ? (
                        <ArrowUpRight className="h-8 w-8 text-red-500" />
                      ) : (
                        <ArrowDownLeft className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.type === 'sent' 
                          ? `Sent to ${transaction.recipient}`
                          : `Received from ${transaction.sender}`
                        }
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
                      <p className={`text-lg font-semibold ${
                        transaction.type === 'sent' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'sent' ? '-' : '+'}₱{transaction.amount.toFixed(2)}
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
