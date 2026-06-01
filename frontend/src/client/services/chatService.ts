import axiosClient from '../../lib/axios'

export type Message = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  updated_at: string
  sender: {
    id: string
    name: string
    role: string
    avatar: string | null
  }
}

export type Chat = {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  messages: Message[]
  user?: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  _count?: {
    messages: number
  }
  unreadCount?: number
}

export type ChatResponse = {
  success: boolean
  data: Chat
}

export type ChatsResponse = {
  success: boolean
  data: {
    chats: Chat[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export const getOrCreateChat = async (): Promise<ChatResponse> => {
  const { data } = await axiosClient.get<ChatResponse>('/chat')
  return data
}

export const getChatById = async (chatId: number): Promise<ChatResponse> => {
  const { data } = await axiosClient.get<ChatResponse>(`/chat/${chatId}`)
  return data
}

export const sendMessage = async (payload: {
  chatId: number
  content: string
}): Promise<{ success: boolean; message: string; data: Message }> => {
  const { data } = await axiosClient.post<{
    success: boolean
    message: string
    data: Message
  }>('/chat/message', payload)
  return data
}

export const getAllChats = async (
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<ChatsResponse> => {
  const params: any = { page, limit }
  if (status) params.status = status
  const { data } = await axiosClient.get<ChatsResponse>('/chat/admin/all', { params })
  return data
}

export const updateChatStatus = async (
  chatId: number,
  status: string
): Promise<{ success: boolean; message: string; data: Chat }> => {
  const { data } = await axiosClient.put<{
    success: boolean
    message: string
    data: Chat
  }>(`/chat/admin/${chatId}/status`, { status })
  return data
}

export const markMessagesAsRead = async (
  chatId: number
): Promise<{ success: boolean; message: string }> => {
  const { data } = await axiosClient.post<{
    success: boolean
    message: string
  }>(`/chat/${chatId}/read`)
  return data
}

