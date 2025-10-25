import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { QrCode, DollarSign, TrendingUp, Users } from 'lucide-react'

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  const stats = [
    {
      title: 'Total Revenue',
      value: '₱12,450.00',
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Transactions',
      value: '156',
      change: '+8.2%',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Active Customers',
      value: '89',
      change: '+5.1%',
      icon: Users,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.fullName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your merchant payments and transactions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className={`text-sm ${stat.color}`}>{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate QR Code</h2>
          <p className="text-gray-600 mb-4">
            Create a QR code for customers to scan and make payments
          </p>
          <a
            href="/qr-display"
            className="btn btn-primary px-4 py-2 flex items-center w-fit"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Payment from John Doe</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
              <p className="text-sm font-semibold text-green-600">+₱150.00</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Payment from Jane Smith</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
              <p className="text-sm font-semibold text-green-600">+₱75.50</p>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Payment from Mike Johnson</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
              <p className="text-sm font-semibold text-green-600">+₱200.00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
