import { MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'

type Props = {
  onClick: () => void
  unreadCount?: number
}

export default function SupportChatFab({ onClick, unreadCount = 0 }: Props) {
  // Mobile: nut noi che tom tat gio hang/thanh toan nen an o 2 trang nay
  const { pathname } = useLocation()
  const hideOnMobile = /^\/(cart|checkout)/.test(pathname) ? 'max-lg:hidden ' : ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${hideOnMobile}fixed bottom-6 max-lg:[.has-bottom-bar_&]:bottom-24 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-600/20 transition hover:bg-blue-700`}
      aria-label="Open customer support"
    >
      <MessageCircle className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
