
import React from 'react'
import { NavMainItem } from '../../navigation'

interface SidebarProps {
  mainNavItems: NavMainItem[]
  activeMainId: string
  onNavigate: (pageId: string) => void
  isCollapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ mainNavItems, activeMainId, onNavigate, isCollapsed, onToggle }) => {
  const renderNavItem = (item: NavMainItem) => (
    <a
      key={item.id}
      href={`#/${item.id}/${item.subItems.length > 0 ? item.subItems[0].id : item.id}`}
      title={isCollapsed ? item.label : undefined}
      onClick={(e) => { e.preventDefault(); onNavigate(item.id) }}
      className={`flex items-center px-3 py-2 text-sm rounded-[var(--radius-component)] transition-all duration-200 border-2 ${activeMainId === item.id
          ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)] shadow-sm'
          : 'text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-stage)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)]/50'
        } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <span className={`text-base ${!isCollapsed ? 'mr-3' : ''}`}>{item.emoji}</span>
      {!isCollapsed && <span className="uppercase tracking-widest text-[9px] font-black whitespace-nowrap">{item.label}</span>}
    </a>
  )

  const logoSrc = isCollapsed
    ? "https://www.yourdesignstore.in/assets/img/YDS-Favicon.png"
    : "https://www.yourdesignstore.in/assets/v2/img/logo_yds.svg";
  
  const logoAlt = isCollapsed ? "YDS Labs Favicon" : "YDS Labs Logo";
  const logoClass = isCollapsed ? "w-6 h-6" : "h-6";

  return (
    <aside className={`bg-[var(--color-bg-surface)] border-r border-[var(--color-border-primary)] flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
      <div className={`h-16 flex items-center shrink-0 px-4 border-b border-[var(--color-border-primary)] ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <img src={logoSrc} alt={logoAlt} className={logoClass} />
        {!isCollapsed && <span className="ml-2 text-[10px] font-black bg-[var(--color-brand-accent)] text-[var(--color-brand-accent-fg)] px-1.5 py-0.5 rounded uppercase tracking-tighter">Lab</span>}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <nav className="px-3 py-6 space-y-2">
          {mainNavItems.map(renderNavItem)}
        </nav>
      </div>
      <div className="p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-stage)]/20">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-stage)] transition-all text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-widest shadow-sm"
          aria-label={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
        >
          {isCollapsed ? '▶' : '◀ COLLAPSE'}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar;
