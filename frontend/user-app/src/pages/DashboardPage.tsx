import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { Wallet, Send, QrCode, QrCodeIcon, History, User } from 'lucide-react'

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  const quickActions = [
    {
      title: 'Send Money',
      description: 'Transfer funds to another user',
      icon: Send,
      href: '/payment',
      color: 'bg-blue-500'
    },
    {
      title: 'Scan QR',
      description: 'Scan QR code to pay',
      icon: QrCode,
      href: '/qr-scanner',
      color: 'bg-green-500'
    },
    {
      title: 'Generate QR',
      description: 'Create QR code to receive money',
      icon: QrCodeIcon,
      href: '/qr-generate',
      color: 'bg-emerald-500'
    },
    {
      title: 'Transaction History',
      description: 'View your transaction history',
      icon: History,
      href: '/transactions',
      color: 'bg-purple-500'
    },
    {
      title: 'Profile',
      description: 'Manage your account',
      icon: User,
      href: '/profile',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.fullName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your payments and transactions
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Available Balance</p>
            <p className="text-3xl font-bold">₱{user?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <Wallet className="h-12 w-12 text-blue-200" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <a
            key={index}
            href={action.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="flex items-center">
              <div className={`${action.color} rounded-lg p-3 mr-4`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500 text-center py-8">
            No recent transactions. Start by sending money or scanning a QR code.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
