import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useValidateToken } from '../../hooks/useAuth'
import { sendPhoneOtp, verifyPhoneOtp } from '../../services/orderService'

const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.error || e?.response?.data?.message || fallback

const PhoneVerification = ({ onVerified }: { onVerified?: () => void }) => {
  const qc = useQueryClient()
  const { data } = useValidateToken()
  const user = data?.user
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone)
  }, [user?.phone, phone])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const verified = !!user?.phone_verified && user.phone === phone

  const send = async () => {
    if (!phone.trim()) return toast.error('Enter your phone number')
    setBusy(true)
    try {
      const res = await sendPhoneOtp(phone.trim())
      setSent(true)
      setDevCode(res.data?.dev_code ?? null)
      setCooldown(60)
      toast.success(res.message || 'Verification code sent')
    } catch (e: any) {
      const retry = e?.response?.data?.retry_after
      if (e?.response?.status === 429 && retry) setCooldown(Number(retry))
      toast.error(errMsg(e, 'Failed to send code'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!code.trim()) return toast.error('Enter the verification code')
    setBusy(true)
    try {
      await verifyPhoneOtp(phone.trim(), code.trim())
      toast.success('Phone verified')
      setSent(false)
      setCode('')
      setDevCode(null)
      await qc.invalidateQueries({ queryKey: ['me'] })
      onVerified?.()
    } catch (e: any) {
      toast.error(errMsg(e, 'Verification failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Phone verification</h4>
        {verified && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <BadgeCheck className="w-4 h-4" /> Verified
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || cooldown > 0}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send code'}
        </button>
      </div>
      {sent && (
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="6-digit code"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <button
            type="button"
            onClick={verify}
            disabled={busy}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      )}
      {devCode && (
        <p className="text-xs text-gray-400">Dev code: {devCode}</p>
      )}
    </div>
  )
}

export default PhoneVerification
