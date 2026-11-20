import React, { useState, useRef } from 'react'
import { apiErrorResponse } from '../../lib/apiError'
import { Camera, LogOut, X, Loader2, Ticket, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ConfirmModal from '../components/common/ConfirmModal'

import ProfileIcon from '../../assets/profile2-icon.svg'
import OrderIcon from '../../assets/order-icon.svg'
import WishlistIcon from '../../assets/wishlist-icon.svg'
import SecurityIcon from '../../assets/security-icon.svg'
import LogoutIcon from '../../assets/logout-icon.svg'
import { Star } from 'lucide-react'

import Order from '../components/profile/Order'
import Wishlist from '../components/profile/Wishlist'
import Security from '../components/profile/Security'
import ProfileContent from '../components/profile/Profile'
import Loyalty from '../components/profile/Loyalty'
import VoucherWarehouse from '../components/profile/VoucherWarehouse'
import SellerTab from '../components/profile/SellerTab'
import {
  useValidateToken,
  useLogout,
  useUploadAvatar,
  useDeleteAvatar
} from '../hooks/useAuth'

// ========= Types =========
export type ProfileTabKey =
  | 'profile'
  | 'orders'
  | 'wishlist'
  | 'security'
  | 'loyalty'
  | 'vouchers'
  | 'seller'
  | 'logout'

const Icon: Record<string, string> = {
  profile: ProfileIcon,
  orders: OrderIcon,
  wishlist: WishlistIcon,
  security: SecurityIcon,
  logout: LogoutIcon
}

const NAV: Array<{
  key: ProfileTabKey
  label: string
  icon: keyof typeof Icon | 'loyalty'
}> = [
  { key: 'profile', label: 'Personal Data', icon: 'profile' },
  { key: 'orders', label: 'Orders', icon: 'orders' },
  { key: 'wishlist', label: 'Wish list', icon: 'wishlist' },
  { key: 'security', label: 'Security & access', icon: 'security' },
  { key: 'loyalty', label: 'Loyalty & Rewards', icon: 'loyalty' },
  { key: 'vouchers', label: 'Voucher warehouse', icon: 'loyalty' },
  { key: 'seller', label: 'Sell on Marketplace', icon: 'loyalty' },
  { key: 'logout', label: 'Log out', icon: 'logout' }
]

type User = {
  name: string
  email: string
  avatarUrl?: string
}

function Profile() {
  // ?tab=seller cho phep link thang toi mot tab (vd. "Sell on ..." o trang chu); khong cho mo tab logout
  const [tabActive, setTabActive] = React.useState<ProfileTabKey>(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return NAV.some(n => n.key === t && t !== 'logout') ? (t as ProfileTabKey) : 'profile'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorModal, setErrorModal] = useState<{
    title: string
    description: string
  } | null>(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
  const navigate = useNavigate()

  const { data: userData } = useValidateToken()
  const logoutMutation = useLogout()
  const uploadAvatarMutation = useUploadAvatar()
  const deleteAvatarMutation = useDeleteAvatar()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error: unknown) {
      toast.error(error instanceof Error && error.message ? error.message : 'Failed to logout')
    }
  }

  const handleLogoutClick = () => {
    setTabActive('logout')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setErrorModal({
        title: 'Invalid file',
        description: 'Please select a JPEG, PNG, or WebP image file.'
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorModal({
        title: 'Image too large',
        description: 'Image size should be less than 5MB.'
      })
      return
    }

    try {
      await uploadAvatarMutation.mutateAsync(file)
      toast.success('Avatar uploaded successfully')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: unknown) {
      toast.error(apiErrorResponse(error).data?.error as string || 'Failed to upload avatar')
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatarMutation.mutateAsync()
      toast.success('Avatar deleted successfully')
      setDeleteConfirmModal(false)
    } catch (error: unknown) {
      toast.error(apiErrorResponse(error).data?.error as string || 'Failed to delete avatar')
    }
  }

  const avatarUrl =
    userData?.user?.avatar ||
    'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'
  const hasAvatar = !!userData?.user?.avatar

  const USER: User = {
    name: userData?.user?.name || 'Guest',
    email: userData?.user?.email || '',
    avatarUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10">
      <ConfirmModal
        open={!!errorModal}
        title={errorModal?.title || ''}
        description={errorModal?.description}
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={() => setErrorModal(null)}
        onClose={() => setErrorModal(null)}
      />
      <ConfirmModal
        open={deleteConfirmModal}
        title="Delete Avatar"
        description="Are you sure you want to delete your avatar? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAvatar}
        onClose={() => setDeleteConfirmModal(false)}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        {/* Left Nav */}
        <aside className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 lg:p-4">
          <div className="flex items-center gap-3 px-2 pb-3 border-b border-gray-100">
            <div className="relative group">
              <img
                src={USER.avatarUrl}
                alt={USER.name}
                className="border border-gray-100 rounded-full object-cover w-16 h-16"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center gap-2 transition-all">
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadAvatarMutation.isPending}
                  className="p-1.5 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload avatar"
                >
                  {uploadAvatarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 text-gray-700 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-700" />
                  )}
                </button>
                {hasAvatar && (
                  <button
                    onClick={() => setDeleteConfirmModal(true)}
                    disabled={deleteAvatarMutation.isPending}
                    className="p-1.5 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete avatar"
                  >
                    {deleteAvatarMutation.isPending ? (
                      <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <div className="font-semibold text-gray-800">{USER.name}</div>
            </div>
          </div>

          {/* Duoi lg: thanh tab cuon ngang thay cho danh sach doc dai */}
          <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map(item => {
              if (item.key === 'logout') {
                return (
                  <button
                    key={item.key}
                    onClick={handleLogoutClick}
                    className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 text-left whitespace-nowrap rounded-lg lg:rounded-none transition ${
                      item.key === tabActive
                        ? 'bg-red-50 text-red-700 lg:border-l-2 border-red-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={Icon[item.icon as keyof typeof Icon]}
                      alt={item.icon}
                      className="h-5 w-5 lg:h-6 lg:w-6"
                    />
                    <span className="text-sm font-light">{item.label}</span>
                  </button>
                )
              }
              if (item.key === 'loyalty') {
                return (
                  <button
                    key={item.key}
                    onClick={() => setTabActive(item.key)}
                    className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 text-left whitespace-nowrap rounded-lg lg:rounded-none transition ${
                      item.key === tabActive
                        ? 'bg-blue-50 text-blue-700 lg:border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Star
                      className={`h-5 w-5 lg:h-6 lg:w-6 ${
                        item.key === tabActive
                          ? 'text-gray-700'
                          : 'text-gray-500'
                      }`}
                    />
                    <span className="text-sm font-light">{item.label}</span>
                  </button>
                )
              }
              if (item.key === 'vouchers') {
                return (
                  <button
                    key={item.key}
                    onClick={() => setTabActive(item.key)}
                    className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 text-left whitespace-nowrap rounded-lg lg:rounded-none transition ${
                      item.key === tabActive
                        ? 'bg-blue-50 text-blue-700 lg:border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Ticket
                      className={`h-5 w-5 lg:h-6 lg:w-6 ${
                        item.key === tabActive ? 'text-gray-700' : 'text-gray-500'
                      }`}
                    />
                    <span className="text-sm font-light">{item.label}</span>
                  </button>
                )
              }
              if (item.key === 'seller') {
                return (
                  <button
                    key={item.key}
                    onClick={() => setTabActive(item.key)}
                    className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 text-left whitespace-nowrap rounded-lg lg:rounded-none transition ${
                      item.key === tabActive
                        ? 'bg-blue-50 text-blue-700 lg:border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Store
                      className={`h-5 w-5 lg:h-6 lg:w-6 ${
                        item.key === tabActive ? 'text-gray-700' : 'text-gray-500'
                      }`}
                    />
                    <span className="text-sm font-light">{item.label}</span>
                  </button>
                )
              }
              return (
                <button
                  key={item.key}
                  onClick={() => setTabActive(item.key)}
                  className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 text-left whitespace-nowrap rounded-lg lg:rounded-none transition ${
                    item.key === tabActive
                      ? 'bg-blue-50 text-blue-700 lg:border-l-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <img
                    src={Icon[item.icon as keyof typeof Icon]}
                    alt={item.icon}
                    className="h-5 w-5 lg:h-6 lg:w-6"
                  />
                  <span className="text-sm font-light">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 min-h-[60vh]">
          {tabActive === 'profile' && <ProfileContent />}
          {tabActive === 'orders' && <Order />}
          {tabActive === 'wishlist' && <Wishlist />}
          {tabActive === 'security' && <Security />}
          {tabActive === 'loyalty' && <Loyalty />}
          {tabActive === 'vouchers' && <VoucherWarehouse />}
          {tabActive === 'seller' && <SellerTab />}
          {tabActive === 'logout' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="max-w-md mx-auto text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Log out
                  </h2>
                  <p className="text-gray-500">
                    Are you sure you want to log out? You will need to sign in
                    again to access your account.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setTabActive('profile')}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Profile
