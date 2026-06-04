import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { useValidateToken } from '../../hooks/useAuth'
import {
  useAiChats,
  useAiMessages,
  useCreateAiChat,
  useSendAiMessage
} from '../../hooks/useAiAssistant'
import AiChatFab from './AiChatFab'
import AiChatPanel from './AiChatPanel'
import AiChatPreviewModal from './AiChatPreviewModal'
import type { MessagePreview, OptimisticUserMessage } from './aiChatTypes'

const AiChatWidget = () => {
  const { data: userData } = useValidateToken()
  const hasToken = !!localStorage.getItem('accessToken')

  if (!hasToken || !userData?.user) return null

  return <AiChatWidgetInner />
}

function AiChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [panelHeight, setPanelHeight] = useState(600)
  const [previewText, setPreviewText] = useState<MessagePreview | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticUserMessage[]
  >([])
  const [autoCreated, setAutoCreated] = useState(false)
  const [ratedMap, setRatedMap] = useState<Record<string, number>>({})

  const { data: chatsData, isLoading: chatsLoading } = useAiChats(isOpen)
  const chats = chatsData?.data?.chats || []

  const selectedChatId = useMemo(() => {
    if (chats.length === 0) return undefined
    const latest = [...chats].sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime()
      const tb = new Date(b.updated_at || 0).getTime()
      return tb - ta
    })[0]
    return latest?.id
  }, [chats])

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

  useEffect(() => {
    if (!selectedChatId || optimisticMessages.length === 0 || messages.length === 0)
      return
    setOptimisticMessages(prev =>
      prev.filter(opt => {
        if (String(opt.chatId) !== String(selectedChatId)) return true
        const matched = messages.some(m => {
          if (m.role !== 'user') return false
          if (normalizeText(String(m.content || '')) !== normalizeText(opt.content))
            return false
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
        .then(() => setAutoCreated(true))
        .catch(err => {
          toast.error(
            err?.response?.data?.error || 'Failed to create conversation'
          )
        })
    }
  }, [isOpen, chatsLoading, chats.length, autoCreated, createChatMutation])

  const sendPayload = async (payload: string) => {
    if (!payload.trim() || !selectedChatId) return
    const trimmed = payload.trim()
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    flushSync(() => {
      setOptimisticMessages(prev => [
        ...prev,
        {
          id: tempId,
          role: 'user',
          chatId: String(selectedChatId),
          content: trimmed,
          created_at: new Date().toISOString(),
          _optimistic: true
        }
      ])
      setMessage('')
    })
    try {
      await sendMessageMutation.mutateAsync({
        chatId: selectedChatId,
        content: trimmed
      })
    } catch (error: unknown) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      setMessage(trimmed)
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err?.response?.data?.error || 'Failed to send message')
    }
  }

  const handleSend = () => sendPayload(message)

  const handleQuickPrompt = (text: string) => {
    setMessage(text)
    sendPayload(text)
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
      {!isOpen && <AiChatFab onClick={() => setIsOpen(true)} />}

      {isOpen && (
        <AiChatPanel
          panelHeight={panelHeight}
          onClose={() => setIsOpen(false)}
          onResizeStart={startResize}
          selectedChatId={selectedChatId}
          messages={renderedMessages}
          messagesLoading={messagesLoading || chatsLoading}
          isSending={sendMessageMutation.isPending}
          ratedMap={ratedMap}
          onRated={(id, stars) =>
            setRatedMap(prev => ({ ...prev, [id]: stars }))
          }
          onPreview={setPreviewText}
          message={message}
          onMessageChange={setMessage}
          onSend={handleSend}
          onQuickPrompt={handleQuickPrompt}
        />
      )}

      {previewText && (
        <AiChatPreviewModal
          preview={previewText}
          onClose={() => setPreviewText(null)}
        />
      )}
    </>
  )
}

export default AiChatWidget
