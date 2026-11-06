import { useState, useEffect } from 'react'
import {
  useChat,
  useSendMessage,
  useMarkMessagesAsRead
} from '../../hooks/useChat'
import { useValidateToken } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'
import SupportChatFab from './SupportChatFab'
import SupportChatPanel from './SupportChatPanel'
import SupportChatPreviewModal from './SupportChatPreviewModal'
import type { SupportMessagePreview } from './SupportChatMessageList'

const ChatWidget = () => {
  const { data: userData } = useValidateToken()
  const hasToken = !!localStorage.getItem('accessToken')
  const isAdmin = userData?.user?.role === 'admin'

  if (!hasToken || isAdmin || !userData?.user) {
    return null
  }

  return <ChatWidgetInner />
}

// shopId: chat with that shop (seller answers); without it: platform support
function ChatWidgetInner({
  shopId,
  externalOpen,
  onExternalClose
}: {
  shopId?: number
  externalOpen?: boolean
  onExternalClose?: () => void
} = {}) {
  const [isOpenState, setIsOpen] = useState(false)
  const isOpen = externalOpen ?? isOpenState
  const close = onExternalClose ?? (() => setIsOpen(false))
  const [message, setMessage] = useState('')
  const [panelHeight, setPanelHeight] = useState(600)
  const [preview, setPreview] = useState<SupportMessagePreview | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  const { data: chatData, isLoading, refetch } = useChat(isOpen, shopId)
  const sendMessageMutation = useSendMessage()
  const markAsReadMutation = useMarkMessagesAsRead()

  const chat = chatData?.data
  const messages = chat?.messages || []

  // Unread = messages from the other party (admin or seller)
  const unreadCount = messages.filter(
    m => !m.is_read && m.sender?.role !== 'user'
  ).length

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const apiUrl =
      (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
    const socketUrl = apiUrl.replace('/api', '')
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      if (chat?.id) {
        newSocket.emit('join_chat', chat.id)
      }
    })

    newSocket.on('new_message', () => {
      refetch()
    })

    newSocket.on('new_chat_message', data => {
      if (data.chatId === chat?.id) {
        refetch()
      }
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [chat?.id, refetch])

  useEffect(() => {
    if (socket && chat?.id) {
      socket.emit('join_chat', chat.id)
    }
  }, [socket, chat?.id])

  useEffect(() => {
    if (isOpen && chat?.id) {
      markAsReadMutation.mutate(parseInt(chat.id, 10))
    }
  }, [isOpen, chat?.id, markAsReadMutation])

  const handleSend = async () => {
    if (!message.trim() || !chat) return

    const trimmed = message.trim()
    try {
      if (socket) {
        socket.emit('send_message', {
          chatId: chat.id,
          content: trimmed
        })
      } else {
        await sendMessageMutation.mutateAsync({
          chatId: parseInt(chat.id, 10),
          content: trimmed
        })
      }
      setMessage('')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err?.response?.data?.error || 'Failed to send message')
    }
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
      {!isOpen && externalOpen === undefined && (
        <SupportChatFab
          onClick={() => setIsOpen(true)}
          unreadCount={unreadCount}
        />
      )}

      {isOpen && (
        <SupportChatPanel
          panelHeight={panelHeight}
          onClose={close}
          onResizeStart={startResize}
          messages={messages}
          messagesLoading={isLoading}
          isSending={sendMessageMutation.isPending}
          hasChat={!!chat}
          onPreview={setPreview}
          message={message}
          onMessageChange={setMessage}
          onSend={handleSend}
        />
      )}

      {preview && (
        <SupportChatPreviewModal
          senderName={preview.senderName}
          createdAt={preview.createdAt}
          content={preview.content}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}

// Chat panel bound to one shop, opened from the shop's public page.
// Renders nothing until `open` is true (no floating FAB of its own).
export const ShopChatPanel = ({
  shopId,
  open,
  onClose
}: {
  shopId: number
  open: boolean
  onClose: () => void
}) => {
  const { data: userData } = useValidateToken()
  const hasToken = !!localStorage.getItem('accessToken')
  if (!hasToken || !userData?.user || !open) return null
  return (
    <ChatWidgetInner
      shopId={shopId}
      externalOpen={open}
      onExternalClose={onClose}
    />
  )
}

export default ChatWidget
