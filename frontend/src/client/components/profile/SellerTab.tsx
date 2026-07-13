import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Store,
  Clock,
  BadgeCheck,
  CircleSlash,
  Ban,
  ArrowRight
} from 'lucide-react'
import {
  getMyShop,
  applyForShop,
  updateMyShop
} from '../../services/shopService'
import { useValidateToken } from '../../hooks/useAuth'

const SellerTab = () => {
  const qc = useQueryClient()
  const { data: userData } = useValidateToken()
  const { data: shop, isLoading } = useQuery({
    queryKey: ['my-shop'],
    queryFn: getMyShop,
    retry: false
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')

  // Prefill contact fields once the profile loads (it arrives async)
  useEffect(() => {
    const u = userData?.user
    if (!u) return
    setContactEmail(prev => prev || u.email || '')
    setContactPhone(prev => prev || u.phone || '')
    setAddress(prev => prev || u.address || '')
  }, [userData?.user])

  const applyMut = useMutation({
    mutationFn: () =>
      applyForShop({
        name,
        description,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address
      }),
    onSuccess: () => {
      toast.success('Application submitted! We will review it shortly.')
      qc.invalidateQueries({ queryKey: ['my-shop'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to submit application')
  })

  // Rejected applicants (still role "user", no seller-dashboard access)
  // resubmit right here: updating a rejected shop flips it back to pending.
  const [resubmitOpen, setResubmitOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const resubmitMut = useMutation({
    mutationFn: () =>
      updateMyShop({
        name: editName,
        description: editDescription
      }),
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  // No shop yet — application form
  if (!shop) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Open your shop</h2>
            <p className="text-sm text-gray-500">
              Apply to sell on the marketplace. An admin reviews every
              application before the shop goes live.
            </p>
          </div>
        </div>

        <form
          className="mt-6 space-y-4 max-w-lg"
          onSubmit={e => {
            e.preventDefault()
            if (!name.trim()) {
              toast.error('Shop name is required')
              return
            }
            applyMut.mutate()
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Shop name *
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Tech Corner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              What will you sell?
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of your shop"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact email
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact phone
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={applyMut.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {applyMut.isPending ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </div>
    )
  }

  // Existing shop — status views
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Store className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{shop.name}</h2>
          <p className="text-sm text-gray-500">/shop/{shop.slug}</p>
        </div>
      </div>

      {shop.status === 'pending' && (
        <div className="border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Application pending review</p>
            <p className="text-sm mt-1">
              We are reviewing your shop application. You will get a
              notification once it is approved.
            </p>
          </div>
        </div>
      )}

      {shop.status === 'active' && (
        <>
          <div className="border border-green-200 bg-green-50 text-green-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <BadgeCheck className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Your shop is live!</p>
              <p className="text-sm mt-1">
                Manage products, orders and your shop profile from the Seller
                Dashboard.
              </p>
            </div>
          </div>
          <Link
            to="/seller"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Seller Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}

      {shop.status === 'rejected' && (
        <>
          <div className="border border-red-200 bg-red-50 text-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <CircleSlash className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Application rejected</p>
              <p className="text-sm mt-1">
                {shop.rejection_reason
                  ? `Reason: ${shop.rejection_reason}`
                  : 'No reason was provided.'}{' '}
                Update your shop details below and resubmit.
              </p>
            </div>
          </div>
          {!resubmitOpen ? (
            <button
              onClick={() => {
                setEditName(shop.name)
                setEditDescription(shop.description || '')
                setResubmitOpen(true)
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update & resubmit <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <form
              className="space-y-3 max-w-lg border rounded-xl p-4"
              onSubmit={e => {
                e.preventDefault()
                if (!editName.trim()) {
                  toast.error('Shop name is required')
                  return
                }
                resubmitMut.mutate()
              }}
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  Shop name *
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResubmitOpen(false)}
                  className="px-4 py-2 text-sm border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitMut.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {resubmitMut.isPending ? 'Resubmitting...' : 'Resubmit'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {shop.status === 'suspended' && (
        <div className="border border-orange-200 bg-orange-50 text-orange-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <Ban className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Shop suspended</p>
            <p className="text-sm mt-1">
              {shop.rejection_reason
                ? `Reason: ${shop.rejection_reason}`
                : 'Your shop has been suspended.'}{' '}
              Its products are hidden from buyers. Contact support for details.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerTab
