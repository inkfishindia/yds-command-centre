import React from 'react';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { TaskPriority } from '../../types';
import { Card, EmptyState, StatusPill } from '../../ui';

const DashboardSidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const { events: allEvents, loading: calendarLoading } = useGoogleCalendar();
  const { tasks: allTasks, loading: portfolioLoading } = usePortfolio();

  const priorityTasks = React.useMemo(() => 
    // This comparison now correctly distinguishes between 'High' and 'Urgent'
    allTasks.filter(t => t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT).slice(0, 5), 
  [allTasks]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full w-full flex flex-col gap-6 overflow-y-auto">
      <Card title="🗓️ Today's Snapshot" className="flex-1 flex flex-col" bodyClassName="flex-1 overflow-y-auto !p-2">
        <div className="p-2 space-y-4">
            <div>
                <h3 className="text-md font-semibold text-[var(--color-text-secondary)] mb-2">Upcoming Events</h3>
                {calendarLoading ? <p className="text-sm text-center">Loading events...</p> : allEvents.length > 0 ? (
                <ul className="space-y-2">
                    {allEvents.slice(0, 5).map(event => (
                    <li key={event.id}>
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md bg-[var(--color-bg-stage)] hover:bg-opacity-80">
                        <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{event.summary}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{event.start}</p>
                        </a>
                    </li>
                    ))}
                </ul>
                ) : <EmptyState title="No upcoming events." />}
            </div>
            
            <div>
                <h3 className="text-md font-semibold text-[var(--color-text-secondary)] mt-4 mb-2">⚡ Priority Tasks</h3>
                {portfolioLoading ? <p className="text-sm text-center">Loading tasks...</p> : priorityTasks.length > 0 ? (
                <ul className="space-y-2">
                    {priorityTasks.map(task => (
                    <li key={task.taskId}>
                        <a href="#/portfolio_management/tasks" className="block p-2 rounded-md bg-[var(--color-bg-stage)] hover:bg-opacity-80">
                            <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{task.taskName}</p>
                            <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-[var(--color-text-secondary)]">Due: {task.dueDate || 'N/A'}</p>
                            {task.priority && <StatusPill status={task.priority}>{task.priority}</StatusPill>}
                            </div>
                        </a>
                    </li>
                    ))}
                </ul>
                ) : <EmptyState title="No high-priority tasks." />}
            </div>
        </div>
      </Card>
    </div>
  );
};
export default DashboardSidebar;