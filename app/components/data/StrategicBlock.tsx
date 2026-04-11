
import React from 'react';
import { Button, Tag } from '../../ui';

interface StrategicBlockProps {
  children: React.ReactNode;
  className?: string;
}

const StrategicBlock: React.FC<StrategicBlockProps> & {
  Header: React.FC<HeaderProps>;
  Body: React.FC<BodyProps>;
  Footer: React.FC<FooterProps>;
} = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-col h-full bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-[var(--radius-component)] shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

interface HeaderProps {
  title: string;
  emoji?: string;
  onHelper?: () => void;
  onExpand?: () => void;
  onAdd?: () => void; // NEW
  badge?: string | number;
}

const Header: React.FC<HeaderProps> = ({ title, emoji, onHelper, onExpand, onAdd, badge }) => (
  <div className="px-3 py-2 border-b border-[var(--color-border-primary)] flex items-center justify-between bg-[var(--color-bg-canvas)]/50">
    <div className="flex items-center gap-2">
      {emoji && <span className="text-base">{emoji}</span>}
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">{title}</h3>
      {badge !== undefined && (
        <span className="px-1.5 py-0.5 bg-[var(--color-brand-primary)] text-white text-[9px] font-black rounded-full leading-none">
          {badge}
        </span>
      )}
    </div>
    <div className="flex items-center gap-1">
      {onAdd && (
        <button onClick={onAdd} className="w-6 h-6 flex items-center justify-center hover:bg-[var(--color-bg-stage)] rounded transition-colors" title="Quick Add">➕</button>
      )}
      {onHelper && (
        <button onClick={onHelper} className="w-6 h-6 flex items-center justify-center hover:bg-[var(--color-bg-stage)] rounded transition-colors" title="Info">💡</button>
      )}
      {onExpand && (
        <button onClick={onExpand} className="w-6 h-6 flex items-center justify-center hover:bg-[var(--color-bg-stage)] rounded transition-colors" title="Expand">↔️</button>
      )}
    </div>
  </div>
);

interface BodyProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const Body: React.FC<BodyProps> = ({ children, noPadding = false }) => (
  <div className={`flex-1 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'p-3'}`}>
    {children}
  </div>
);

interface FooterProps {
  onEdit?: () => void;
  onAdd?: () => void;
  metrics?: { label: string; value: string | number }[];
}

const Footer: React.FC<FooterProps> = ({ onEdit, onAdd, metrics }) => (
  <div className="px-3 py-1.5 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-stage)]/30 flex items-center justify-between shrink-0">
    <div className="flex gap-3">
      {metrics?.map((m, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-[8px] font-black text-[var(--color-text-secondary)] uppercase tracking-tighter">{m.label}</span>
          <span className="text-[10px] font-bold text-[var(--color-text-primary)] leading-tight">{m.value}</span>
        </div>
      ))}
    </div>
    <div className="flex gap-1.5">
      {onEdit && <button onClick={onEdit} className="text-xs hover:bg-[var(--color-bg-stage)] p-1 rounded">✏️</button>}
      {onAdd && <button onClick={onAdd} className="text-xs hover:bg-[var(--color-bg-stage)] p-1 rounded">➕</button>}
    </div>
  </div>
);

StrategicBlock.Header = Header;
StrategicBlock.Body = Body;
StrategicBlock.Footer = Footer;

export default StrategicBlock;
