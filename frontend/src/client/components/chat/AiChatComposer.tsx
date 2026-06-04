import { useEffect, useRef } from 'react'
import { Loader2, Send } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isSending?: boolean
  hasChat?: boolean
}

export default function AiChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  isSending,
  hasChat
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = 88
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [value])

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2">
      <div className="flex items-end gap-1.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Message…"
          className="max-h-[88px] min-h-[36px] flex-1 resize-none rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-blue-500"
          rows={1}
          disabled={disabled || isSending || !hasChat}
          onKeyDown={e => {
            if ((e.nativeEvent as KeyboardEvent).isComposing) return
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || disabled || isSending || !hasChat}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
