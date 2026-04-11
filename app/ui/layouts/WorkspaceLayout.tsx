import React, { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  title: string;
  toolbar?: React.ReactNode;
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  className?: string;
  leftPaneClassName?: string;
  rightPaneClassName?: string;
  leftPaneWidthClass?: string; // New prop for left pane width (e.g., 'lg:col-span-2')
  rightPaneWidthClass?: string; // New prop for right pane width (e.g., 'lg:col-span-10')
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  title,
  toolbar,
  leftPane,
  rightPane,
  className = '',
  leftPaneClassName = '',
  rightPaneClassName = '',
  leftPaneWidthClass, // Destructure new prop
  rightPaneWidthClass, // Destructure new prop
}) => {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
        </div>
        {toolbar && <div className="flex items-center space-x-2 shrink-0 ml-4">{toolbar}</div>}
      </header>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden"> {/* Changed to 12-column grid */}
        <div className={`flex flex-col h-full overflow-y-auto ${leftPaneWidthClass || 'lg:col-span-2'} ${leftPaneClassName}`}>
          {leftPane}
        </div>
        <div className={`flex flex-col h-full overflow-y-auto ${rightPaneWidthClass || 'lg:col-span-10'} ${rightPaneClassName}`}>
          {rightPane}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;