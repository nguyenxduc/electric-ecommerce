import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

import Login from './Login'
import Search from './Search'
import NotificationBell from './NotificationBell'

import CartDrawer from '../layout/CartDrawer'
import ConfirmModal from './ConfirmModal'

// @ts-ignore
import Logo from '../../../assets/logo.svg'
// @ts-ignore
import ProfileIcon from '../../../assets/profile-icon.svg'
import { useValidateToken } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { getTierInfo } from '../../hooks/useLoyalty'

const Navbar = () => {
  const [openAuth, setOpenAuth] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [infoModal, setInfoModal] = useState<string | null>(null)

  const {
    data: user,
    isLoading,
    isError,
    refetch: refetchUser
  } = useValidateToken()
  const isLoggedIn = !isError && !isLoading && !!user

  useEffect(() => {
    setUserLoggedIn(isLoggedIn)
    console.log('User logged in status:', isLoggedIn)
  }, [isLoggedIn])

  const handleAuthSuccess = () => {
    refetchUser()
    setOpenAuth(false)
  }

  const { data: cartProducts, isLoading: isCartLoading } = useCart()

  return (
    <>
      <nav className="container mx-auto flex items-center justify-between px-3 py-4 bg-white">
        <div>
          <Link to="/">
            <img src={Logo} alt="Logo" className="h-8 w-auto" />
          </Link>
        </div>
        <div className="hidden md:flex space-x-10">
          <Link
            to="/"
            className="text-gray-700 hover:text-blue-600 text-sm font-light"
          >
            Home
          </Link>
          <Link
            to="/collection/all"
            className="text-gray-700 hover:text-blue-600 text-sm font-light"
          >
            Product
          </Link>
          <Link
            to="#"
            className="text-gray-700 hover:text-blue-600 text-sm font-light"
          >
            Blog
          </Link>
          <Link
            to="#"
            className="text-gray-700 hover:text-blue-600 text-sm font-light"
          >
            FAQ
          </Link>
          <Link
            to="#"
            className="text-gray-700 hover:text-blue-600 text-sm font-light"
          >
            Contact Us
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Search />
          {isCartLoading && <CartDrawer cartProducts={null} />}
          {!isCartLoading && (
            <CartDrawer cartProducts={cartProducts?.cart || null} />
          )}
          {userLoggedIn ? (
            <div className="flex items-center space-x-3">
              {user?.user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  title="Admin Panel"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}
              <NotificationBell />
              {(user?.user?.segment != null ||
                user?.user?.loyalty_points != null) && (
                <Link
                  to="/profile"
                  title="Loyalty & Rewards"
                  className="hidden sm:flex flex-col items-end text-right leading-tight max-w-[140px]"
                >
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                    Tier
                  </span>
                  <span className="text-xs font-semibold text-blue-700 truncate w-full">
                    {user?.user?.segment ||
                      getTierInfo(user?.user?.loyalty_points ?? 0).label}
                  </span>
                  {typeof user?.user?.loyalty_points === 'number' && (
                    <span className="text-[10px] text-gray-500">
                      {user.user.loyalty_points.toLocaleString()} pts
                    </span>
                  )}
                </Link>
              )}
              <Link to="/profile">
                <img src={ProfileIcon} alt="Profile" className="h-15 w-15" />
              </Link>
            </div>
          ) : (
            <button
              className="rounded-lg bg-blue-600 px-4 py-3 text-white text-light hover:bg-white hover:text-blue-600 hover:ring"
              onClick={() => setOpenAuth(true)}
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </nav>
      <Login
        open={openAuth}
        onClose={() => setOpenAuth(false)}
        onSuccess={handleAuthSuccess}
        onForgotPassword={() =>
          setInfoModal('Forgot password feature will be available soon.')
        }
        onLoginWithGoogle={() =>
          setInfoModal('Google OAuth is being prepared.')
        }
        onLoginWithFacebook={() =>
          setInfoModal('Facebook OAuth is being prepared.')
        }
        brand="Tech Heim"
      />
      <ConfirmModal
        open={!!infoModal}
        title="Notification"
        description={infoModal || ''}
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={() => setInfoModal(null)}
        onClose={() => setInfoModal(null)}
      />
    </>
  )
}

export default Navbar
