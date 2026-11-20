import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Store,
  Truck,
  FileText,
  ClipboardCheck,
  Check,
  ArrowLeft,
  ArrowRight,
  User,
  Building2,
  Pencil
} from 'lucide-react'
import type { Shop, ShopApplication } from '../../services/shopService'

type Form = Required<
  Pick<
    ShopApplication,
    | 'name'
    | 'description'
    | 'contact_email'
    | 'contact_phone'
    | 'pickup_province'
    | 'pickup_district'
    | 'pickup_ward'
    | 'pickup_address'
    | 'tax_code'
    | 'tax_entity_type'
  >
>

const STEPS = [
  { title: 'Shop information', icon: Store },
  { title: 'Shipping setup', icon: Truck },
  { title: 'Tax information', icon: FileText },
  { title: 'Review & submit', icon: ClipboardCheck }
]

const PHONE_RE = /^(\+84|0)\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TAX_RE = /^\d{10}(-\d{3})?$/

// Tra ve loi theo tung field cua mot buoc; rong = hop le
const validateStep = (step: number, f: Form): Partial<Record<keyof Form, string>> => {
  const e: Partial<Record<keyof Form, string>> = {}
  if (step === 0) {
    if (!f.name.trim()) e.name = 'Shop name is required'
    else if (f.name.trim().length > 60) e.name = 'Max 60 characters'
    if (!EMAIL_RE.test(f.contact_email.trim())) e.contact_email = 'Enter a valid email'
    if (!PHONE_RE.test(f.contact_phone.replace(/[\s.-]/g, '')))
      e.contact_phone = 'Enter a valid phone number, e.g. 0912345678'
  }
  if (step === 1) {
    if (!f.pickup_province.trim()) e.pickup_province = 'Required'
    if (!f.pickup_district.trim()) e.pickup_district = 'Required'
    if (!f.pickup_ward.trim()) e.pickup_ward = 'Required'
    if (!f.pickup_address.trim()) e.pickup_address = 'Required'
  }
  if (step === 2) {
    const code = f.tax_code.trim()
    if (f.tax_entity_type === 'company' && !code)
      e.tax_code = 'Companies must provide a tax code'
    else if (code && !TAX_RE.test(code))
      e.tax_code = '10 digits, or 13 with a -XXX branch suffix'
  }
  return e
}

type Props = {
  initial?: Partial<Shop>
  defaults?: { email?: string | null; phone?: string | null }
  submitLabel: string
  submitting: boolean
  onSubmit: (payload: ShopApplication) => void
  onCancel?: () => void
}

const SellerApplyWizard = ({
  initial,
  defaults,
  submitLabel,
  submitting,
  onSubmit,
  onCancel
}: Props) => {
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [form, setForm] = useState<Form>({
    name: initial?.name || '',
    description: initial?.description || '',
    contact_email: initial?.contact_email || defaults?.email || '',
    contact_phone: initial?.contact_phone || defaults?.phone || '',
    pickup_province: initial?.pickup_province || '',
    pickup_district: initial?.pickup_district || '',
    pickup_ward: initial?.pickup_ward || '',
    pickup_address: initial?.pickup_address || '',
    tax_code: initial?.tax_code || '',
    tax_entity_type: initial?.tax_entity_type || 'household'
  })
  const set = (k: keyof Form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const errors = touched ? validateStep(step, form) : {}

  const next = () => {
    if (Object.keys(validateStep(step, form)).length) {
      setTouched(true)
      return
    }
    setTouched(false)
    setStep(s => s + 1)
  }

  const submit = () => {
    // Dia chi cong khai cua shop chi lo quan/tinh, khong lo so nha lay hang
    const address = [form.pickup_district, form.pickup_province]
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ')
    onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      contact_phone: form.contact_phone.replace(/[\s.-]/g, ''),
      tax_code: form.tax_code.trim(),
      address
    })
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="flex items-start mb-8">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          const Icon = done ? Check : s.icon
          return (
            <li key={s.title} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span
                  className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${
                    i <= step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  done
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : active
                      ? 'bg-white border-blue-600 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span
                className={`mt-2 text-xs sm:text-sm text-center ${
                  active ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}
              >
                {s.title}
              </span>
            </li>
          )
        })}
      </ol>

      <form
        noValidate
        onSubmit={e => {
          e.preventDefault()
          if (step < STEPS.length - 1) next()
          else if (agreed) submit()
        }}
        className="space-y-5"
      >
        {step === 0 && (
          <>
            <Section
              title="Shop information"
              hint="This is how buyers will see your shop."
            />
            <Field label="Shop name" required error={errors.name} counter={`${form.name.length}/60`}>
              <input
                className={inputCls(errors.name)}
                value={form.name}
                maxLength={60}
                onChange={e => set('name')(e.target.value)}
                placeholder="e.g. Tech Corner"
              />
            </Field>
            <Field label="Shop description" hint="What will you sell? Optional, you can edit it later.">
              <textarea
                className={`${inputCls()} min-h-[96px]`}
                value={form.description}
                maxLength={500}
                onChange={e => set('description')(e.target.value)}
                placeholder="e.g. Genuine laptops and accessories with 12-month warranty"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Contact email" required error={errors.contact_email}>
                <input
                  type="email"
                  className={inputCls(errors.contact_email)}
                  value={form.contact_email}
                  onChange={e => set('contact_email')(e.target.value)}
                />
              </Field>
              <Field label="Contact phone" required error={errors.contact_phone}>
                <input
                  type="tel"
                  className={inputCls(errors.contact_phone)}
                  value={form.contact_phone}
                  onChange={e => set('contact_phone')(e.target.value)}
                  placeholder="0912345678"
                />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Section
              title="Pickup address"
              hint="Carriers collect your parcels here. Only the district and province are shown on your shop page."
            />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Province / City" required error={errors.pickup_province}>
                <input
                  className={inputCls(errors.pickup_province)}
                  value={form.pickup_province}
                  onChange={e => set('pickup_province')(e.target.value)}
                  placeholder="Ha Noi"
                />
              </Field>
              <Field label="District" required error={errors.pickup_district}>
                <input
                  className={inputCls(errors.pickup_district)}
                  value={form.pickup_district}
                  onChange={e => set('pickup_district')(e.target.value)}
                  placeholder="Hoan Kiem"
                />
              </Field>
              <Field label="Ward" required error={errors.pickup_ward}>
                <input
                  className={inputCls(errors.pickup_ward)}
                  value={form.pickup_ward}
                  onChange={e => set('pickup_ward')(e.target.value)}
                  placeholder="Trang Tien"
                />
              </Field>
            </div>
            <Field label="Street address" required error={errors.pickup_address}>
              <input
                className={inputCls(errors.pickup_address)}
                value={form.pickup_address}
                onChange={e => set('pickup_address')(e.target.value)}
                placeholder="House number, street name"
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Section
              title="Business type"
              hint="Determines how tax is handled on your sales and invoices."
            />
            <div className="grid sm:grid-cols-2 gap-4" role="radiogroup">
              <TypeCard
                selected={form.tax_entity_type === 'household'}
                onSelect={() => set('tax_entity_type')('household')}
                icon={<User className="w-5 h-5" />}
                title="Individual / household business"
                desc="The marketplace withholds tax on your behalf. Tax code is optional."
              />
              <TypeCard
                selected={form.tax_entity_type === 'company'}
                onSelect={() => set('tax_entity_type')('company')}
                icon={<Building2 className="w-5 h-5" />}
                title="Company"
                desc="You declare tax yourself. A company tax code is required."
              />
            </div>
            <Field
              label="Tax code"
              required={form.tax_entity_type === 'company'}
              error={errors.tax_code}
              hint="10 digits, or 13 digits with a -XXX branch suffix."
            >
              <input
                className={inputCls(errors.tax_code)}
                value={form.tax_code}
                inputMode="numeric"
                onChange={e => set('tax_code')(e.target.value)}
                placeholder="0101234567"
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Section
              title="Review your application"
              hint="Check everything before submitting. An admin usually reviews within 1-2 business days."
            />
            <Summary
              title="Shop information"
              onEdit={() => setStep(0)}
              rows={[
                ['Shop name', form.name],
                ['Description', form.description || '-'],
                ['Email', form.contact_email],
                ['Phone', form.contact_phone]
              ]}
            />
            <Summary
              title="Pickup address"
              onEdit={() => setStep(1)}
              rows={[
                [
                  'Address',
                  [form.pickup_address, form.pickup_ward, form.pickup_district, form.pickup_province].join(', ')
                ]
              ]}
            />
            <Summary
              title="Tax information"
              onEdit={() => setStep(2)}
              rows={[
                [
                  'Business type',
                  form.tax_entity_type === 'company' ? 'Company' : 'Individual / household business'
                ],
                ['Tax code', form.tax_code || '-']
              ]}
            />
            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-blue-600"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>
                I confirm the information above is accurate and agree to the
                marketplace seller policies, including product listing rules and
                order fulfillment obligations.
              </span>
            </label>
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTouched(false)
                setStep(s => s - 1)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!agreed || submitting}
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

const inputCls = (error?: string) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
    error
      ? 'border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
  }`

const Section = ({ title, hint }: { title: string; hint: string }) => (
  <div>
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-0.5">{hint}</p>
  </div>
)

const Field = ({
  label,
  required,
  error,
  hint,
  counter,
  children
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  counter?: string
  children: ReactNode
}) => (
  <label className="block">
    <span className="flex justify-between text-sm font-medium text-gray-800 mb-1.5">
      <span>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {counter && <span className="text-xs font-normal text-gray-400">{counter}</span>}
    </span>
    {children}
    {error ? (
      <span className="block text-xs text-red-600 mt-1">{error}</span>
    ) : (
      hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>
    )}
  </label>
)

const TypeCard = ({
  selected,
  onSelect,
  icon,
  title,
  desc
}: {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  title: string
  desc: string
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={`text-left rounded-xl border-2 p-4 transition ${
      selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <span
      className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-2 ${
        selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {icon}
    </span>
    <span className="block font-medium text-gray-900">{title}</span>
    <span className="block text-sm text-gray-500 mt-1">{desc}</span>
  </button>
)

const Summary = ({
  title,
  rows,
  onEdit
}: {
  title: string
  rows: [string, string][]
  onEdit: () => void
}) => (
  <div className="rounded-xl border border-gray-200">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
      <span className="text-sm font-semibold text-gray-900">{title}</span>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit
      </button>
    </div>
    <dl className="px-4 py-3 space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-3 gap-3 text-sm">
          <dt className="text-gray-500">{k}</dt>
          <dd className="col-span-2 text-gray-900 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  </div>
)

export default SellerApplyWizard
