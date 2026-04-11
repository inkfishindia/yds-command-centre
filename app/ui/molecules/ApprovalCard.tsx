
import React from 'react'
import Card from './Card'
import Button from '../atoms/Button'
import { Check, X } from 'lucide-react'

interface ApprovalCardProps {
  title: string
  subtitle?: string
  description?: string
  amount?: string | number
  requester?: string
  onApprove: () => void
  onReject: () => void
  className?: string
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  title,
  subtitle,
  description,
  amount,
  requester,
  onApprove,
  onReject,
  className = ''
}) => {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {subtitle}
              </p>
            )}
          </div>
          {amount && (
            <span className="text-lg font-black text-[var(--color-brand-primary)]">
              {amount}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-2">
            {description}
          </p>
        )}

        {requester && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[var(--color-bg-stage)] flex items-center justify-center text-[10px] font-bold">
              {requester[0]}
            </div>
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
              Requested by {requester}
            </span>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button 
            variant="primary" 
            className="flex-1 flex items-center justify-center gap-2 py-2"
            onClick={onApprove}
          >
            <Check size={14} />
            <span>Approve</span>
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1 flex items-center justify-center gap-2 py-2"
            onClick={onReject}
          >
            <X size={14} />
            <span>Reject</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default ApprovalCard
