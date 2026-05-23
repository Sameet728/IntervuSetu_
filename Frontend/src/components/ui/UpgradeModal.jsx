import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Check, X } from 'lucide-react'
import { Button } from './index'
import { createOrder, verifyPayment } from '../../api/paymentAPI'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function UpgradeModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const { user, setUser } = useAuth()

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // 1. Create order
      const { data: orderData } = await createOrder()
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummykey',
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'InterviewAI Pro',
        description: 'Upgrade to premium features',
        order_id: orderData.data.id,
        handler: async function (response) {
          try {
            // 2. Verify Payment
            const verifyRes = await verifyPayment(response)
            
            if (verifyRes.data.success) {
              toast.success('Successfully upgraded to Pro!')
              // Update context user plan
              setUser(prev => ({ ...prev, plan: 'pro' }))
              onClose()
            }
          } catch (err) {
            toast.error('Payment verification failed.')
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#2563eb'
        }
      }
      
      const rzp1 = new window.Razorpay(options)
      rzp1.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description)
      })
      rzp1.open()
      
    } catch (err) {
      toast.error('Error initiating payment')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Unlimited Interviews',
    'Up to 90+ minutes duration',
    'Hard & Adaptive difficulties',
    'Unlimited questions per interview',
    'Resume-based AI questions',
    'Detailed analytics & insights'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden relative"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Upgrade to Pro</h2>
          <p className="text-sm text-zinc-500 mb-6">Take your interviewing skills to the next level with our premium features.</p>
          
          <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 mb-6">
            <div className="flex items-baseline mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">₹499</span>
              <span className="text-sm text-zinc-500 ml-1">/ one-time</span>
            </div>
            
            <ul className="space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <Button
            variant="primary"
            className="w-full py-2.5"
            onClick={handleUpgrade}
            loading={loading}
          >
            Upgrade Now
          </Button>
          <button onClick={onClose} className="w-full mt-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  )
}
