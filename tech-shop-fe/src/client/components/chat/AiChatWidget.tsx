import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Bot,
  MessageCircle,
  Send,
  X,
  Loader2,
  PlusCircle,
  Star,
  Trash2
} from 'lucide-react'
import { useValidateToken } from '../../hooks/useAuth'
import AiMessageMarkdown from './AiMessageMarkdown'
import {
  useAiChats,
  useAiMessages,
  useCreateAiChat,
  useSendAiMessage,
  useDeleteAiChat,
  useSubmitAiFeedback
} from '../../hooks/useAiAssistant'
import { toast } from 'sonner'

const AiChatWidget = () => {
  const { data: userData } = useValidateToken()
  const hasToken = !!localStorage.getItem('accessToken')

  if (!hasToken || !userData?.user) return null

  return <AiChatWidgetInner />
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-gray-500">AI đang trả lời…</span>
        </div>
      </div>
    </div>
  )
}

function MessageStars({
  messageId,
  chatId,
  disabled,
  initialRating,
  onRated
}: {
  messageId: string
  chatId: string | number
  disabled?: boolean
  initialRating?: number | null
  onRated: (id: string, stars: number) => void
}) {
  const submitFeedback = useSubmitAiFeedback()
  const [hover, setHover] = useState(0)
  const [localRating, setLocalRating] = useState<number | null>(
    initialRating ?? null
  )

  const display = hover || localRating || 0

  const handlePick = async (stars: number) => {
    if (disabled || submitFeedback.isPending) return
    try {
      await submitFeedback.mutateAsync({
        chatId,
        rating: stars,
        ai_message_id: messageId
      })
      setLocalRating(stars)
      onRated(messageId, stars)
      toast.success('Cảm ơn bạn đã đánh giá!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không gửi được đánh giá')
    }
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
        Hữu ích?
      </span>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled || submitFeedback.isPending}
            onMouseEnter={() => setHover(n)}
            onClick={() => handlePick(n)}
            className="p-0.5 rounded hover:bg-emerald-50 disabled:opacity-40 transition-colors"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              className={`w-4 h-4 ${
                n <= display
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {localRating != null && (
        <span className="text-[10px] text-emerald-600">Đã gửi</span>
      )}
    </div>
  )
}

function AiChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [panelHeight, setPanelHeight] = useState(600)
  const [previewText, setPreviewText] = useState<{
    content: string
    role: 'assistant' | 'user'
    createdAt: string
  } | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<
    Array<{
      id: string
      role: 'user'
      chatId: string
      content: string
      created_at: string
      _optimistic: true
    }>
  >([])
  const [activeChatId, setActiveChatId] = useState<string | number | undefined>(
    undefined
  )
  const [autoCreated, setAutoCreated] = useState(false)
  const [ratedMap, setRatedMap] = useState<Record<string, number>>({})

  const { data: chatsData, isLoading: chatsLoading } = useAiChats(isOpen)
  const chats = chatsData?.data?.chats || []

  const selectedChatId = useMemo(() => {
    if (activeChatId) return activeChatId
    if (chats.length > 0) return chats[0].id
    return undefined
  }, [activeChatId, chats])

  const sendMessageMutation = useSendAiMessage()

  const { data: messagesData, isLoading: messagesLoading } = useAiMessages(
    selectedChatId,
    { pausePoll: false }
  )
  const messages = messagesData?.data?.messages || []
  const normalizeText = (value: string) => value.trim().toLowerCase()
  const activeOptimisticMessages = optimisticMessages.filter(
    m => String(m.chatId) === String(selectedChatId)
  )
  const renderedMessages = [...messages, ...activeOptimisticMessages]

  const createChatMutation = useCreateAiChat()
  const deleteChatMutation = useDeleteAiChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } else if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, optimisticMessages, isOpen, sendMessageMutation.isPending])

  // Keep optimistic user messages until server-side user message appears.
  useEffect(() => {
    if (!selectedChatId || optimisticMessages.length === 0 || messages.length === 0) return
    setOptimisticMessages(prev =>
      prev.filter(opt => {
        if (String(opt.chatId) !== String(selectedChatId)) return true
        const matched = messages.some((m: any) => {
          if (m.role !== 'user') return false
          if (normalizeText(String(m.content || '')) !== normalizeText(opt.content)) return false
          const serverTs = new Date(m.created_at).getTime()
          const optTs = new Date(opt.created_at).getTime()
          return Number.isFinite(serverTs) && Number.isFinite(optTs)
            ? serverTs >= optTs - 2000
            : true
        })
        return !matched
      })
    )
  }, [messages, optimisticMessages, selectedChatId])

  useEffect(() => {
    if (
      isOpen &&
      !chatsLoading &&
      chats.length === 0 &&
      !autoCreated &&
      !createChatMutation.isPending
    ) {
      createChatMutation
        .mutateAsync('AI Assistant')
        .then(res => {
          setActiveChatId(res.data.id)
          setAutoCreated(true)
        })
        .catch(err => {
          toast.error(
            err?.response?.data?.error || 'Failed to create conversation'
          )
        })
    }
  }, [isOpen, chatsLoading, chats.length, autoCreated, createChatMutation])

  const handleCreateChat = async () => {
    try {
      const res = await createChatMutation.mutateAsync('AI Assistant')
      setActiveChatId(res.data.id)
      setAutoCreated(true)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || 'Failed to create conversation'
      )
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedChatId) return
    const payload = message.trim()
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    flushSync(() => {
      setOptimisticMessages(prev => [
        ...prev,
        {
          id: tempId,
          role: 'user',
          chatId: String(selectedChatId),
          content: payload,
          created_at: new Date().toISOString(),
          _optimistic: true
        }
      ])
      setMessage('')
    })
    if (inputRef.current) inputRef.current.value = ''
    try {
      await sendMessageMutation.mutateAsync({
        chatId: selectedChatId,
        content: payload
      })
    } catch (error: any) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      setMessage(payload)
      toast.error(error?.response?.data?.error || 'Failed to send message')
    }
  }

  const handleDelete = async (chatId: string | number) => {
    try {
      await deleteChatMutation.mutateAsync(chatId)
      if (activeChatId === chatId) {
        setActiveChatId(undefined)
      }
      setMessage('')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || 'Failed to delete conversation'
      )
    }
  }

  const markRated = (id: string, stars: number) => {
    setRatedMap(prev => ({ ...prev, [id]: stars }))
  }

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = panelHeight
    const onMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      const next = Math.min(850, Math.max(420, startHeight + delta))
      setPanelHeight(next)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-24 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center z-[9998]"
          aria-label="Open AI chat"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-24 w-[430px] bg-white rounded-lg shadow-2xl border border-gray-200 z-[9998] flex flex-col"
          style={{ height: `${panelHeight}px` }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-emerald-700 rounded transition"
              aria-label="Close AI chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <div
              className="h-2 cursor-ns-resize bg-gray-100 hover:bg-gray-200 transition-colors"
              onMouseDown={startResize}
              title="Drag to resize chat height"
            />
            <div className="border-b px-4 py-3 flex items-center gap-2 overflow-x-auto">
              {chatsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading
                  conversations...
                </div>
              ) : (
                <>
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        selectedChatId === chat.id
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChatId(chat.id)}
                        className="text-left"
                      >
                        {chat.title || `Chat #${chat.id}`}
                      </button>
                      <button
                        onClick={() => handleDelete(chat.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-600"
                        aria-label="Delete conversation"
                        disabled={deleteChatMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleCreateChat}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    New
                  </button>
                </>
              )}
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 bg-gray-50"
            >
              {messagesLoading && !sendMessageMutation.isPending ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading
                  messages...
                </div>
              ) : renderedMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>
                    {selectedChatId
                      ? 'Start chatting with AI Assistant'
                      : 'No conversations yet. Create new to get started.'}
                  </p>
                </div>
              ) : (
                renderedMessages.map(msg => {
                  const isAi = msg.role === 'assistant'
                  const mid = String(msg.id)
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isAi ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 text-sm ${
                          isAi
                            ? 'w-full max-w-none bg-white border border-gray-200 text-gray-900'
                            : 'max-w-[80%] bg-emerald-600 text-white'
                        } cursor-pointer`}
                        onClick={() =>
                          setPreviewText({
                            content: msg.content,
                            role: isAi ? 'assistant' : 'user',
                            createdAt: msg.created_at
                          })
                        }
                        title="Click to view full message"
                      >
                        <AiMessageMarkdown
                          text={msg.content}
                          variant={isAi ? 'assistant' : 'user'}
                        />
                        <p
                          className={`text-[11px] mt-1 ${
                            isAi ? 'text-gray-500' : 'text-emerald-100'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {isAi && selectedChatId && (
                          <MessageStars
                            messageId={mid}
                            chatId={selectedChatId}
                            disabled={sendMessageMutation.isPending}
                            initialRating={ratedMap[mid] ?? null}
                            onRated={markRated}
                          />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              {sendMessageMutation.isPending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t px-4 py-3 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  onKeyDown={e => {
                    // Avoid sending while user is still composing IME text (Vietnamese).
                    if ((e.nativeEvent as KeyboardEvent).isComposing) return
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={
                    !message.trim() ||
                    !selectedChatId
                  }
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[52px]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Enter để gửi · Shift+Enter xuống dòng
              </p>
            </div>
          </div>
        </div>
      )}

      {previewText && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <p className="font-semibold text-gray-900">
                  {previewText.role === 'assistant' ? 'AI Assistant' : 'You'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(previewText.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setPreviewText(null)}
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[65vh] overflow-auto">
              <AiMessageMarkdown
                text={previewText.content}
                variant={previewText.role === 'assistant' ? 'assistant' : 'user'}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AiChatWidget
