import { Bot } from 'lucide-react'

type Props = {
  onClick: () => void
}

export default function AiChatFab({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-600/20 transition hover:bg-blue-700"
      aria-label="Open AI assistant"
    >
      <Bot className="h-6 w-6" />
    </button>
  )
}
