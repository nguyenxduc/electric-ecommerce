import { useState } from 'react'
import { Star } from 'lucide-react'
import { useSubmitAiFeedback } from '../../hooks/useAiAssistant'
import { toast } from 'sonner'

type Props = {
  messageId: string
  chatId: string | number
  disabled?: boolean
  initialRating?: number | null
  onRated: (id: string, stars: number) => void
  inline?: boolean
}

export default function AiMessageFeedback({
  messageId,
  chatId,
  disabled,
  initialRating,
  onRated,
  inline = false
}: Props) {
  const submitFeedback = useSubmitAiFeedback()
  const [expanded, setExpanded] = useState(false)
  const [hover, setHover] = useState(0)
  const [localRating, setLocalRating] = useState<number | null>(
    initialRating ?? null
  )

  const display = hover || localRating || 0

  const handlePick = async (stars: number) => {
    if (disabled || submitFeedback.isPending) return
    try {
      await submitFeedback.mutateAsync({
        chatId,
        rating: stars,
        ai_message_id: messageId
      })
      setLocalRating(stars)
      onRated(messageId, stars)
      setExpanded(false)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Unable to submit feedback'
      toast.error(message)
    }
  }

  if (localRating != null) {
    return inline ? (
      <span className="text-blue-500">· {localRating}★</span>
    ) : (
      <p className="mt-1 text-[10px] text-blue-500">{localRating}★ thanks</p>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded(true)}
        className="text-gray-400 hover:text-blue-600 disabled:opacity-40"
      >
        {inline ? '· Rate' : 'Rate this reply'}
      </button>
    )
  }

  return (
    <div
      className={
        inline
          ? 'inline-flex items-center gap-0.5'
          : 'mt-1 flex items-center gap-1 border-t border-gray-50 pt-1'
      }
    >
      <div
        className="inline-flex items-center gap-px"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled || submitFeedback.isPending}
            onMouseEnter={() => setHover(n)}
            onClick={() => handlePick(n)}
            className="p-0 disabled:opacity-40"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              className={`h-3 w-3 ${
                n <= display
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {!inline && (
        <button
          type="button"
          className="text-[10px] text-gray-400"
          onClick={() => setExpanded(false)}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
