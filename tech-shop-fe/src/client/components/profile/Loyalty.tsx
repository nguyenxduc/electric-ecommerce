import { useState } from 'react'
import {
  Star,
  Gift,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Award
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useLoyaltySummary,
  useRedeemPoints,
  getTierInfo,
  getNextTier,
  TIERS
} from '../../hooks/useLoyalty'

/** Màu nhẹ theo tier — chỉ dùng cho nhãn, không lấn át theme xanh chung */
const TIER_BADGE: Record<
  string,
  { className: string }
> = {
  BRONZE: { className: 'bg-orange-100 text-orange-900 ring-orange-300/70' },
  SILVER: { className: 'bg-slate-100 text-slate-700 ring-slate-200/80' },
  GOLD: { className: 'bg-yellow-100 text-yellow-900 ring-yellow-300/80' },
  PLATINUM: { className: 'bg-violet-50 text-violet-800 ring-violet-200/70' }
}

const TIER_CARD_STYLE: Record<
  string,
  { iconWrap: string; title: string; sub: string; activeBg: string }
> = {
  BRONZE: {
    iconWrap: 'bg-orange-100 text-orange-800 ring-orange-300/70',
    title: 'text-orange-800',
    sub: 'text-orange-700/80',
    activeBg: 'from-orange-50 to-white'
  },
  SILVER: {
    iconWrap: 'bg-slate-100 text-slate-700 ring-slate-300/70',
    title: 'text-slate-700',
    sub: 'text-slate-600/80',
    activeBg: 'from-slate-50 to-white'
  },
  GOLD: {
    iconWrap: 'bg-yellow-100 text-yellow-800 ring-yellow-300/80',
    title: 'text-yellow-800',
    sub: 'text-yellow-700/80',
    activeBg: 'from-yellow-50 to-white'
  },
  PLATINUM: {
    iconWrap: 'bg-violet-100 text-violet-700 ring-violet-300/80',
    title: 'text-violet-700',
    sub: 'text-violet-700/80',
    activeBg: 'from-violet-50 to-white'
  }
}

export default function Loyalty() {
  const { data, isLoading, isError } = useLoyaltySummary()
  const redeemMutation = useRedeemPoints()

  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemDesc, setRedeemDesc] = useState('')
  const [showRedeemForm, setShowRedeemForm] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">
          Cannot load loyalty information. Please try again later.
        </p>
      </div>
    )
  }

  const { user, transactions } = data
  const rewardVouchers = data.reward_vouchers ?? []
  const points = user.loyalty_points ?? 0
  const minRedeemPoints = data.point_policy?.min_redeem_points ?? 50
  const tierInfo =
    data.tier?.key && TIERS.some(t => t.key === data.tier?.key)
      ? TIERS.find(t => t.key === data.tier?.key)!
      : user.segment && TIERS.some(t => t.key === user.segment)
        ? TIERS.find(t => t.key === user.segment)!
      : getTierInfo(points)
  const nextTier = getNextTier(points)
  const progress = nextTier
    ? Math.min(
        100,
        Math.round(
          ((points - tierInfo.min) / (nextTier.min - tierInfo.min)) * 100
        )
      )
    : 100

  const badgeStyle =
    TIER_BADGE[tierInfo.key] ?? TIER_BADGE['BRONZE']

  const handleRedeem = async () => {
    const pts = parseInt(redeemAmount)
    if (!pts || pts <= 0) {
      toast.error('Please enter a valid number of points')
      return
    }
    if (pts < minRedeemPoints) {
      toast.error(`Minimum redeem is ${minRedeemPoints} points`)
      return
    }
    if (pts > points) {
      toast.error('Not enough points')
      return
    }
    try {
      await redeemMutation.mutateAsync({
        points: pts,
        description: redeemDesc || 'Redeem reward'
      })
      toast.success(`Successfully redeemed ${pts} points!`)
      setRedeemAmount('')
      setRedeemDesc('')
      setShowRedeemForm(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to redeem points')
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary — theme xanh như Personal Data / CTA shop */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 shadow-sm p-6 ring-1 ring-blue-100/80">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600/90 mb-2">
              Current tier
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${badgeStyle.className}`}
              >
                <Award className="w-4 h-4 opacity-80" aria-hidden />
                {tierInfo.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-blue-600/90 mb-1">
              Your points
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Star
                className="w-6 h-6 text-black"
                aria-hidden
              />
              <span className="text-3xl font-bold tracking-tight text-gray-900">
                {points.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {nextTier ? (
            <>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>
                  {tierInfo.label} ({tierInfo.min.toLocaleString()} pts)
                </span>
                <span>
                  {nextTier.label} ({nextTier.min.toLocaleString()} pts)
                </span>
              </div>
              <div className="w-full rounded-full h-2.5 bg-blue-100/90 overflow-hidden border border-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                <span className="font-semibold text-gray-800">
                  {(nextTier.min - points).toLocaleString()} pts
                </span>{' '}
                more to reach{' '}
                <span className="font-semibold text-blue-700">
                  {nextTier.label}
                </span>
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              You&apos;ve reached the highest tier — Platinum!
            </div>
          )}
        </div>
      </div>

      {/* Tier ladder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Tier benefits</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIERS.map(t => {
            const active = tierInfo.key === t.key
            const tierStyle = TIER_CARD_STYLE[t.key] ?? TIER_CARD_STYLE['BRONZE']
            return (
              <div
                key={t.key}
                className={`rounded-xl p-3 border text-center transition-shadow ${
                  active
                    ? `border-blue-400 bg-gradient-to-b ${tierStyle.activeBg} shadow-sm ring-2 ring-blue-100`
                    : 'border-gray-100 bg-gray-50/80 hover:border-gray-200'
                }`}
              >
                <div
                  className={`inline-flex rounded-full p-1.5 mx-auto mb-2 ring-1 ${tierStyle.iconWrap}`}
                >
                  <Award className="w-4 h-4" aria-hidden />
                </div>
                <div className={`text-sm font-bold ${tierStyle.title}`}>{t.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t.max === Infinity
                    ? `${t.min.toLocaleString()}+ pts`
                    : `${t.min.toLocaleString()}–${t.max.toLocaleString()} pts`}
                </div>
                <div className={`text-[11px] mt-1.5 ${tierStyle.sub}`}>
                  Earn x{t.multiplier}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-4">
                  {t.benefits[0]}
                </p>
                <p className="text-[11px] text-blue-700 mt-1 leading-4 font-medium">
                  {t.key === 'SILVER' && 'Upgrade gift: 5% voucher'}
                  {t.key === 'GOLD' && 'Upgrade gift: 10% voucher'}
                  {t.key === 'PLATINUM' && 'Upgrade gift: 15% voucher'}
                  {t.key === 'BRONZE' && 'Upgrade gift starts from Silver'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">
          Tier upgrade vouchers
        </h3>
        {rewardVouchers.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl px-4 py-5 bg-gray-50/60">
            You will receive voucher rewards when reaching Silver, Gold, or Platinum.
          </p>
        ) : (
          <div className="space-y-2">
            {rewardVouchers.map(v => (
              <div
                key={v.id}
                className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-blue-900">{v.code}</p>
                  <p className="text-xs text-gray-600">
                    {v.discount_type === 'percent'
                      ? `Discount ${v.discount_value}%`
                      : `Discount ${v.discount_value.toLocaleString()} VND`}
                    {v.min_order ? ` • Min order ${Number(v.min_order).toLocaleString()} VND` : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Exp: {v.expires_at ? new Date(v.expires_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redeem */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Redeem points
            </h3>
          </div>
          {!showRedeemForm && (
            <button
              type="button"
              onClick={() => setShowRedeemForm(true)}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Redeem
            </button>
          )}
        </div>

        {showRedeemForm ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1.5">
                Points to redeem
              </label>
              <input
                type="number"
                min={minRedeemPoints}
                max={points}
                value={redeemAmount}
                onChange={e => setRedeemAmount(e.target.value)}
                className="w-full border-2 border-blue-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-0"
                placeholder={`Min: ${minRedeemPoints} • Max: ${points.toLocaleString()} pts`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1.5">
                Note (optional)
              </label>
              <input
                type="text"
                value={redeemDesc}
                onChange={e => setRedeemDesc(e.target.value)}
                className="w-full border-2 border-blue-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-0"
                placeholder="e.g. Redeem for discount voucher"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleRedeem}
                disabled={redeemMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {redeemMutation.isPending ? 'Processing...' : 'Confirm redeem'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRedeemForm(false)
                  setRedeemAmount('')
                  setRedeemDesc('')
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            You have{' '}
            <span className="font-semibold text-gray-900">
              {points.toLocaleString()} pts
            </span>{' '}
            available to redeem. Minimum redeem: {minRedeemPoints} pts.
          </p>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">
          Points history
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            No transactions yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {transactions.map((tx, i) => (
              <div
                key={tx.id ?? i}
                className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      tx.type === 'EARN'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-red-50 text-red-600 ring-1 ring-red-100'
                    }`}
                  >
                    {tx.type === 'EARN' ? '+' : '−'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {tx.description ||
                        (tx.type === 'EARN' ? 'Earned from order' : 'Redeemed')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    tx.type === 'EARN' ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {tx.type === 'EARN' ? '+' : ''}
                  {tx.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
