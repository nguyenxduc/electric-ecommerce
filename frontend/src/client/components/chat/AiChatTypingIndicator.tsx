import { Bot } from 'lucide-react'

export default function AiChatTypingIndicator() {
  return (
    <div className="flex justify-start gap-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Bot className="h-3 w-3" />
      </div>
      <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm ring-1 ring-gray-200/60">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: '120ms' }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: '240ms' }}
          />
        </div>
      </div>
    </div>
  )
}
