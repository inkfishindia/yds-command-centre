import React from 'react'
import Modal from './Modal'
import Button from '../atoms/Button'

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, onCancel, onConfirm, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default" }) => {
  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={tone === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  )

  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-md" footer={footer}>
      {body && <p className="text-[var(--color-text-secondary)]">{body}</p>}
    </Modal>
  )
}

export default ConfirmDialog