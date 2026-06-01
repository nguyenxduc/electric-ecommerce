import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrCreateChat,
  getChatById,
  sendMessage,
  getAllChats,
  updateChatStatus,
  markMessagesAsRead,
  type ChatResponse,
  type ChatsResponse
} from '../services/chatService'

export const useChat = (enabled: boolean = true) => {
  return useQuery<ChatResponse, Error>({
    queryKey: ['chat'],
    queryFn: getOrCreateChat,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5000, // Poll every 5 seconds
    enabled,
  })
}

export const useChatById = (chatId: number) => {
  return useQuery<ChatResponse, Error>({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId),
    enabled: !!chatId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 3000, // Poll every 3 seconds
  })
}

export const useAllChats = (page: number = 1, limit: number = 20, status?: string) => {
  return useQuery<ChatsResponse, Error>({
    queryKey: ['chats', 'admin', page, limit, status],
    queryFn: () => getAllChats(page, limit, status),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 5000, // Poll every 5 seconds
  })
}

export const useSendMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['chat', variables.chatId] })
      qc.invalidateQueries({ queryKey: ['chat'] })
      qc.invalidateQueries({ queryKey: ['chats', 'admin'] })
    }
  })
}

export const useUpdateChatStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ chatId, status }: { chatId: number; status: string }) =>
      updateChatStatus(chatId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats', 'admin'] })
    }
  })
}

export const useMarkMessagesAsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markMessagesAsRead,
    onSuccess: (_, chatId) => {
      qc.invalidateQueries({ queryKey: ['chat', chatId] })
      qc.invalidateQueries({ queryKey: ['chats', 'admin'] })
    }
  })
}

