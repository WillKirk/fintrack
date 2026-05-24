'use client'

import { cn } from '@/lib/utils'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  dangerous?: boolean
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  dangerous = true,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150 text-white',
              dangerous
                ? 'bg-danger hover:bg-red-600'
                : 'bg-indigo-primary hover:bg-indigo-hover'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}