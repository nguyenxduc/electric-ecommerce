import type { AiChat, AiMessage } from '../../services/aiAssistantService'

export type OptimisticUserMessage = {
  id: string
  role: 'user'
  chatId: string
  content: string
  created_at: string
  _optimistic: true
}

export type RenderableMessage = AiMessage | OptimisticUserMessage

export type MessagePreview = {
  content: string
  role: 'assistant' | 'user'
  createdAt: string
}

export type { AiChat, AiMessage }

export const QUICK_PROMPTS = [
  'Recommend laptops under $1000',
  'Compare AirPods vs Sony headphones',
  'Best phone for gaming?',
  'Show me popular accessories'
] as const
