import { useRef, useEffect } from 'react'
import { Bot, Loader2, Maximize2, MessageCircle } from 'lucide-react'
import AiMessageMarkdown from './AiMessageMarkdown'
import AiMessageFeedback from './AiMessageFeedback'
import AiChatTypingIndicator from './AiChatTypingIndicator'
import type { MessagePreview, RenderableMessage } from './aiChatTypes'
import { QUICK_PROMPTS } from './aiChatTypes'

type Props = {
  messages: RenderableMessage[]
  isLoading: boolean
  isSending: boolean
  selectedChatId?: string | number
  ratedMap: Record<string, number>
  onRated: (id: string, stars: number) => void
  onPreview: (preview: MessagePreview) => void
  onQuickPrompt: (text: string) => void
}

const LONG_MESSAGE_CHARS = 320

export default function AiChatMessageList({
  messages,
  isLoading,
  isSending,
  selectedChatId,
  ratedMap,
  onRated,
  onPreview,
  onQuickPrompt
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
      className="flex-1 min-h-0 space-y-3 overflow-y-auto bg-[#f7f8fa] px-3 py-3"
    >
      {isLoading && !isSending ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <div className="py-6">
          <MessageCircle className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-800">
            Ask about products
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Prices, specs, or recommendations.
          </p>
          {selectedChatId && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt(prompt)}
                  disabled={isSending}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] text-gray-700 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-blue-200 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        messages.map(msg => {
          const isAi = msg.role === 'assistant'
          const mid = String(msg.id)
          const canExpand = msg.content.length > LONG_MESSAGE_CHARS

          return (
            <div
              key={msg.id}
              className={`flex gap-1.5 ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              {isAi && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Bot className="h-3 w-3" />
                </div>
              )}
              <div
                className={`group relative min-w-0 text-sm ${
                  isAi
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
                        role: isAi ? 'assistant' : 'user',
                        createdAt: msg.created_at
                      })
                    }
                    className={`absolute right-1.5 top-1.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 ${
                      isAi
                        ? 'text-gray-400 hover:bg-gray-100'
                        : 'text-blue-200 hover:bg-blue-500'
                    }`}
                    aria-label="Expand message"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                )}
                <div className={canExpand ? 'pr-5' : ''}>
                  <AiMessageMarkdown
                    text={msg.content}
                    variant={isAi ? 'assistant' : 'user'}
                  />
                </div>
                <div
                  className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                    isAi ? 'text-[10px] text-gray-400' : 'text-[10px] text-blue-200/90'
                  }`}
                >
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isAi && selectedChatId && (
                    <AiMessageFeedback
                      messageId={mid}
                      chatId={selectedChatId}
                      disabled={isSending}
                      initialRating={ratedMap[mid] ?? null}
                      onRated={onRated}
                      inline
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
      {isSending && <AiChatTypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
