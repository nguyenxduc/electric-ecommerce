import { Bot } from 'lucide-react'
import { useLocation } from 'react-router-dom'

type Props = {
  onClick: () => void
}

export default function AiChatFab({ onClick }: Props) {
  // Mobile: nut noi che tom tat gio hang/thanh toan nen an o 2 trang nay
  const { pathname } = useLocation()
  const hideOnMobile = /^\/(cart|checkout)/.test(pathname) ? 'max-lg:hidden ' : ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${hideOnMobile}fixed bottom-24 max-lg:[.has-bottom-bar_&]:bottom-44 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-600/20 transition hover:bg-blue-700`}
      aria-label="Open AI assistant"
    >
      <Bot className="h-6 w-6" />
    </button>
  )
}
