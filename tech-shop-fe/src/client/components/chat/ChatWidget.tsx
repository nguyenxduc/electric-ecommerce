import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react'
import {
  useChat,
  useSendMessage,
  useMarkMessagesAsRead
} from '../../hooks/useChat'
import { useValidateToken } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

const ChatWidget = () => {
  const { data: userData } = useValidateToken()
  const hasToken = !!localStorage.getItem('accessToken')
  const isAdmin = userData?.user?.role === 'admin'

  // Guard: only render inner widget when logged in and not admin
  if (!hasToken || isAdmin || !userData?.user) {
    return null
  }

  return <ChatWidgetInner userId={userData.user.id} />
}

function ChatWidgetInner({ userId }: { userId: string | number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const { data: chatData, refetch } = useChat(true)
  const sendMessageMutation = useSendMessage()
  const markAsReadMutation = useMarkMessagesAsRead()

  const chat = chatData?.data
  const messages = chat?.messages || []

  // Setup Socket.io connection
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

  // Join chat room when chat is loaded
  useEffect(() => {
    if (socket && chat?.id) {
      socket.emit('join_chat', chat.id)
    }
  }, [socket, chat?.id])

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && chat?.id) {
      // Mark admin messages as read when customer opens chat
      markAsReadMutation.mutate(parseInt(chat.id))
    }
  }, [isOpen, chat?.id, markAsReadMutation])

  const handleSendMessage = async () => {
    if (!message.trim() || !chat) return

    try {
      if (socket) {
        socket.emit('send_message', {
          chatId: chat.id,
          content: message.trim()
        })
      } else {
        await sendMessageMutation.mutateAsync({
          chatId: parseInt(chat.id),
          content: message.trim()
        })
      }
      setMessage('')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send message')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center z-[9999]"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {chat &&
            chat.messages.filter(m => !m.is_read && m.sender.role === 'admin')
              .length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {
                  chat.messages.filter(
                    m => !m.is_read && m.sender.role === 'admin'
                  ).length
                }
              </span>
            )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatContainerRef}
          className={`fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] flex flex-col ${
            isMinimized ? 'h-16' : 'h-[600px]'
          } transition-all`}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Customer Support</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-blue-700 rounded transition"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-700 rounded transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAdminMsg = msg.sender?.role === 'admin'
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isAdminMsg ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            isAdminMsg
                              ? 'bg-white text-gray-900 border border-gray-200'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isAdminMsg && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {msg.sender.name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isAdminMsg ? 'text-gray-500' : 'text-blue-100'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default ChatWidget
