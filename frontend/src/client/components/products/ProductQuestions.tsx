import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircleQuestion, Store, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useValidateToken } from '../../hooks/useAuth'
import { useAskQuestion, useDeleteQuestion, useProductQuestions } from '../../hooks/useProductQuestions'
import { MAX_QUESTION } from '../../services/productQuestionService'
import { openLoginModal } from '../../utils/loginModal'
import { apiErrorMessage } from '../../../lib/apiError'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN')

// Hoi dap san pham: ai cung xem duoc; nguoi mua dang nhap thi hoi, chu shop tra loi o Seller Center
export default function ProductQuestions({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data: userData } = useValidateToken()
  const me = userData?.user
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState('')
  const { data, isLoading } = useProductQuestions(productId, page)
  const ask = useAskQuestion(productId)
  const remove = useDeleteQuestion(productId)
  const questions = data?.questions ?? []
  const totalPages = data?.pagination.total_pages ?? 0
  const valid = draft.trim().length >= 5

  const submit = () =>
    ask.mutate(draft.trim(), {
      onSuccess: () => {
        toast.success('Question sent. The shop will be notified.')
        setDraft('')
        setPage(1)
      },
      onError: e => toast.error(apiErrorMessage(e, 'Could not send your question'))
    })

  return (
    <section id="questions" className="space-y-4">
      {isOwner ? (
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          Buyers' questions about this product appear here.{' '}
          <Link to="/seller/questions?filter=unanswered" className="text-blue-600 font-medium hover:underline">
            Answer them in Seller Center
          </Link>
        </p>
      ) : me ? (
        <div className="space-y-2">
          <textarea
            aria-label="Your question"
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask the shop about this product (size, warranty, what's in the box...)"
            maxLength={MAX_QUESTION}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!valid || ask.isPending}
              onClick={submit}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Ask question
            </button>
            <span className="text-xs text-gray-500">
              {draft.length}/{MAX_QUESTION}
            </span>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openLoginModal} className="text-sm text-blue-600 font-medium hover:underline">
          Log in to ask a question
        </button>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4" /> No questions yet. Be the first to ask.
        </p>
      ) : (
        <ul className="divide-y">
          {questions.map(q => (
            <li key={q.id} className="py-4 space-y-2" data-testid="question-item">
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-semibold text-blue-600">Q:</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 break-words">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {q.user.name} · {fmt(q.created_at)}
                  </p>
                </div>
                {me && me.id === q.user.id && (
                  <button
                    type="button"
                    aria-label="Delete question"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(q.id, {
                        onSuccess: () => toast.success('Question deleted'),
                        onError: e => toast.error(apiErrorMessage(e, 'Could not delete'))
                      })
                    }
                    className="shrink-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {q.answer ? (
                <div className="ml-6 flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Store className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 break-words whitespace-pre-line">{q.answer}</p>
                    {q.answered_at && <p className="text-xs text-gray-500 mt-0.5">Shop · {fmt(q.answered_at)}</p>}
                  </div>
                </div>
              ) : (
                <p className="ml-6 text-xs text-gray-400 italic">Waiting for the shop to answer</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
