import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Tone = 'info' | 'danger'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  tone?: Tone
  confirmClassName?: string
  onConfirm?: () => void
  onClose: () => void
  // Noi dung them giua mo ta va nut (vd. o chon ly do)
  children?: ReactNode
  confirmDisabled?: boolean
}

const ConfirmModal = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'info',
  confirmClassName,
  onConfirm,
  onClose,
  children,
  confirmDisabled
}: Props) => {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const confirmClasses =
    confirmClassName ||
    (tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-blue-600 hover:bg-blue-700')

  // Portal ra body: modal co the duoc render ben trong header (Navbar), ma header
  // co backdrop-blur -> position:fixed bi gioi han trong khung header.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        {children}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm?.()
            }}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${confirmClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmModal
