import { useState, useEffect } from 'react'
import { User, Mail, Phone, Key, Home, MapPin, Edit2, X } from 'lucide-react'
import { useValidateToken, useUpdateProfile } from '../../hooks/useAuth'
import { toast } from 'sonner'

type NameModalProps = {
  title: string
  onClose: () => void
  firstName: string
  lastName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
}

type FieldModalProps = {
  title: string
  onClose: () => void
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  type?: 'text' | 'email' | 'tel'
  placeholder?: string
  label?: string
}

function NameModal({
  title,
  onClose,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onSubmit,
  isLoading = false
}: NameModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-blue-600 mb-2 ml-3">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => onFirstNameChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:border-blue-600"
              placeholder="First name"
            />
          </div>

          <div>
            <label className="block text-xs text-blue-600 mb-2 ml-3">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => onLastNameChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:border-blue-600"
              placeholder="Last name"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldModal({
  title,
  onClose,
  value,
  onChange,
  onSubmit,
  isLoading = false,
  type = 'text',
  placeholder = '',
  label = ''
}: FieldModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            {label && (
              <label className="block text-xs text-blue-600 mb-2 ml-3">
                {label}
              </label>
            )}
            <input
              type={type}
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:border-blue-600"
              placeholder={placeholder}
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { data: userData, isLoading } = useValidateToken()
  const updateProfile = useUpdateProfile()

  const [showNameModal, setShowNameModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPostalCodeModal, setShowPostalCodeModal] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneEdit, setPhoneEdit] = useState('')
  const [address, setAddress] = useState('')
  const [addressEdit, setAddressEdit] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [postalCodeEdit, setPostalCodeEdit] = useState('')

  // Initialize from user data
  useEffect(() => {
    if (userData?.user) {
      const nameParts = (userData.user.name || '').split(' ')
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setFullName(userData.user.name || '')
      setEmail(userData.user.email || '')
      setPhone(userData.user.phone || '')
      setPhoneEdit(userData.user.phone || '')
      setAddress(userData.user.address || '')
      setAddressEdit(userData.user.address || '')
      // Load postal code from localStorage
    }
  }, [userData])

  const handleSaveName = async () => {
    const newFullName = `${firstName} ${lastName}`.trim()
    if (!newFullName) {
      toast.error('Name cannot be empty')
      return
    }

    try {
      await updateProfile.mutateAsync({ name: newFullName })
      setFullName(newFullName)
      setShowNameModal(false)
      toast.success('Name updated successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update name')
    }
  }

  const handleSavePhone = async () => {
    try {
      await updateProfile.mutateAsync({ phone: phoneEdit })
      setPhone(phoneEdit)
      setShowPhoneModal(false)
      toast.success('Phone number updated successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update phone number')
    }
  }

  const handleSaveAddress = async () => {
    try {
      await updateProfile.mutateAsync({ address: addressEdit })
      setAddress(addressEdit)
      setShowAddressModal(false)
      toast.success('Address updated successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update address')
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!userData?.user) {
    return <div className="p-8">Please log in to view your profile</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Identification
          </h1>
          <p className="text-gray-500">Verify your identity</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Full name and Email row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Full name */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Full name
              </label>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{fullName}</span>
                </div>
                <button
                  onClick={() => setShowNameModal(true)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                E-mail Address
              </label>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phone number and Password row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Phone number */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Phone number
              </label>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{phone || 'Not set'}</span>
                </div>
                <button
                  onClick={() => {
                    setPhoneEdit(phone)
                    setShowPhoneModal(true)
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Address and Postal code row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Address */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Address
              </label>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Home className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{address || 'Not set'}</span>
                </div>
                <button
                  onClick={() => {
                    setAddressEdit(address)
                    setShowAddressModal(true)
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNameModal && (
        <NameModal
          title="Edit Full Name"
          onClose={() => setShowNameModal(false)}
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onSubmit={handleSaveName}
          isLoading={updateProfile.isPending}
        />
      )}

      {showPhoneModal && (
        <FieldModal
          title="Edit Phone Number"
          onClose={() => setShowPhoneModal(false)}
          value={phoneEdit}
          onChange={setPhoneEdit}
          onSubmit={handleSavePhone}
          isLoading={updateProfile.isPending}
          type="tel"
          placeholder="Enter phone number"
          label="Phone Number"
        />
      )}

      {showAddressModal && (
        <FieldModal
          title="Edit Address"
          onClose={() => setShowAddressModal(false)}
          value={addressEdit}
          onChange={setAddressEdit}
          onSubmit={handleSaveAddress}
          isLoading={updateProfile.isPending}
          type="text"
          placeholder="Enter address"
          label="Address"
        />
      )}
    </div>
  )
}
