import { MessageCircle, X } from 'lucide-react'
import AiChatComposer from './AiChatComposer'
import SupportChatMessageList, {
  type SupportMessagePreview
} from './SupportChatMessageList'
import type { Message } from '../../services/chatService'

type Props = {
  panelHeight: number
  onClose: () => void
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void
  messages: Message[]
  messagesLoading: boolean
  isSending: boolean
  hasChat: boolean
  onPreview: (preview: SupportMessagePreview) => void
  message: string
  onMessageChange: (v: string) => void
  onSend: () => void
}

export default function SupportChatPanel({
  panelHeight,
  onClose,
  onResizeStart,
  messages,
  messagesLoading,
  isSending,
  hasChat,
  onPreview,
  message,
  onMessageChange,
  onSend
}: Props) {
  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-[9999] flex flex-col overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[min(100vw-2rem,400px)]"
      style={{ height: `${panelHeight}px` }}
    >
      <div
        className="h-1 shrink-0 cursor-ns-resize bg-gray-100 hover:bg-blue-100"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />

      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="flex h-9 items-center gap-2 px-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold leading-none text-gray-900">
            Customer Support
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <SupportChatMessageList
          messages={messages}
          isLoading={messagesLoading}
          isSending={isSending}
          onPreview={onPreview}
        />
        <AiChatComposer
          value={message}
          onChange={onMessageChange}
          onSend={onSend}
          isSending={isSending}
          hasChat={hasChat}
        />
      </div>
    </div>
  )
}
