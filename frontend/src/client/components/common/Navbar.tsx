import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Settings, Store } from 'lucide-react'

import Login from './Login'
import Search from './Search'
import NotificationBell from './NotificationBell'

import CartDrawer from '../layout/CartDrawer'
import ConfirmModal from './ConfirmModal'

import Logo from '../../../assets/logo.svg'
import { useValidateToken } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { usePublicSettings } from '../../hooks/useSettings'
import { getTierInfo } from '../../hooks/useLoyalty'
import { OPEN_LOGIN_EVENT } from '../../utils/loginModal'

const NAV = [
  { to: '/collection/all', label: 'Shop all' },
  { to: '/flash-sale', label: 'Flash sale' },
  { to: '/shops', label: 'Shops' },
  { to: '/compare', label: 'Compare' }
]

const initials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('')

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap text-sm transition-colors ${
    isActive ? 'text-ink font-semibold' : 'text-gray-600 hover:text-ink'
  }`

const Navbar = () => {
  const [openAuth, setOpenAuth] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [infoModal, setInfoModal] = useState<string | null>(null)
  const { data: settings } = usePublicSettings('general')
  const storeName = settings?.settings?.store_name || 'Tech Shop'

  const { data: user, isLoading, isError, refetch: refetchUser } = useValidateToken()
  const isLoggedIn = !isError && !isLoading && !!user

  useEffect(() => {
    setUserLoggedIn(isLoggedIn)
  }, [isLoggedIn])

  useEffect(() => {
    const open = () => setOpenAuth(true)
    window.addEventListener(OPEN_LOGIN_EVENT, open)
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, open)
  }, [])

  const handleAuthSuccess = () => {
    refetchUser()
    setOpenAuth(false)
  }

  const { data: cartProducts, isLoading: isCartLoading } = useCart()
  const me = user?.user
  const tier = me?.segment || (me?.loyalty_points != null ? getTierInfo(me.loyalty_points).label : null)

  return (
    <>
      <nav className="section-wrap flex items-center gap-6 h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label={`${storeName} home`}>
          <img src={Logo} alt="" className="h-7 w-auto" width={28} height={28} />
          <span className="hidden sm:block text-[17px] font-bold tracking-tight text-ink">{storeName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Search />
          <CartDrawer cartProducts={isCartLoading ? null : cartProducts?.cart || null} />
          {userLoggedIn ? (
            <>
              {me?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="icon-btn"
                  title="Admin Panel"
                  aria-label="Admin Panel"
                >
                  <Settings className="h-[22px] w-[22px]" aria-hidden="true" />
                </Link>
              )}
              {me?.role === 'seller' && (
                <Link
                  to="/seller"
                  className="icon-btn"
                  title="Seller Dashboard"
                  aria-label="Seller Dashboard"
                >
                  <Store className="h-[22px] w-[22px]" aria-hidden="true" />
                </Link>
              )}
              <NotificationBell />
              <Link
                to="/profile"
                aria-label="Profile"
                title={tier ? `${me?.name} · ${tier}` : me?.name}
                className="group ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-3"
              >
                {me?.avatar ? (
                  <img src={me.avatar} alt="" className="w-8 h-8 rounded-full object-cover" width={32} height={32} />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-brand-700 text-white text-xs font-semibold flex items-center justify-center">
                    {initials(me?.name)}
                  </span>
                )}
                <span className="hidden lg:flex flex-col leading-tight text-left max-w-[120px]">
                  <span className="text-xs font-semibold text-ink truncate underline-offset-2 group-hover:underline">{me?.name}</span>
                  {tier && (
                    <span className="text-[11px] text-gray-500 truncate">
                      {tier}
                      {typeof me?.loyalty_points === 'number' && ` · ${me.loyalty_points.toLocaleString()} pts`}
                    </span>
                  )}
                </span>
              </Link>
            </>
          ) : (
            <button className="btn-primary ml-1 !px-4 !py-2" onClick={() => setOpenAuth(true)}>
              Login / Sign Up
            </button>
          )}
        </div>
      </nav>
      {/* Dien thoai: link dieu huong thanh hang cuon ngang duoi logo */}
      <div className="md:hidden border-t border-gray-200/70">
        <div className="section-wrap flex gap-6 overflow-x-auto py-2.5">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Login
        open={openAuth}
        onClose={() => setOpenAuth(false)}
        onSuccess={handleAuthSuccess}
        onForgotPassword={() => setInfoModal('Forgot password feature will be available soon.')}
        onLoginWithGoogle={() => setInfoModal('Google OAuth is being prepared.')}
        onLoginWithFacebook={() => setInfoModal('Facebook OAuth is being prepared.')}
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
