import axiosClient from '../../lib/axios'

export type AiMessage = {
  id: string
  ai_chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type AiChat = {
  id: string
  title: string | null
  thread_key: string
  updated_at: string
  created_at: string
  messages?: AiMessage[]
}

export type AiChatsResponse = {
  success: boolean
  data: {
    chats: AiChat[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export type AiMessagesResponse = {
  success: boolean
  data: {
    messages: AiMessage[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export const fetchAiChats = async (): Promise<AiChatsResponse> => {
  const { data } = await axiosClient.get<AiChatsResponse>('/ai-assistant')
  return data
}

export const createAiChat = async (title?: string): Promise<{ success: boolean; data: AiChat }> => {
  const { data } = await axiosClient.post<{ success: boolean; data: AiChat }>('/ai-assistant', {
    title: title?.trim() || undefined
  })
  return data
}

export const fetchAiMessages = async (chatId: string | number): Promise<AiMessagesResponse> => {
  const { data } = await axiosClient.get<AiMessagesResponse>(`/ai-assistant/${chatId}/messages`)
  return data
}

export const sendAiMessage = async (chatId: string | number, content: string) => {
  const { data } = await axiosClient.post<{
    success: boolean
    data: { userMessage: AiMessage; aiMessage: AiMessage; reply: string }
  }>(`/ai-assistant/${chatId}/messages`, { content })
  return data
}

export const deleteAiChat = async (chatId: string | number) => {
  const { data } = await axiosClient.delete<{ success: boolean; message: string }>(
    `/ai-assistant/${chatId}`
  )
  return data
}

export const submitAiFeedback = async (
  chatId: string | number,
  payload: {
    rating: number
    comment?: string
    ai_message_id?: string | number
  }
) => {
  const { data } = await axiosClient.post<{
    success: boolean
    message?: string
    data: unknown
  }>(`/ai-assistant/${chatId}/feedback`, payload)
  return data
}

