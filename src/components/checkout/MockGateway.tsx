import { useState } from 'react'
import { CreditCard, Landmark, Loader2, ShieldCheck, Smartphone } from 'lucide-react'
import type { CreatedOrder } from '../../lib/api'
import { cx } from '../../lib/format'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

const methods = [
  { id: 'upi', label: 'UPI', icon: Smartphone, hint: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', icon: CreditCard, hint: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Netbanking', icon: Landmark, hint: 'All major banks' },
] as const

/**
 * Stand-in for Razorpay Checkout while the site runs in demo mode.
 * No money moves and no card details are collected here.
 */
export function MockGateway({
  order,
  onSuccess,
  onFailure,
  onDismiss,
}: {
  order: CreatedOrder
  onSuccess: () => void
  onFailure: () => void
  onDismiss: () => void
}) {
  const [method, setMethod] = useState<(typeof methods)[number]['id']>('upi')
  const [processing, setProcessing] = useState(false)
  const amount = `₹${(order.amount / 100).toLocaleString('en-IN')}`

  const pay = () => {
    setProcessing(true)
    window.setTimeout(onSuccess, 1200)
  }

  return (
    <Modal open onClose={processing ? () => {} : onDismiss} size="sm" title="Complete your payment" description={`${order.bookTitle} · Order ${order.orderId}`}>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Amount payable</span>
          <span className="font-display text-2xl font-bold">{amount}</span>
        </div>
        <p className="mt-1 text-xs text-muted">Paying as {order.customer.email}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Pay with</legend>
        <div className="mt-2 grid gap-2">
          {methods.map(({ id, label, icon: Icon, hint }) => (
            <label
              key={id}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition duration-300 hover:-translate-y-0.5',
                method === id ? 'border-indigo bg-indigo-50/60 shadow-[0_10px_24px_-16px_rgb(54_84_255/0.8)]' : 'border-line bg-white hover:border-line-2',
              )}
            >
              <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
              <span className={cx('grid size-10 place-items-center rounded-xl', method === id ? 'bg-indigo text-white' : 'bg-paper-2 text-ink')}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
              <span className={cx('size-4 rounded-full border-2', method === id ? 'border-indigo bg-indigo shadow-[inset_0_0_0_3px_#fff]' : 'border-line-2')} aria-hidden />
            </label>
          ))}
        </div>
      </fieldset>

      <Button size="lg" className="mt-6 w-full" onClick={pay} disabled={processing}>
        {processing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        {processing ? 'Processing payment…' : `Pay ${amount}`}
      </Button>
      <button onClick={onFailure} disabled={processing} className="mt-3 w-full text-center text-sm font-medium text-coral-700 hover:underline disabled:opacity-40">
        Simulate a failed payment
      </button>
      <p className="mt-5 rounded-xl border border-dashed border-line-2 p-3 text-center text-xs text-muted">
        Demo payment window. When your Razorpay keys are connected, the real Razorpay checkout opens here instead.
      </p>
    </Modal>
  )
}
