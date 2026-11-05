import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Clock, Ban, CircleSlash, Store } from 'lucide-react'
import { getMyShop, updateMyShop } from '../../../client/services/shopService'
import { updateShopSettings } from '../../services/sellerService'

const STATUS_INFO: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: 'Pending review',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  active: {
    icon: BadgeCheck,
    label: 'Active',
    className: 'bg-green-50 border-green-200 text-green-800'
  },
  rejected: {
    icon: CircleSlash,
    label: 'Rejected',
    className: 'bg-red-50 border-red-200 text-red-800'
  },
  suspended: {
    icon: Ban,
    label: 'Suspended',
    className: 'bg-orange-50 border-orange-200 text-orange-800'
  }
}

export default function SellerShopProfile() {
  const qc = useQueryClient()
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
  const [shippingFee, setShippingFee] = useState('')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('')
  const [ext, setExt] = useState({
    pickup_province: '',
    pickup_district: '',
    pickup_ward: '',
    pickup_address: '',
    tax_code: '',
    tax_entity_type: 'household'
  })

  useEffect(() => {
    if (shop) {
      const sx = shop as any
      setExt({
        pickup_province: sx.pickup_province || '',
        pickup_district: sx.pickup_district || '',
        pickup_ward: sx.pickup_ward || '',
        pickup_address: sx.pickup_address || '',
        tax_code: sx.tax_code || '',
        tax_entity_type: sx.tax_entity_type || 'household'
      })
      setName(shop.name || '')
      setDescription(shop.description || '')
      setContactEmail(shop.contact_email || '')
      setContactPhone(shop.contact_phone || '')
      setAddress(shop.address || '')
      setShippingFee(
        shop.shipping_fee_override != null
          ? String(shop.shipping_fee_override)
          : ''
      )
      setFreeShippingThreshold(
        shop.free_shipping_threshold_override != null
          ? String(shop.free_shipping_threshold_override)
          : ''
      )
    }
  }, [shop])

  const updateMut = useMutation({
    mutationFn: async () => {
      await updateShopSettings(ext)
      return updateMyShop({
        name,
        description,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        shipping_fee_override: shippingFee,
        free_shipping_threshold_override: freeShippingThreshold
      })
    },
    onSuccess: () => {
      toast.success(
        shop?.status === 'rejected'
          ? 'Application resubmitted for review'
          : 'Shop profile updated'
      )
      qc.invalidateQueries({ queryKey: ['my-shop'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to update shop')
  })

  if (isLoading) {
    return <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
  }

  if (!shop) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center space-y-3">
        <Store className="w-10 h-10 text-gray-400 mx-auto" />
        <p className="text-gray-600">
          You don't have a shop yet. Apply from your profile page.
        </p>
      </div>
    )
  }

  const statusInfo = STATUS_INFO[shop.status] || STATUS_INFO.pending
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Shop Profile</h1>

      <div
        className={`border rounded-lg px-4 py-3 flex items-start gap-3 ${statusInfo.className}`}
      >
        <StatusIcon className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-medium">Status: {statusInfo.label}</p>
          {shop.status === 'pending' && (
            <p className="text-sm mt-1">
              Your application is being reviewed by the marketplace team. Your
              products stay hidden from buyers until approval.
            </p>
          )}
          {shop.status === 'rejected' && (
            <p className="text-sm mt-1">
              {shop.rejection_reason
                ? `Reason: ${shop.rejection_reason}`
                : 'No reason provided.'}{' '}
              Update your details below and save to resubmit.
            </p>
          )}
          {shop.status === 'suspended' && (
            <p className="text-sm mt-1">
              {shop.rejection_reason
                ? `Reason: ${shop.rejection_reason}`
                : 'Your shop is suspended and hidden from buyers. Contact support.'}
            </p>
          )}
        </div>
      </div>

      <form
        className="bg-white rounded-lg border p-6 space-y-4"
        onSubmit={e => {
          e.preventDefault()
          if (!name.trim()) {
            toast.error('Shop name is required')
            return
          }
          updateMut.mutate()
        }}
      >
        <div>
          <label className="block text-sm font-medium mb-1">Shop name</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Public URL: /shop/{shop.slug}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
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
        <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Shipping fee (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={shippingFee}
              onChange={e => setShippingFee(e.target.value)}
              placeholder="Platform default"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to use the platform default fee.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Free shipping from (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={freeShippingThreshold}
              onChange={e => setFreeShippingThreshold(e.target.value)}
              placeholder="Platform default"
            />
            <p className="text-xs text-gray-500 mt-1">
              Orders from your shop above this amount ship free.
            </p>
          </div>
        </div>
        <div className="border-t pt-4 space-y-3">
          <div className="font-medium">Pickup address</div>
          <div className="grid md:grid-cols-3 gap-4">
            {(
              [
                ['pickup_province', 'Province / City'],
                ['pickup_district', 'District'],
                ['pickup_ward', 'Ward']
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={ext[k]}
                  onChange={e => setExt({ ...ext, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Street address"
            value={ext.pickup_address}
            onChange={e => setExt({ ...ext, pickup_address: e.target.value })}
          />
        </div>
        <div className="border-t pt-4 space-y-3">
          <div className="font-medium">Tax</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tax code</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="10 digits, optionally -XXX"
                value={ext.tax_code}
                onChange={e => setExt({ ...ext, tax_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Entity type
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={ext.tax_entity_type}
                onChange={e =>
                  setExt({ ...ext, tax_entity_type: e.target.value })
                }
              >
                <option value="household">Household / individual</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Household sellers have 1% VAT + 0.5% PIT withheld by the platform
            per Decree 117/2025.
          </p>
        </div>
        <button
          type="submit"
          disabled={updateMut.isPending}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {updateMut.isPending
            ? 'Saving...'
            : shop.status === 'rejected'
              ? 'Save & Resubmit'
              : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
