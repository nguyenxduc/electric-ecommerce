import React from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'danger'
}

export default function Modal({ open, onClose, title, children, footer, variant = 'default' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded border bg-white shadow ${variant === 'danger' ? 'border-red-300' : ''}`}>
        {title ? (
          <div className={`px-4 py-3 border-b ${variant === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50'}`}>
            <div className="text-sm font-semibold">{title}</div>
          </div>
        ) : null}
        <div className="p-4">{children}</div>
        {footer ? <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}


