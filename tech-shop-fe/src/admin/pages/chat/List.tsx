import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAllChats, useChatById, useSendMessage, useUpdateChatStatus, useMarkMessagesAsRead } from '../../../client/hooks/useChat'
import { useValidateToken } from '../../../client/hooks/useAuth'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

export default function AdminChatList() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: userData } = useValidateToken()
  const { data: chatsData, refetch: refetchChats, isLoading: chatsLoading } = useAllChats(1, 50, statusFilter || undefined)
  const { data: chatData, refetch: refetchChat, isLoading: chatLoading } = useChatById(selectedChatId || 0)
  const sendMessageMutation = useSendMessage()
  const updateStatusMutation = useUpdateChatStatus()
  const markAsReadMutation = useMarkMessagesAsRead()

  const chats = chatsData?.data?.chats || []
  const selectedChat = chatData?.data
  const messages = selectedChat?.messages || []

  // Setup Socket.io connection
  useEffect(() => {
    if (!userData?.user || userData.user.role !== 'admin') return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
    const socketUrl = apiUrl.replace('/api', '')
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Admin socket connected')
    })

    newSocket.on('new_chat_message', (data) => {
      refetchChats()
      if (data.chatId === selectedChatId?.toString()) {
        refetchChat()
      }
    })

    newSocket.on('chat_notification', (data) => {
      // Show notification toast when new message from customer
      if (data.chatId !== selectedChatId?.toString()) {
        toast.info(`New message from ${data.message.sender.name}`, {
          description: data.message.content.substring(0, 50) + (data.message.content.length > 50 ? '...' : ''),
        })
      }
      refetchChats()
    })

    newSocket.on('disconnect', () => {
      console.log('Admin socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [userData, selectedChatId, refetchChats, refetchChat])

  // Join chat room when chat is selected
  useEffect(() => {
    if (socket && selectedChatId) {
      socket.emit('join_chat', selectedChatId)
    }
  }, [socket, selectedChatId])

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark messages as read when chat is selected
  useEffect(() => {
    if (selectedChatId && userData?.user?.role === 'admin') {
      // Mark customer messages as read when admin opens chat
      markAsReadMutation.mutate(selectedChatId)
    }
  }, [selectedChatId, userData?.user?.role])

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChatId) return

    try {
      if (socket) {
        socket.emit('send_message', {
          chatId: selectedChatId,
          content: message.trim(),
        })
      } else {
        await sendMessageMutation.mutateAsync({
          chatId: selectedChatId,
          content: message.trim(),
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

  const handleStatusChange = async (chatId: number, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ chatId, status })
      toast.success('Chat status updated')
      refetchChats()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update status')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-600" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return null
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Chat List */}
      <div className="w-80 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Chats</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1 text-sm rounded ${
                statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1 text-sm rounded ${
                statusFilter === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 text-sm rounded ${
                statusFilter === 'resolved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No chats found</p>
            </div>
          ) : (
            chats.map((chat) => {
              const lastMessage = chat.messages?.[0]
              const isSelected = selectedChatId === parseInt(chat.id)
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(parseInt(chat.id))}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {chat.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{chat.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{chat.user?.email}</p>
                      </div>
                    </div>
                    {getStatusIcon(chat.status)}
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-gray-600 truncate">{lastMessage.content}</p>
                  )}
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {chat.unreadCount} unread
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        {chatLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedChat.user?.name || 'Customer'}</h3>
                <p className="text-sm text-gray-500">{selectedChat.user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedChat.status}
                  onChange={(e) => handleStatusChange(parseInt(selectedChat.id), e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.sender.role === 'admin'
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender.name}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
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
                  onChange={(e) => setMessage(e.target.value)}
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a chat to start conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

