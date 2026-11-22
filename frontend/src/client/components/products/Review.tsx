import React, { useEffect, useRef, useState } from 'react'
import { Star, MessageSquare, Send, Edit2, Trash2, ImagePlus, X, Store } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage, apiErrorResponse } from '../../../lib/apiError'
import {
  useProductReviews,
  useProductReviewStats,
  useCreateReview,
  useUpdateReview,
  useDeleteReview
} from '../../hooks/useReviews'
import { useValidateToken } from '../../hooks/useAuth'
import ConfirmModal from '../common/ConfirmModal'
import type { Review, ReviewFilter } from '../../services/reviewService'

interface ReviewProps {
  productId: number
  shopName?: string
}

const MAX_IMAGES = 5
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type NewImage = { file: File; url: string }

const extractReviewErrorMessage = (error: unknown, fallback: string) => {
  const data = apiErrorResponse(error).data as
    | { moderation?: { reason?: unknown }; message?: unknown }
    | undefined
  const moderationReason = data?.moderation?.reason
  const message = data?.message
  if (typeof moderationReason === 'string' && moderationReason.trim()) return moderationReason
  if (typeof message === 'string' && message.trim()) return message
  return fallback
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// Xem anh lon: bam nen hoac Esc de dong
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      role="dialog"
      aria-label="Review photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close photo"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="w-6 h-6" />
      </button>
      <img src={src} alt="Review photo" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
    </div>
  )
}

const ReviewComponent = ({ productId, shopName }: ReviewProps) => {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<ReviewFilter>({})
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [keptImages, setKeptImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: userData } = useValidateToken()
  const { data: reviewsData, isLoading } = useProductReviews(productId, page, 10, filter)
  const { data: stats } = useProductReviewStats(productId)
  const createReviewMutation = useCreateReview()
  const updateReviewMutation = useUpdateReview()
  const deleteReviewMutation = useDeleteReview()

  const reviews = reviewsData?.reviews || []
  const pagination = reviewsData?.pagination
  const summary = reviewsData?.summary
  const totalPages = pagination?.total_pages ?? 0

  const starCount = (star: number) =>
    stats?.ratingDistribution.find(d => d.rating === star)?.count ?? 0
  const filterChips: { label: string; value: ReviewFilter; count?: number }[] = [
    { label: 'All', value: {}, count: stats?.totalReviews },
    ...[5, 4, 3, 2, 1].map(star => ({
      label: `${star} Star`,
      value: { rating: star },
      count: starCount(star)
    })),
    { label: 'With photos', value: { has_images: true }, count: stats?.withImages }
  ]
  const isActiveFilter = (v: ReviewFilter) =>
    v.rating === filter.rating && !!v.has_images === !!filter.has_images

  const resetForm = () => {
    newImages.forEach(i => URL.revokeObjectURL(i.url))
    setEditingReview(null)
    setRating(0)
    setComment('')
    setCommentError('')
    setKeptImages([])
    setNewImages([])
  }

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    const room = MAX_IMAGES - keptImages.length - newImages.length
    const valid = files.filter(f => {
      if (!IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name}: only JPG, PNG or WebP`)
        return false
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: must be 2MB or smaller`)
        return false
      }
      return true
    })
    if (valid.length > room) toast.error(`You can attach up to ${MAX_IMAGES} photos`)
    setNewImages(prev => [
      ...prev,
      ...valid.slice(0, Math.max(0, room)).map(file => ({ file, url: URL.createObjectURL(file) }))
    ])
  }

  const removeNewImage = (url: string) => {
    URL.revokeObjectURL(url)
    setNewImages(prev => prev.filter(i => i.url !== url))
  }

  const handleSubmitReview = async () => {
    setCommentError('')

    if (!userData?.user) {
      toast.error('Please login to submit a review')
      return
    }

    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    const images = newImages.map(i => i.file)
    const onError = (fallback: string) => (error: unknown) =>
      setCommentError(extractReviewErrorMessage(error, fallback))

    if (editingReview) {
      updateReviewMutation.mutate(
        {
          reviewId: parseInt(editingReview.id),
          payload: { rating, comment: comment.trim() || undefined, keep_images: keptImages, images }
        },
        {
          onSuccess: () => {
            toast.success('Review updated successfully')
            resetForm()
          },
          onError: onError('Failed to update review')
        }
      )
    } else {
      createReviewMutation.mutate(
        { productId, rating, comment: comment.trim() || undefined, images },
        {
          onSuccess: () => {
            toast.success('Review submitted successfully')
            resetForm()
          },
          onError: onError('Failed to submit review')
        }
      )
    }
  }

  const handleEditReview = (review: Review) => {
    resetForm()
    setEditingReview(review)
    setRating(review.rating || 0)
    setComment(review.comment || '')
    setKeptImages(review.images || [])
  }

  const handleDeleteReview = () => {
    if (!deleteConfirm) return
    deleteReviewMutation.mutate(parseInt(deleteConfirm.id), {
      onSuccess: () => {
        toast.success('Review deleted successfully')
        setDeleteConfirm(null)
      },
      onError: (error: unknown) => {
        toast.error(apiErrorMessage(error, 'Failed to delete review'))
      }
    })
  }

  const renderStars = (value: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            aria-label={interactive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
            onClick={() => interactive && onRate && onRate(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= ((interactive && hoverRating) || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-300 text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  const imageCount = keptImages.length + newImages.length

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
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* Review Summary + filters */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold text-gray-900">
                {summary.average_rating.toFixed(1)}
              </div>
              <div className="mt-1 flex justify-center">{renderStars(Math.round(summary.average_rating))}</div>
              <div className="text-sm text-gray-500 mt-2">
                {summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterChips.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setFilter(chip.value)
                    setPage(1)
                  }}
                  aria-pressed={isActiveFilter(chip.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                    isActiveFilter(chip.value)
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {chip.label}
                  {chip.count !== undefined && ` (${chip.count})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Form */}
      {userData?.user && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
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
                onChange={e => {
                  setComment(e.target.value)
                  if (commentError) setCommentError('')
                }}
                placeholder="Share your thoughts about this product..."
                className={`w-full rounded-lg p-3 focus:outline-none focus:ring-2 min-h-[100px] ${
                  commentError
                    ? 'border border-red-400 focus:ring-red-500'
                    : 'border border-gray-300 focus:ring-blue-500'
                }`}
                rows={4}
              />
              {commentError && (
                <p className="mt-1 text-sm font-medium text-red-600">{commentError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos <span className="font-normal text-gray-500">({imageCount}/{MAX_IMAGES}, JPG/PNG/WebP up to 2MB)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  ...keptImages.map(url => ({
                    url,
                    remove: () => setKeptImages(prev => prev.filter(u => u !== url))
                  })),
                  ...newImages.map(i => ({ url: i.url, remove: () => removeNewImage(i.url) }))
                ].map(img => (
                  <div key={img.url} className="relative w-20 h-20">
                    <img src={img.url} alt="Selected photo" className="w-full h-full object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={img.remove}
                      aria-label="Remove photo"
                      className="absolute -top-2 -right-2 p-0.5 rounded-full bg-gray-800 text-white hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {imageCount < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600 text-xs"
                  >
                    <ImagePlus className="w-5 h-5" />
                    Add photo
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  multiple
                  hidden
                  onChange={handlePickImages}
                />
              </div>
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
                  onClick={resetForm}
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
          {filter.rating || filter.has_images ? 'Filtered Reviews' : 'All Reviews'} ({pagination?.total_count || 0})
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
            <p className="text-gray-500">
              {filter.rating || filter.has_images
                ? 'No reviews match this filter.'
                : 'No reviews yet. Be the first to review this product!'}
            </p>
          </div>
        ) : (
          <>
            {reviews.map(review => {
              const isOwnReview = userData?.user?.id === review.user_id.toString()
              return (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
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
                  {review.images?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.images.map(url => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightbox(url)}
                          aria-label="View photo"
                          className="w-20 h-20 rounded-lg overflow-hidden border hover:opacity-90"
                        >
                          <img src={url} alt="Review photo" loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {review.seller_reply && (
                    <div className="mt-4 rounded-lg bg-gray-50 border-l-4 border-blue-500 p-3">
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-blue-600" />
                        Response from {shopName || 'the seller'}
                        {review.seller_reply_at && (
                          <span className="font-normal text-gray-500">
                            · {formatDate(review.seller_reply_at)}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{review.seller_reply}</p>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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
