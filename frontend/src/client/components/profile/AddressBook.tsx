import { useState, type ReactNode } from 'react'
import { MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '../common/ConfirmModal'
import { apiErrorMessage } from '../../../lib/apiError'
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress
} from '../../hooks/useAddresses'
import { VN_PROVINCES } from '../../utils/vnProvinces'
import { formatAddress, type Address, type AddressInput } from '../../services/addressService'

const MAX_ADDRESSES = 10

const inputCls =
  'w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

// Cung quy tac voi normalizeVnPhone o backend: 0xxxxxxxxx, chap nhan +84/84
const isVnPhone = (raw: string) => {
  let p = raw.replace(/[\s.\-()]/g, '')
  if (p.startsWith('+84')) p = '0' + p.slice(3)
  else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2)
  return /^0\d{9}$/.test(p)
}

type FormState = { name: string; phone: string; province: string; district: string; ward: string; street: string }
type Errors = Partial<Record<keyof FormState, string>>

const validate = (f: FormState): Errors => {
  const e: Errors = {}
  if (!f.name.trim()) e.name = 'Please enter the receiver name'
  else if (f.name.trim().length > 100) e.name = 'At most 100 characters'
  if (!isVnPhone(f.phone)) e.phone = 'Enter a valid phone number (e.g. 0912345678)'
  if (!f.street.trim()) e.street = 'Please enter the street address'
  else if (f.street.trim().length > 255) e.street = 'At most 255 characters'
  for (const k of ['province', 'district', 'ward'] as const) {
    if (f[k].trim().length > 100) e[k] = 'At most 100 characters'
  }
  return e
}

const ModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      {children}
    </div>
  </div>
)

// Form them/sua dia chi; dung chung cho trang Profile va Checkout
export function AddressFormModal({
  initial,
  onClose,
  onSaved
}: {
  initial?: Address | null
  onClose: () => void
  onSaved?: (a: Address) => void
}) {
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    province: initial?.province ?? '',
    district: initial?.district ?? '',
    ward: initial?.ward ?? '',
    street: initial?.street ?? ''
  })
  const [touched, setTouched] = useState(false)
  const createMutation = useCreateAddress()
  const updateMutation = useUpdateAddress()
  const pending = createMutation.isPending || updateMutation.isPending
  const errors = touched ? validate(form) : {}

  const submit = async () => {
    setTouched(true)
    if (Object.keys(validate(form)).length) return
    const body: AddressInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      street: form.street.trim(),
      province: form.province.trim() || null,
      district: form.district.trim() || null,
      ward: form.ward.trim() || null
    }
    try {
      const saved = initial
        ? await updateMutation.mutateAsync({ id: initial.id, ...body })
        : await createMutation.mutateAsync(body)
      toast.success(initial ? 'Address updated' : 'Address added')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save address'))
    }
  }

  const field = (key: keyof FormState, label: string, placeholder: string, listId?: string) => (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        className={`${inputCls} ${errors[key] ? 'border-red-400' : 'border-gray-200'}`}
        placeholder={placeholder}
        aria-label={label}
        list={listId}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <span className="block text-xs text-red-600 mt-1">{errors[key]}</span>}
    </label>
  )

  return (
    <ModalShell title={initial ? 'Edit address' : 'New address'} onClose={onClose}>
      <form
        className="space-y-3"
        noValidate
        onSubmit={e => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {field('name', 'Receiver name', 'Full name')}
          {field('phone', 'Phone number', 'Phone number')}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('province', 'Province / City', 'Province / City', 'vn-provinces')}
          {field('district', 'District (optional)', 'District (optional)')}
          {field('ward', 'Ward', 'Ward')}
        </div>
        <datalist id="vn-provinces">
          {VN_PROVINCES.map(p => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {field('street', 'Street address', 'House number, street')}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {pending ? 'Saving...' : 'Save address'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

const AddressLines = ({ a }: { a: Address }) => (
  <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold text-gray-900 break-words">{a.name}</span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-600">{a.phone}</span>
      {a.is_default && (
        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Default</span>
      )}
    </div>
    <p className="text-sm text-gray-600 mt-1 break-words">{formatAddress(a)}</p>
  </div>
)

// Checkout: chon mot dia chi da luu, hoac them moi
export function AddressPickerModal({
  selectedId,
  onPick,
  onClose
}: {
  selectedId?: number | null
  onPick: (a: Address) => void
  onClose: () => void
}) {
  const { data: addresses = [] } = useAddresses()
  const [adding, setAdding] = useState(false)
  if (adding) {
    return <AddressFormModal onClose={() => setAdding(false)} onSaved={a => { onPick(a); onClose() }} />
  }
  return (
    <ModalShell title="Choose a delivery address" onClose={onClose}>
      <div className="space-y-2">
        {addresses.map(a => (
          <button
            key={a.id}
            onClick={() => {
              onPick(a)
              onClose()
            }}
            className={`w-full text-left rounded-xl border p-3 hover:border-blue-400 ${a.id === selectedId ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'}`}
          >
            <AddressLines a={a} />
          </button>
        ))}
      </div>
      {addresses.length < MAX_ADDRESSES && (
        <button onClick={() => setAdding(true)} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-blue-600 hover:bg-blue-50">
          <Plus className="w-4 h-4" /> Add new address
        </button>
      )}
    </ModalShell>
  )
}

export default function AddressBook() {
  const { data: addresses = [], isLoading } = useAddresses()
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null)
  const deleteMutation = useDeleteAddress()
  const defaultMutation = useSetDefaultAddress()

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => toast.success('Address deleted'),
      onError: err => toast.error(apiErrorMessage(err, 'Failed to delete address')),
      onSettled: () => setPendingDelete(null)
    })
  }

  const makeDefault = (a: Address) =>
    defaultMutation.mutate(a.id, {
      onSuccess: () => toast.success('Default address updated'),
      onError: err => toast.error(apiErrorMessage(err, 'Failed to set default address'))
    })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My addresses</h2>
          <p className="text-sm text-gray-500">{addresses.length}/{MAX_ADDRESSES} saved</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          disabled={addresses.length >= MAX_ADDRESSES}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add new address
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 py-8 text-center">Loading...</p>
      ) : addresses.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No saved addresses yet. Add one to check out faster.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {addresses.map(a => (
            <li key={a.id} data-testid="address-card" className="py-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <AddressLines a={a} />
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button onClick={() => setEditing(a)} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setPendingDelete(a)} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                {!a.is_default && (
                  <button
                    onClick={() => makeDefault(a)}
                    disabled={defaultMutation.isPending}
                    className="text-sm border border-gray-300 rounded-lg px-2.5 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AddressFormModal initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmModal
        open={!!pendingDelete}
        title="Delete address"
        description={pendingDelete ? `Delete "${formatAddress(pendingDelete)}"?` : undefined}
        confirmText="Delete"
        tone="danger"
        confirmDisabled={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
