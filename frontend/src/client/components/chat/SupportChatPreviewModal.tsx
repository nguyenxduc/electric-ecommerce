import { X } from 'lucide-react'

type Props = {
  senderName: string
  createdAt: string
  content: string
  onClose: () => void
}

export default function SupportChatPreviewModal({
  senderName,
  createdAt,
  content,
  onClose
}: Props) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="font-semibold text-gray-900">{senderName}</p>
            <p className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-auto p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-800">{content}</p>
        </div>
      </div>
    </div>
  )
}
