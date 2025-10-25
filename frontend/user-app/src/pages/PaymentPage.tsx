import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, User, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { speakPaymentConfirmation, speakError } from '../utils/tts'

const paymentSchema = z.object({
  recipientEmail: z.string().email('Invalid email format'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
})

type PaymentFormData = z.infer<typeof paymentSchema>

const PaymentPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const { user } = useSelector((state: RootState) => state.auth)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema)
  })

  // Load users for recipient selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setUsers(data.users.filter((u: any) => u.id !== user?.id))
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [user?.id])

  const onSubmit = async (data: PaymentFormData) => {
    setIsProcessing(true)
    try {
      // Find recipient by email
      const recipient = users.find(u => u.email === data.recipientEmail)
      if (!recipient) {
        toast.error('No user exists with this email address')
        speakError('No user exists with this email address')
        return
      }

      // Check if user has sufficient balance
      if (user && user.balance < data.amount) {
        toast.error('Insufficient balance')
        speakError('Insufficient balance')
        return
      }

      const response = await fetch('http://localhost:3001/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'user-id': user?.id || ''
        },
        body: JSON.stringify({
          amount: data.amount,
          recipientId: recipient.id,
          description: data.description
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Payment sent successfully!')
        speakPaymentConfirmation(data.amount, recipient.fullName)
        reset()
        // Refresh user data to update balance
        window.location.reload()
      } else {
        toast.error(result.message || 'Payment failed')
        speakError(result.message || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed')
      speakError('Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Send Money</h1>
          <p className="mt-2 text-gray-600">
            Transfer funds to another user securely
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">
              Recipient Email
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('recipientEmail')}
                type="email"
                className="input pl-10"
                placeholder="Enter recipient's email"
              />
            </div>
            {errors.recipientEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.recipientEmail.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (₱)
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                className="input pl-10"
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Add a note for this payment"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="btn btn-secondary px-6 py-2"
              onClick={() => reset()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary px-6 py-2 flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Money
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentPage
