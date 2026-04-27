import React, { useState } from 'react'
import { Star, MessageSquare, Send, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useProductReviews, useCreateReview, useUpdateReview, useDeleteReview } from '../../hooks/useReviews'
import { useValidateToken } from '../../hooks/useAuth'
import ConfirmModal from '../common/ConfirmModal'
import type { Review } from '../../services/reviewService'

interface ReviewProps {
  productId: number
}

const ReviewComponent = ({ productId }: ReviewProps) => {
  const [page, setPage] = useState(1)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const { data: userData } = useValidateToken()
  const { data: reviewsData, isLoading } = useProductReviews(productId, page, 10)
  const createReviewMutation = useCreateReview()
  const updateReviewMutation = useUpdateReview()
  const deleteReviewMutation = useDeleteReview()

  const reviews = reviewsData?.reviews || []
  const pagination = reviewsData?.pagination
  const summary = reviewsData?.summary

  const handleSubmitReview = async () => {
    if (!userData?.user) {
      toast.error('Please login to submit a review')
      return
    }

    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    if (editingReview) {
      // Update existing review
      updateReviewMutation.mutate(
        {
          reviewId: parseInt(editingReview.id),
          payload: { rating, comment: comment.trim() || undefined }
        },
        {
          onSuccess: () => {
            toast.success('Review updated successfully')
            setEditingReview(null)
            setRating(0)
            setComment('')
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update review')
          }
        }
      )
    } else {
      // Create new review
      createReviewMutation.mutate(
        {
          productId,
          rating,
          comment: comment.trim() || undefined
        },
        {
          onSuccess: () => {
            toast.success('Review submitted successfully')
            setRating(0)
            setComment('')
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit review')
          }
        }
      )
    }
  }

  const handleEditReview = (review: Review) => {
    setEditingReview(review)
    setRating(review.rating || 0)
    setComment(review.comment || '')
  }

  const handleDeleteReview = () => {
    if (!deleteConfirm) return
    deleteReviewMutation.mutate(parseInt(deleteConfirm.id), {
      onSuccess: () => {
        toast.success('Review deleted successfully')
        setDeleteConfirm(null)
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to delete review')
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const renderStars = (value: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate && onRate(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${
              interactive ? 'cursor-pointer' : 'cursor-default'
            } transition-colors`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (hoverRating || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-300 text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Review?"
        description={deleteConfirm ? `Are you sure you want to delete this review?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteReview}
        onClose={() => setDeleteConfirm(null)}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />

      {/* Review Summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {summary.average_rating.toFixed(1)}
              </div>
              <div className="mt-1">{renderStars(Math.round(summary.average_rating))}</div>
              <div className="text-sm text-gray-500 mt-2">
                {summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Form */}
      {userData?.user && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              {renderStars(rating, true, setRating)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your thoughts about this product..."
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={createReviewMutation.isPending || updateReviewMutation.isPending || rating === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {editingReview ? 'Update Review' : 'Submit Review'}
              </button>
              {editingReview && (
                <button
                  onClick={() => {
                    setEditingReview(null)
                    setRating(0)
                    setComment('')
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          All Reviews ({pagination?.total || 0})
        </h3>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <>
            {reviews.map(review => {
              const isOwnReview = userData?.user?.id === review.user_id.toString()
              return (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {review.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.user.name}</p>
                        <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating || 0)}
                      {isOwnReview && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditReview(review)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit review"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({ id: review.id, name: review.user.name })
                            }
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 whitespace-pre-line">{review.comment}</p>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-700">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ReviewComponent
