import { useState } from 'react'
import { Sparkles, Check, ShieldCheck } from 'lucide-react'
import { Button, Modal } from './index'
import { createOrder, verifyPayment } from '../../api/paymentAPI'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const FEATURES = [
  'Unlimited interviews',
  'Sessions up to 90+ minutes',
  'Hard and adaptive difficulties',
  'Unlimited questions per interview',
  'Resume-based AI questions',
  'Detailed analytics and insights',
]

export default function UpgradeModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const { user, setUser } = useAuth()

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // 1. Create order
      const { data: orderData } = await createOrder()

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummykey',
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'IntervuSetu Pro',
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Upgrade to Pro"
      description="Keep the interview going past the free limits, with harder questions and a fuller report."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Maybe later
          </Button>
          <Button variant="primary" onClick={handleUpgrade} loading={loading}>
            Upgrade now
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <p className="t-xs">
          One-time purchase. No subscription, and your free interviews and history stay untouched.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-inset p-4">
        <p className="flex items-baseline gap-1.5">
          <span className="t-h1 tabular-nums">₹499</span>
          <span className="t-xs">one-time</span>
        </p>

        <ul className="mt-4 space-y-2.5">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 t-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 flex items-start gap-2 t-xs">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
        Payment is handled by Razorpay. We never see or store your card details.
      </p>
    </Modal>
  )
}
