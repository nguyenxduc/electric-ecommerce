import { useState } from 'react'
import Modal from './Modal'

// Hop thoai nhap ly do bat buoc (>= 5 ky tu) cho thao tac kiem duyet: go san pham, khoa tai khoan.
// Cha chi render khi can mo, nen o nhap tu xoa sau moi lan dong.
export default function ReasonModal({
  title,
  description,
  templates = [],
  confirmText,
  pending,
  onClose,
  onConfirm
}: {
  title: string
  description?: string
  templates?: string[]
  confirmText: string
  pending?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= 5
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      variant="danger"
      footer={
        <>
          <button className="px-3 py-2 border rounded text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!valid || pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {description && <p className="text-sm text-gray-600">{description}</p>}
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button
                key={t}
                type="button"
                className="px-2 py-1 text-xs border rounded-full hover:bg-gray-50"
                onClick={() => setReason(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <label className="block text-sm text-gray-600">
          Reason (required, at least 5 characters)
          <textarea
            aria-label="Reason"
            className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[90px]"
            value={reason}
            maxLength={500}
            onChange={e => setReason(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  )
}
