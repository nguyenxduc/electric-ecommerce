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

  const renderStars = (
    value: number,
    interactive: boolean = false,
    onRate?: (rating: number) => void,
    size = 'h-4 w-4'
  ) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          aria-label={interactive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
          onClick={() => interactive && onRate && onRate(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
        >
          <Star
            className={`${size} ${
              star <= ((interactive && hoverRating) || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  )

  const imageCount = keptImages.length + newImages.length
  const total = stats?.totalReviews ?? summary?.total_reviews ?? 0
  const isFiltered = !!(filter.rating || filter.has_images)
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm transition-colors ${
      active ? 'bg-ink font-medium text-white' : 'text-gray-600 ring-1 ring-inset ring-gray-200 hover:ring-ink hover:text-ink'
    }`

  // Bo cuc 2 cot: trai = diem trung binh + phan bo sao (bam de loc); phai = form
  // viet danh gia + danh sach. Khong khung trang; cac danh gia ngan bang duong
  // ke ngang mong, cung kieu bang thong so.
  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14">
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

      {/* Tom tat + loc */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h3 className="eyebrow mb-3">Customer reviews</h3>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold leading-none tracking-tight text-ink">
            {(summary?.average_rating ?? 0).toFixed(1)}
          </span>
          <div className="pb-1">
            {renderStars(Math.round(summary?.average_rating ?? 0))}
            <p className="mt-1 text-xs text-gray-500">
              {total} {total === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>

        {/* Phan bo sao: moi hang la nut loc theo so sao */}
        <div className="mt-6 space-y-1">
          {[5, 4, 3, 2, 1].map(star => {
            const count = starCount(star)
            const pct = total ? Math.round((count / total) * 100) : 0
            const active = filter.rating === star
            return (
              <button
                key={star}
                type="button"
                aria-pressed={active}
                aria-label={`${star} star reviews (${count})`}
                disabled={count === 0 && !active}
                onClick={() => {
                  setFilter(active ? {} : { rating: star })
                  setPage(1)
                }}
                className={`group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors disabled:cursor-default disabled:opacity-40 ${
                  active ? 'bg-paper' : 'hover:bg-paper'
                }`}
              >
                <span className={`flex w-8 shrink-0 items-center gap-1 ${active ? 'font-semibold text-ink' : 'text-gray-600'}`}>
                  {star}
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className="block h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right tabular-nums text-gray-500">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filterChips
            .filter(c => !c.value.rating)
            .map(c => (
              <button
                key={c.label}
                type="button"
                aria-pressed={isActiveFilter(c.value)}
                onClick={() => {
                  setFilter(c.value)
                  setPage(1)
                }}
                className={chip(isActiveFilter(c.value))}
              >
                {c.label}
                {c.count !== undefined && ` (${c.count})`}
              </button>
            ))}
        </div>
      </aside>

      <div className="min-w-0 space-y-10">
        {/* Form viet / sua danh gia */}
        {userData?.user && (
          <div className="rounded-3xl p-5 ring-1 ring-gray-200 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                {editingReview ? 'Edit your review' : 'Write a review'}
              </h3>
              {renderStars(rating, true, setRating, 'h-6 w-6')}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="review-comment" className="sr-only">Your review</label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={e => {
                    setComment(e.target.value)
                    if (commentError) setCommentError('')
                  }}
                  placeholder="What did you like or dislike? How are you using it?"
                  className={`min-h-[110px] w-full rounded-2xl bg-white p-3.5 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 ring-1 ring-inset ${
                    commentError ? 'ring-red-400 focus:ring-red-500' : 'ring-gray-200 focus:ring-ink'
                  }`}
                  rows={4}
                />
                {commentError && <p className="mt-1.5 text-sm font-medium text-red-600">{commentError}</p>}
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500">
                  Photos ({imageCount}/{MAX_IMAGES}) · JPG, PNG or WebP up to 2MB
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ...keptImages.map(url => ({
                      url,
                      remove: () => setKeptImages(prev => prev.filter(u => u !== url))
                    })),
                    ...newImages.map(i => ({ url: i.url, remove: () => removeNewImage(i.url) }))
                  ].map(img => (
                    <div key={img.url} className="relative h-16 w-16">
                      <img src={img.url} alt="Selected photo" className="h-full w-full rounded-xl object-cover ring-1 ring-gray-200" />
                      <button
                        type="button"
                        onClick={img.remove}
                        aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageCount < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-gray-300 text-[11px] text-gray-500 hover:border-ink hover:text-ink"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={createReviewMutation.isPending || updateReviewMutation.isPending || rating === 0}
                  className="btn-primary"
                >
                  <Send className="h-4 w-4" />
                  {editingReview ? 'Update Review' : 'Submit Review'}
                </button>
                {editingReview && (
                  <button onClick={resetForm} className="btn-secondary">
                    Cancel
                  </button>
                )}
                {rating === 0 && <span className="text-xs text-gray-500">Pick a star rating to submit.</span>}
              </div>
            </div>
          </div>
        )}

        {/* Danh sach danh gia */}
        <section>
          <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink">
            {isFiltered ? 'Filtered reviews' : 'All reviews'}{' '}
            <span className="font-normal text-gray-400">({pagination?.total_count || 0})</span>
          </h3>

          {isLoading ? (
            <div className="divide-y divide-gray-200">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-2 py-6">
                  <div className="h-4 w-1/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl px-6 py-12 text-center ring-1 ring-gray-200">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                {isFiltered ? 'No reviews match this filter.' : 'No reviews yet. Be the first to review this product!'}
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 border-y border-gray-200">
                {reviews.map(review => {
                  const isOwnReview = userData?.user?.id === review.user_id.toString()
                  return (
                    <li key={review.id} className="py-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-sm font-semibold text-ink ring-1 ring-gray-200">
                            {review.user.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {review.user.name}
                              {isOwnReview && <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              {renderStars(review.rating || 0, false, undefined, 'h-3.5 w-3.5')}
                              <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        {isOwnReview && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditReview(review)}
                              className="rounded-full p-2 text-gray-400 hover:bg-paper hover:text-ink"
                              title="Edit review"
                              aria-label="Edit review"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ id: review.id, name: review.user.name })}
                              className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete review"
                              aria-label="Delete review"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {review.comment && (
                        <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-gray-700">{review.comment}</p>
                      )}
                      {review.images?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.images.map(url => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setLightbox(url)}
                              aria-label="View photo"
                              className="h-20 w-20 overflow-hidden rounded-xl ring-1 ring-gray-200 transition-opacity hover:opacity-90"
                            >
                              <img src={url} alt="Review photo" loading="lazy" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {review.seller_reply && (
                        <div className="mt-4 rounded-2xl bg-paper p-4">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <Store className="h-4 w-4" />
                            Response from {shopName || 'the seller'}
                            {review.seller_reply_at && (
                              <span className="font-normal text-gray-500">· {formatDate(review.seller_reply_at)}</span>
                            )}
                          </p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-gray-700">{review.seller_reply}</p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !px-4 !py-2"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary !px-4 !py-2"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default ReviewComponent
