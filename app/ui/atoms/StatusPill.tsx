
import React from 'react'

type DisplayStatus = 'Active' | 'Not Started' | 'In Progress' | 'Blocked' | 'Planned' | 'Paused' | 'Warning' | 'Success';

interface StatusPillProps {
  status: any;
  children?: React.ReactNode;
}

const getDisplayStatusType = (status: any): DisplayStatus => {
  if (status === undefined || status === null) return 'Not Started';
  if (typeof status === 'number') return status >= 90 ? 'Success' : status >= 50 ? 'In Progress' : 'Warning';

  const s = String(status).toLowerCase();

  if (['active', 'completed', 'yes', 'on track', 'scale ready', 'shipped', 'delivered', 'passed'].some(x => s.includes(x))) return 'Active';
  if (['in progress', 'processing', 'production', 'fulfillment', 'awaiting'].some(x => s.includes(x))) return 'In Progress';
  if (['blocked', 'cancelled', 'critical', 'high', 'failed', 'off track', 'no', 'overdue'].some(x => s.includes(x))) return 'Blocked';
  if (['not started', 'planned', 'draft', 'pending'].some(x => s.includes(x))) return 'Not Started';
  if (['on hold', 'paused'].some(x => s.includes(x))) return 'Paused';
  if (['at risk', 'warning', 'low stock', 'due soon'].some(x => s.includes(x))) return 'Warning';

  return 'Not Started';
};

const StatusPill: React.FC<StatusPillProps> = ({ status, children }) => {
  const displayStatus = getDisplayStatusType(status);

  const statusStyles: Record<DisplayStatus, { bg: string; text: string; border: string }> = {
    'Active': { bg: 'var(--color-tag-green-bg)', text: 'var(--color-tag-green-text)', border: 'rgba(6, 95, 70, 0.1)' },
    'In Progress': { bg: 'var(--color-tag-blue-bg)', text: 'var(--color-tag-blue-text)', border: 'rgba(30, 64, 175, 0.1)' },
    'Not Started': { bg: 'var(--color-tag-gray-bg)', text: 'var(--color-tag-gray-text)', border: 'rgba(55, 65, 81, 0.1)' },
    'Planned': { bg: 'var(--color-tag-gray-bg)', text: 'var(--color-tag-gray-text)', border: 'rgba(55, 65, 81, 0.1)' },
    'Paused': { bg: 'var(--color-tag-gray-bg)', text: 'var(--color-tag-gray-text)', border: 'rgba(55, 65, 81, 0.1)' },
    'Blocked': { bg: 'var(--color-destructive)', text: 'var(--color-destructive-fg)', border: 'rgba(0, 0, 0, 0.1)' },
    'Warning': { bg: 'var(--color-note-orange-bg)', text: 'var(--color-note-orange-text)', border: 'rgba(194, 65, 12, 0.1)' },
    'Success': { bg: 'var(--color-tag-green-bg)', text: 'var(--color-tag-green-text)', border: 'rgba(6, 95, 70, 0.1)' },
  }

  const style = statusStyles[displayStatus] || statusStyles['Not Started'];

  return (
    <span
      className="px-1.5 py-0.5 inline-flex text-[9px] uppercase tracking-wider font-black rounded border whitespace-nowrap"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border
      }}
    >
      {children || String(status)}
    </span>
  )
}

export default StatusPill
