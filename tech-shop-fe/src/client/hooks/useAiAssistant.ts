import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAiChats,
  createAiChat,
  fetchAiMessages,
  sendAiMessage,
  deleteAiChat,
  submitAiFeedback,
  type AiChatsResponse,
  type AiMessagesResponse
} from '../services/aiAssistantService'

export const useAiChats = (enabled: boolean = true) =>
  useQuery<AiChatsResponse>({
    queryKey: ['ai-chats'],
    queryFn: fetchAiChats,
    enabled,
    staleTime: 30 * 1000
  })

export const useAiMessages = (
  chatId?: string | number,
  options?: { pausePoll?: boolean }
) =>
  useQuery<AiMessagesResponse>({
    queryKey: ['ai-chat-messages', chatId],
    queryFn: () => fetchAiMessages(chatId as string | number),
    enabled: !!chatId,
    refetchInterval: options?.pausePoll ? false : 12000,
    staleTime: 10 * 1000
  })

export const useCreateAiChat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) => createAiChat(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
    }
  })
}

export const useSendAiMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      chatId,
      content
    }: {
      chatId: string | number
      content: string
    }) => sendAiMessage(chatId, content),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['ai-chat-messages', variables.chatId] })
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
    }
  })
}

export const useDeleteAiChat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (chatId: string | number) => deleteAiChat(chatId),
    onSuccess: (_, chatId) => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      qc.invalidateQueries({ queryKey: ['ai-chat-messages', chatId] })
    }
  })
}

export const useSubmitAiFeedback = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      chatId: string | number
      rating: number
      comment?: string
      ai_message_id?: string | number
    }) => submitAiFeedback(vars.chatId, vars),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['ai-chat-messages', v.chatId] })
    }
  })
}
