import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageCircleQuestion, Pencil } from 'lucide-react'
import { apiErrorMessage } from '../../../lib/apiError'
import { makeProductSlug } from '../../../client/utils/productSlug'
import { answerQuestion, getShopQuestions, type ShopQuestion } from '../../services/sellerService'

const MAX_ANSWER = 1000

// Hop thu hoi dap: shop tra loi cau hoi cua nguoi mua, cau tra loi hien cong khai tren trang san pham
export default function SellerQuestionsList() {
  const qc = useQueryClient()
  // Bo loc song o URL: link "Unanswered questions" tu To-do / thong bao mo san tab
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') === 'unanswered' ? 'unanswered' : undefined
  const page = Number(searchParams.get('page')) || 1
  const setParam = (key: string, v?: string) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (v) next.set(key, v)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true }
    )

  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seller', 'questions', filter, page],
    queryFn: () => getShopQuestions({ filter, page })
  })
  const questions = data?.questions ?? []
  const totalPages = data?.pagination.total_pages ?? 0

  const answerMut = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => answerQuestion(id, answer),
    onSuccess: () => {
      toast.success('Answer posted')
      setEditing(null)
      setDraft('')
      qc.invalidateQueries({ queryKey: ['seller', 'questions'] })
      qc.invalidateQueries({ queryKey: ['seller', 'dashboard', 'todo'] })
      qc.invalidateQueries({ queryKey: ['product-questions'] })
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to post answer'))
  })

  const startEdit = (q: ShopQuestion) => {
    setEditing(q.id)
    setDraft(q.answer || '')
  }

  const answerForm = (q: ShopQuestion) => (
    <div className="mt-3 space-y-2">
      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Write a public answer..."
        maxLength={MAX_ANSWER}
        aria-label="Answer"
        value={editing === q.id ? draft : ''}
        onFocus={() => editing !== q.id && startEdit(q)}
        onChange={e => setDraft(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={answerMut.isPending || editing !== q.id || draft.trim().length < 5}
          onClick={() => answerMut.mutate({ id: q.id, answer: draft })}
          className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {q.answer ? 'Save answer' : 'Answer'}
        </button>
        {q.answer && (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-4 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        {editing === q.id && (
          <span className="ml-auto text-xs text-gray-500">
            {draft.length}/{MAX_ANSWER}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <MessageCircleQuestion className="w-5 h-5" /> Product Questions
      </h1>

      <div className="flex gap-2 border-b">
        {[
          { key: '', label: 'All' },
          { key: 'unanswered', label: 'Unanswered' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setParam('filter', tab.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              (filter ?? '') === tab.key
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded border p-6 animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded border p-8 text-center text-gray-500">
          {filter ? 'All questions have been answered.' : 'No questions yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {questions.map(q => (
            <li key={q.id} className="bg-white rounded-lg border p-4" data-testid="seller-question">
              <div className="flex items-start gap-3">
                {q.product.img?.[0] && (
                  <img src={q.product.img[0]} alt="" className="w-12 h-12 object-cover rounded border shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${makeProductSlug(q.product.name, q.product.id)}#questions`}
                    className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                  >
                    {q.product.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {q.user.name} · {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-800 whitespace-pre-line break-words">{q.question}</p>

              {q.answer && editing !== q.id ? (
                <div className="mt-3 rounded-lg bg-gray-50 border-l-4 border-blue-500 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    Your answer
                    {q.answered_at && (
                      <span className="font-normal text-gray-500">
                        · {new Date(q.answered_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(q)}
                      className="ml-auto p-1 text-gray-500 hover:text-blue-600"
                      aria-label="Edit answer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{q.answer}</p>
                </div>
              ) : (
                answerForm(q)
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setParam('page', String(page - 1))}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setParam('page', String(page + 1))}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
