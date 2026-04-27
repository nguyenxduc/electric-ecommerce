// @ts-ignore
import React, { useEffect, useRef } from 'react'

interface StatusModalProps {
  open: boolean
  type: 'success' | 'error'
  message: string
  description: string
  onClose: () => void
}

export default function StatusModal({
  open,
  type,
  message,
  description,
  onClose
}: StatusModalProps) {
  const isSuccess = type === 'success'

  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
    first?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* card */}
      <div
        className={`relative z-10 bg-white rounded-2xl p-8 shadow-2xl w-[360px] text-center animate-fadeIn`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={`mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full ${
            isSuccess
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {isSuccess ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <h2
          className={`text-2xl font-semibold ${isSuccess ? 'text-green-700' : 'text-red-700'}`}
        >
          {message}
        </h2>
        <p className="mt-2 text-gray-600 text-sm">{description}</p>

        <button
          onClick={onClose}
          className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          OK
        </button>
      </div>
    </div>
  )
}
