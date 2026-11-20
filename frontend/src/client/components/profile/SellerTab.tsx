import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Store,
  Clock,
  BadgeCheck,
  CircleSlash,
  Ban,
  ArrowRight,
  Users,
  LayoutDashboard,
  ShieldCheck,
  Check
} from 'lucide-react'
import {
  getMyShop,
  applyForShop,
  updateMyShop
} from '../../services/shopService'
import type { Shop, ShopApplication } from '../../services/shopService'
import { useValidateToken } from '../../hooks/useAuth'
import SellerApplyWizard from './SellerApplyWizard'

const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm'

const SellerTab = () => {
  const qc = useQueryClient()
  const { data: userData } = useValidateToken()
  const { data: shop, isLoading } = useQuery({
    queryKey: ['my-shop'],
    queryFn: getMyShop,
    retry: false
  })
  const [started, setStarted] = useState(false)
  const [resubmitOpen, setResubmitOpen] = useState(false)

  const applyMut = useMutation({
    mutationFn: (payload: ShopApplication) => applyForShop(payload),
    onSuccess: () => {
      toast.success('Application submitted! We will review it shortly.')
      qc.invalidateQueries({ queryKey: ['my-shop'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to submit application')
  })

  // Rejected applicants (still role "user", no seller-dashboard access)
  // resubmit right here: updating a rejected shop flips it back to pending.
  const resubmitMut = useMutation({
    mutationFn: (payload: ShopApplication) => updateMyShop(payload),
    onSuccess: () => {
      toast.success('Application resubmitted for review')
      setResubmitOpen(false)
      qc.invalidateQueries({ queryKey: ['my-shop'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to resubmit')
  })

  if (isLoading) {
    return (
      <div className={`${card} p-8`}>
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  const defaults = {
    email: userData?.user?.email,
    phone: userData?.user?.phone
  }

  if (!shop && !started) return <SellerIntro onStart={() => setStarted(true)} />

  if (!shop) {
    return (
      <div className={`${card} p-6 sm:p-8`}>
        <Header title="Register as a seller" subtitle="Complete 4 short steps to open your shop." />
        <SellerApplyWizard
          defaults={defaults}
          submitLabel="Submit application"
          submitting={applyMut.isPending}
          onSubmit={p => applyMut.mutate(p)}
          onCancel={() => setStarted(false)}
        />
      </div>
    )
  }

  if (shop.status === 'rejected' && resubmitOpen) {
    return (
      <div className={`${card} p-6 sm:p-8`}>
        <Header title="Update your application" subtitle="Fix the issues below and resubmit for review." />
        <SellerApplyWizard
          initial={shop}
          defaults={defaults}
          submitLabel="Resubmit application"
          submitting={resubmitMut.isPending}
          onSubmit={p => resubmitMut.mutate(p)}
          onCancel={() => setResubmitOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className={`${card} p-6 sm:p-8 space-y-6`}>
      <div className="flex items-center gap-4">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
            <Store className="w-7 h-7 text-blue-600" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{shop.name}</h2>
          <p className="text-sm text-gray-500">/shop/{shop.slug}</p>
        </div>
      </div>

      {shop.status !== 'suspended' && <ApplicationTimeline shop={shop} />}

      {shop.status === 'pending' && (
        <Notice tone="yellow" icon={<Clock className="w-5 h-5 mt-0.5" />} title="Application under review">
          An admin is checking your shop details, usually within 1-2 business
          days. You will get a notification once it is decided.
        </Notice>
      )}

      {shop.status === 'active' && (
        <>
          <Notice tone="green" icon={<BadgeCheck className="w-5 h-5 mt-0.5" />} title="Your shop is live!">
            Manage products, orders and your shop profile from the Seller
            Dashboard.
          </Notice>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/seller"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Seller Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/shop/${shop.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              View shop page
            </Link>
          </div>
        </>
      )}

      {shop.status === 'rejected' && (
        <>
          <Notice tone="red" icon={<CircleSlash className="w-5 h-5 mt-0.5" />} title="Application rejected">
            {shop.rejection_reason
              ? `Reason: ${shop.rejection_reason}`
              : 'No reason was provided.'}{' '}
            Update your shop details and resubmit.
          </Notice>
          <button
            onClick={() => setResubmitOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update & resubmit <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}

      {shop.status === 'suspended' && (
        <Notice tone="orange" icon={<Ban className="w-5 h-5 mt-0.5" />} title="Shop suspended">
          {shop.rejection_reason
            ? `Reason: ${shop.rejection_reason}`
            : 'Your shop has been suspended.'}{' '}
          Its products are hidden from buyers. Contact support for details.
        </Notice>
      )}
    </div>
  )
}

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
)

const BENEFITS = [
  {
    icon: Users,
    title: 'Reach every shopper',
    desc: 'Your products appear in search, recommendations and the AI shopping assistant.'
  },
  {
    icon: LayoutDashboard,
    title: 'One seller dashboard',
    desc: 'Products, orders, shipping, vouchers and invoices managed in one place.'
  },
  {
    icon: ShieldCheck,
    title: 'Trusted marketplace',
    desc: 'Every shop is reviewed, so buyers shop with confidence.'
  }
]

const SellerIntro = ({ onStart }: { onStart: () => void }) => (
  <div className={`${card} overflow-hidden`}>
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-6 sm:px-10 py-10">
      <span className="inline-flex items-center gap-2 text-xs font-medium bg-white/15 rounded-full px-3 py-1">
        <Store className="w-3.5 h-3.5" /> Seller Center
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold mt-4">Start selling on the marketplace</h2>
      <p className="text-blue-100 mt-2 max-w-xl">
        Open your shop in a few minutes. Fill in your shop, pickup and tax
        details, and we will review your application.
      </p>
      <button
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50"
      >
        Register now <ArrowRight className="w-4 h-4" />
      </button>
    </div>

    <div className="px-6 sm:px-10 py-8 grid sm:grid-cols-3 gap-6">
      {BENEFITS.map(b => (
        <div key={b.title}>
          <span className="inline-flex w-10 h-10 rounded-xl bg-blue-50 text-blue-600 items-center justify-center">
            <b.icon className="w-5 h-5" />
          </span>
          <h3 className="font-semibold text-gray-900 mt-3">{b.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{b.desc}</p>
        </div>
      ))}
    </div>

    <div className="px-6 sm:px-10 pb-10">
      <h3 className="font-semibold text-gray-900 mb-4">How it works</h3>
      <ol className="grid sm:grid-cols-4 gap-4">
        {[
          'Enter shop information',
          'Set up pickup address',
          'Add tax information',
          'Get approved and start selling'
        ].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-sm text-gray-700">{t}</span>
          </li>
        ))}
      </ol>
    </div>
  </div>
)

// Hanh trinh ho so: Gui -> Duyet -> Hoat dong; buoc 2 do neu bi tu choi
const ApplicationTimeline = ({ shop }: { shop: Shop }) => {
  const rejected = shop.status === 'rejected'
  const reached = shop.status === 'active' ? 3 : 2
  const steps = [
    { label: 'Submitted', sub: new Date(shop.created_at).toLocaleDateString() },
    { label: rejected ? 'Rejected' : 'Under review', sub: rejected ? 'Action needed' : shop.status === 'active' ? 'Approved' : 'In progress' },
    { label: 'Shop live', sub: shop.status === 'active' ? 'Selling' : '' }
  ]
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const done = i < reached - 1 || (i === reached - 1 && shop.status === 'active')
        const current = i === reached - 1 && !done
        const color = rejected && i === 1
          ? 'bg-red-500 border-red-500 text-white'
          : done
            ? 'bg-green-600 border-green-600 text-white'
            : current
              ? 'bg-white border-yellow-500 text-yellow-600'
              : 'bg-white border-gray-200 text-gray-400'
        return (
          <li key={s.label} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span className={`absolute top-4 right-1/2 w-full h-0.5 ${i < reached ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
            <span className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${color}`}>
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className="mt-2 text-sm font-medium text-gray-900">{s.label}</span>
            {s.sub && <span className="text-xs text-gray-500">{s.sub}</span>}
          </li>
        )
      })}
    </ol>
  )
}

const TONES = {
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  green: 'border-green-200 bg-green-50 text-green-800',
  red: 'border-red-200 bg-red-50 text-red-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800'
}

const Notice = ({
  tone,
  icon,
  title,
  children
}: {
  tone: keyof typeof TONES
  icon: ReactNode
  title: string
  children: ReactNode
}) => (
  <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${TONES[tone]}`}>
    {icon}
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-1">{children}</p>
    </div>
  </div>
)

export default SellerTab
