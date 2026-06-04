import { useEffect, useRef } from 'react'
import { Headphones, Loader2, Maximize2, MessageCircle } from 'lucide-react'
import type { Message } from '../../services/chatService'

export type SupportMessagePreview = {
  content: string
  senderName: string
  createdAt: string
}

type Props = {
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  onPreview: (preview: SupportMessagePreview) => void
}

const LONG_MESSAGE_CHARS = 320

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

export default function SupportChatMessageList({
  messages,
  isLoading,
  isSending,
  onPreview
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isSending])

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f8fa] px-3 py-3"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <div className="py-6">
          <MessageCircle className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-800">
            Customer Support
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Ask about orders, shipping, or products.
          </p>
        </div>
      ) : (
        messages.map(msg => {
          const isSupport = msg.sender?.role === 'admin'
          const canExpand = msg.content.length > LONG_MESSAGE_CHARS

          return (
            <div
              key={msg.id}
              className={`flex gap-1.5 ${isSupport ? 'justify-start' : 'justify-end'}`}
            >
              {isSupport && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Headphones className="h-3 w-3" />
                </div>
              )}
              <div
                className={`group relative min-w-0 text-sm ${
                  isSupport
                    ? 'max-w-[94%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-gray-800 shadow-sm ring-1 ring-gray-200/60'
                    : 'max-w-[88%] rounded-xl rounded-tr-sm bg-blue-600 px-3 py-2 text-white'
                }`}
              >
                {canExpand && (
                  <button
                    type="button"
                    onClick={() =>
                      onPreview({
                        content: msg.content,
                        senderName: isSupport ? msg.sender.name : 'You',
                        createdAt: msg.created_at
                      })
                    }
                    className={`absolute right-1.5 top-1.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 ${
                      isSupport
                        ? 'text-gray-400 hover:bg-gray-100'
                        : 'text-blue-200 hover:bg-blue-500'
                    }`}
                    aria-label="Expand message"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                )}
                <div className={canExpand ? 'pr-5' : ''}>
                  {isSupport && (
                    <p className="mb-0.5 text-[10px] font-medium text-gray-500">
                      {msg.sender.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                <p
                  className={`mt-1 text-[10px] ${
                    isSupport ? 'text-gray-400' : 'text-blue-200/90'
                  }`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })
      )}
      <div ref={endRef} />
    </div>
  )
}
