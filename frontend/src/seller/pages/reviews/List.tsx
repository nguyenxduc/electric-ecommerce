import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquareText, Star, Pencil, Trash2 } from 'lucide-react'
import { apiErrorMessage } from '../../../lib/apiError'
import { makeProductSlug } from '../../../client/utils/productSlug'
import {
  getShopReviews,
  replyToReview,
  deleteReviewReply,
  type ShopReview
} from '../../services/sellerService'

const MAX_REPLY = 1000

const Stars = ({ value }: { value: number }) => (
  <span className="flex" aria-label={`${value} stars`}>
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        className={`w-4 h-4 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
      />
    ))}
  </span>
)

export default function SellerReviewsList() {
  const qc = useQueryClient()
  // Bo loc song o URL: link "Unreplied reviews" tu To-do mo san tab
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') === 'unreplied' ? 'unreplied' : undefined
  const rating = Number(searchParams.get('rating')) || undefined
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

  // Dang soan tra loi cho review nao (id) + noi dung nhap
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seller', 'reviews', filter, rating, page],
    queryFn: () => getShopReviews({ filter, rating, page })
  })
  const reviews = data?.reviews ?? []
  const totalPages = data?.pagination.total_pages ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['seller', 'reviews'] })
    qc.invalidateQueries({ queryKey: ['seller', 'dashboard', 'todo'] })
    qc.invalidateQueries({ queryKey: ['reviews'] })
  }
  const replyMut = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToReview(id, reply),
    onSuccess: () => {
      toast.success('Reply posted')
      setEditing(null)
      setDraft('')
      invalidate()
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to post reply'))
  })
  const deleteMut = useMutation({
    mutationFn: deleteReviewReply,
    onSuccess: () => {
      toast.success('Reply removed')
      invalidate()
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to remove reply'))
  })

  const startEdit = (r: ShopReview) => {
    setEditing(r.id)
    setDraft(r.seller_reply || '')
  }

  const replyForm = (r: ShopReview) => (
    <div className="mt-3 space-y-2">
      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Write a public reply to this buyer..."
        maxLength={MAX_REPLY}
        aria-label="Reply"
        value={editing === r.id ? draft : ''}
        onFocus={() => editing !== r.id && startEdit(r)}
        onChange={e => setDraft(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={replyMut.isPending || editing !== r.id || !draft.trim()}
          onClick={() => replyMut.mutate({ id: r.id, reply: draft })}
          className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {r.seller_reply ? 'Save reply' : 'Reply'}
        </button>
        {r.seller_reply && (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-4 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        {editing === r.id && (
          <span className="ml-auto text-xs text-gray-500">
            {draft.length}/{MAX_REPLY}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <MessageSquareText className="w-5 h-5" /> Product Reviews
      </h1>

      <div className="flex flex-wrap items-center gap-3 justify-between border-b">
        <div className="flex gap-2">
          {[
            { key: '', label: 'All' },
            { key: 'unreplied', label: 'Unreplied' }
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
        <select
          aria-label="Filter by rating"
          value={rating ?? ''}
          onChange={e => setParam('rating', e.target.value)}
          className="mb-2 border rounded-lg px-2 py-1.5 text-sm bg-white"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map(s => (
            <option key={s} value={s}>
              {s} star{s > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white rounded border p-6 animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded border p-8 text-center text-gray-500">
          {filter ? 'All reviews have been replied to.' : 'No reviews yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="bg-white rounded-lg border p-4" data-testid="seller-review">
              <div className="flex items-start gap-3">
                {r.product.img?.[0] && (
                  <img src={r.product.img[0]} alt="" className="w-12 h-12 object-cover rounded border shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${makeProductSlug(r.product.name, r.product.id)}#reviews`}
                    className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                  >
                    {r.product.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                    <Stars value={r.rating || 0} />
                    <span>{r.user.name}</span>
                    <span>· {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{r.comment}</p>}
              {r.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.images.map(url => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Review photo" className="w-16 h-16 object-cover rounded border" />
                    </a>
                  ))}
                </div>
              )}

              {r.seller_reply && editing !== r.id ? (
                <div className="mt-3 rounded-lg bg-gray-50 border-l-4 border-blue-500 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    Your reply
                    {r.seller_reply_at && (
                      <span className="font-normal text-gray-500">
                        · {new Date(r.seller_reply_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="ml-auto p-1 text-gray-500 hover:text-blue-600"
                      aria-label="Edit reply"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate(r.id)}
                      className="p-1 text-gray-500 hover:text-red-600"
                      aria-label="Delete reply"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{r.seller_reply}</p>
                </div>
              ) : (
                replyForm(r)
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
