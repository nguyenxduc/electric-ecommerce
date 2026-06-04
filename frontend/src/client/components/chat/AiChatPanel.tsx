import { Bot, X } from 'lucide-react'
import AiChatMessageList from './AiChatMessageList'
import AiChatComposer from './AiChatComposer'
import type { MessagePreview, RenderableMessage } from './aiChatTypes'

type Props = {
  panelHeight: number
  onClose: () => void
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void
  selectedChatId?: string | number
  messages: RenderableMessage[]
  messagesLoading: boolean
  isSending: boolean
  ratedMap: Record<string, number>
  onRated: (id: string, stars: number) => void
  onPreview: (preview: MessagePreview) => void
  message: string
  onMessageChange: (v: string) => void
  onSend: () => void
  onQuickPrompt: (text: string) => void
}

export default function AiChatPanel({
  panelHeight,
  onClose,
  onResizeStart,
  selectedChatId,
  messages,
  messagesLoading,
  isSending,
  ratedMap,
  onRated,
  onPreview,
  message,
  onMessageChange,
  onSend,
  onQuickPrompt
}: Props) {
  const heightStyle = { height: `${panelHeight}px` }

  return (
    <div
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xl bottom-3 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[min(100vw-2rem,400px)]"
      style={heightStyle}
    >
      <div
        className="h-1 shrink-0 cursor-ns-resize bg-gray-100 hover:bg-blue-100"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />

      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="flex h-9 items-center gap-2 px-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold leading-none text-gray-900">
            AI Assistant
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <AiChatMessageList
          messages={messages}
          isLoading={messagesLoading}
          isSending={isSending}
          selectedChatId={selectedChatId}
          ratedMap={ratedMap}
          onRated={onRated}
          onPreview={onPreview}
          onQuickPrompt={onQuickPrompt}
        />
        <AiChatComposer
          value={message}
          onChange={onMessageChange}
          onSend={onSend}
          isSending={isSending}
          hasChat={!!selectedChatId}
        />
      </div>
    </div>
  )
}
