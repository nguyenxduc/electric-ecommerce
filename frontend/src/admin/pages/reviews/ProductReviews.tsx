import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminProductReviews, useDeleteAdminReview, useUpdateAdminReview } from '../../hooks'
import Modal from '../../components/common/Modal'

export default function AdminProductReviews() {
  const { id } = useParams()
  const pid = Number(id)
  const { data, isLoading } = useAdminProductReviews(pid, {
    page: 1,
    limit: 10
  })
  const del = useDeleteAdminReview(pid)
  const [editId, setEditId] = useState<number | null>(null)
  const [editRating, setEditRating] = useState<number>(5)
  const [editComment, setEditComment] = useState<string>('')
  const update = useUpdateAdminReview(pid, editId || 0)

  if (isLoading) return <div>Loading...</div>

  const reviews = data?.data.reviews || []
  const summary = data?.data.summary

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Product Reviews</h1>
      {summary && (
        <div className="bg-white rounded border p-4 text-sm text-gray-700">
          Avg rating: {summary.average_rating} • Total: {summary.total_reviews}
        </div>
      )}
      <div className="bg-white rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">User</th>
              <th className="text-left p-2">Rating</th>
              <th className="text-left p-2">Comment</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.user?.name ?? r.user_id}</td>
                <td className="p-2">{r.rating}</td>
                <td className="p-2">{r.comment}</td>
                <td className="p-2">
                  <button
                    className="text-blue-600 mr-3"
                    onClick={() => {
                      setEditId(r.id)
                      setEditRating(r.rating)
                      setEditComment(r.comment || '')
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600"
                    onClick={() => del.mutateAsync(r.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editId !== null}
        onClose={() => setEditId(null)}
        title="Edit Review"
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setEditId(null)}
              disabled={update.isPending}
            >
              Cancel
            </button>
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
              onClick={() => {
                if (!editId) return
                if (editRating < 1 || editRating > 5) {
                  toast.error('Rating must be between 1 and 5')
                  return
                }
                update.mutate(
                  { rating: editRating, comment: editComment },
                  {
                    onSuccess: () => {
                      toast.success('Review updated')
                      setEditId(null)
                    },
                    onError: () => toast.error('Failed to update review')
                  }
                )
              }}
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Rating (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={editRating}
              onChange={e => setEditRating(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Comment</label>
            <textarea
              value={editComment}
              onChange={e => setEditComment(e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder="Update comment"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
