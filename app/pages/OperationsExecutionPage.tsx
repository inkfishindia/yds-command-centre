
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  Button, 
  Select, 
  StatusPill, 
  EmptyState,
  Drawer,
  Tag,
  Table,
  Input,
  MetricCard
} from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import { fetchValues } from '../lib/sheets';
import { 
  Program, Project, Task, Milestone, 
  ProjectStatus, TaskPriority, TaskStatus 
} from '../types';
import { ActivityItem } from '../types/strategy';

const MASTER_SHEET_ID = '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA';

const OperationsExecutionPage: React.FC = () => {
  const { isSignedIn, signIn, isMockMode } = useAuth();
  const { 
    programs, projects, tasks, milestones, team, hubs, teamMemberMap,
    loading: portfolioLoading, loadPortfolioData, saveItem
  } = usePortfolio();

  // Navigation & Filtering
  const [filterProgramId, setFilterProgramId] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterOwnerId, setFilterOwnerId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // UI State
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load Activity Feed
  const loadActivityData = useCallback(async () => {
    if (isMockMode || !isSignedIn) return;
    setLoadingFeed(true);
    try {
      const [updateRes, decisionRes] = await Promise.all([
        fetchValues(MASTER_SHEET_ID, 'WEEKLY UPDATES!A:H'),
        fetchValues(MASTER_SHEET_ID, 'decision log!A:H')
      ]);

      const updates: ActivityItem[] = (updateRes.values?.slice(1) || []).map(row => ({
        id: row[0], type: 'update', date: new Date(row[2]), title: `Update: ${row[1]}`,
        summary: row[5], project_id: row[1], owner: row[7], health: row[4]
      }));

      const decisions: ActivityItem[] = (decisionRes.values?.slice(1) || []).map(row => ({
        id: row[0], type: 'decision', date: new Date(row[2]), title: row[3],
        summary: row[4], project_id: row[1], owner: row[5], impact: row[6]
      }));

      setActivityFeed([...updates, ...decisions].sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (e) {
      console.error("Feed load error", e);
    } finally {
      setLoadingFeed(false);
    }
  }, [isMockMode, isSignedIn]);

  useEffect(() => { loadActivityData(); }, [loadActivityData]);

  // Derived Data
  const filteredProjects = useMemo(() => {
    let result = projects;
    if (filterProgramId) result = result.filter(p => p.programId === filterProgramId);
    if (filterOwnerId) result = result.filter(p => p.ownerId === filterOwnerId);
    if (filterStatus) result = result.filter(p => p.status === filterStatus);
    return result;
  }, [projects, filterProgramId, filterOwnerId, filterStatus]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterProjectId) result = result.filter(t => t.projectId === filterProjectId);
    else if (filterProgramId) {
      const projIds = projects.filter(p => p.programId === filterProgramId).map(p => p.projectId);
      result = result.filter(t => t.projectId && projIds.includes(t.projectId));
    }
    if (filterOwnerId) result = result.filter(t => t.ownerId === filterOwnerId);
    return result;
  }, [tasks, projects, filterProgramId, filterProjectId, filterOwnerId]);

  const kanbanColumns = [ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS, ProjectStatus.BLOCKED, ProjectStatus.COMPLETED];

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Ops Execution Hub">
        <EmptyState title="Secure Terminal Access Required" description="Connect your Google identity to bridge strategy and execution." action={<Button variant="accent" onClick={signIn}>Authorize 🚀</Button>} />
      </ManagerEditorLayout>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-canvas)] overflow-hidden">
      {/* GLOBAL FILTER BAR */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-border-primary)]">
          <span className="text-xl">⚙️</span>
          <h2 className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Execution</h2>
        </div>
        
        <Select 
          options={[{value: 'all', label: 'All Programs'}, ...programs.map(p => ({value: p.programId, label: p.programName}))]} 
          value={filterProgramId || 'all'}
          onChange={v => setFilterProgramId(v === 'all' ? null : v)}
          className="w-48"
        />

        <Select 
          options={[{value: 'all', label: 'All Owners'}, ...team.map(t => ({value: t.id, label: t.fullName}))]} 
          value={filterOwnerId || 'all'}
          onChange={v => setFilterOwnerId(v === 'all' ? null : v)}
          className="w-48"
        />

        <Button variant="secondary" size="sm" onClick={() => loadPortfolioData(true)} disabled={portfolioLoading}>
          {portfolioLoading ? '...' : '🔄 Sync Grid'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* SECTION 1: PROGRAM CARDS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Program Trajectory</h3>
            <span className="text-[10px] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border-primary)]">
              {programs.length} Systems Active
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {programs.map(prog => (
              <div 
                key={prog.programId} 
                onClick={() => setFilterProgramId(filterProgramId === prog.programId ? null : prog.programId)}
                className={`flex-none w-72 p-4 rounded-xl border-2 transition-all cursor-pointer ${filterProgramId === prog.programId ? 'border-[var(--color-brand-primary)] bg-blue-500/5 ring-1 ring-blue-500' : 'border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] hover:border-[var(--color-brand-primary)]'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-xs uppercase tracking-tight text-[var(--color-text-primary)] line-clamp-1">{prog.programName}</h4>
                  <StatusPill status={prog.healthStatus} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                      <span>Progress</span>
                      <span>{prog.timelineProgressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-brand-primary)] transition-all duration-500" style={{width: `${prog.timelineProgressPct}%`}}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-[var(--color-text-secondary)] uppercase">Next</p>
                      <p className="text-[10px] font-bold truncate max-w-[120px]">{prog.nextMilestone || '---'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-[var(--color-text-secondary)] uppercase">Budget</p>
                      <p className="text-[10px] font-bold">₹{(prog.budgetSpent || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2 & 3: KANBAN & TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PROJECT KANBAN */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Project Kanban</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 h-[400px]">
              {kanbanColumns.map(status => {
                const colProjects = filteredProjects.filter(p => p.status === status);
                return (
                  <div key={status} className="flex-none w-64 bg-[var(--color-bg-stage)]/30 rounded-xl p-3 flex flex-col border border-[var(--color-border-primary)]/50">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">{status}</h5>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded">{colProjects.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                      {colProjects.map(proj => (
                        <div 
                          key={proj.projectId} 
                          onClick={() => setFilterProjectId(filterProjectId === proj.projectId ? null : proj.projectId)}
                          className={`p-3 bg-[var(--color-bg-surface)] rounded-lg border-2 shadow-sm cursor-pointer hover:scale-[1.02] transition-all ${filterProjectId === proj.projectId ? 'border-[var(--color-brand-primary)]' : 'border-transparent'}`}
                        >
                          <p className="text-xs font-black uppercase leading-tight text-[var(--color-text-primary)] mb-2">{proj.projectName}</p>
                          <div className="flex justify-between items-center mt-auto pt-2 border-t border-[var(--color-border-primary)]/30">
                            <span className="text-[9px] font-bold text-[var(--color-text-secondary)]">{proj.ownerName}</span>
                            <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">{proj.completionPct}%</span>
                          </div>
                        </div>
                      ))}
                      {colProjects.length === 0 && <div className="p-8 text-center text-[10px] text-[var(--color-text-secondary)] italic">No items</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVITY FEED */}
          <div className="lg:col-span-4">
             <Card title="⚡ Execution Signals" bodyClassName="p-0 overflow-hidden">
                <div className="divide-y divide-[var(--color-border-primary)] max-h-[400px] overflow-y-auto custom-scrollbar">
                  {loadingFeed ? (
                    <div className="p-12 text-center text-xs font-bold uppercase animate-pulse">Splicing Signals...</div>
                  ) : activityFeed.length === 0 ? (
                    <EmptyState title="Silence in the Hub" description="No recent execution signals detected." />
                  ) : activityFeed.map(item => (
                    <div key={item.id} className="p-4 hover:bg-[var(--color-bg-stage)] transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <Tag color={item.type === 'update' ? 'blue' : 'green'}>{item.type.toUpperCase()}</Tag>
                        <span className="text-[9px] font-bold opacity-50">{item.date.toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)]">{item.title}</h4>
                      <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 mt-1 leading-relaxed">{item.summary}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[var(--color-bg-stage)]">{item.owner}</span>
                        {item.health && <StatusPill status={item.health} />}
                      </div>
                    </div>
                  ))}
                </div>
             </Card>
          </div>
        </div>

        {/* SECTION 4: TASK EXECUTION MATRIX */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Task Execution Matrix</h3>
            {filterProjectId && (
              <Button variant="secondary" size="sm" onClick={() => setFilterProjectId(null)}>Reset Filter 🧹</Button>
            )}
          </div>
          <Card bodyClassName="p-0 overflow-hidden">
            <Table headers={['Task Name', 'Project/Context', 'Priority', 'Status', 'Owner', 'Due Date', 'Effort']}>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-sm text-[var(--color-text-secondary)] italic">No tasks match the active filters.</td></tr>
              ) : filteredTasks.map(task => (
                <tr key={task.taskId} className="hover:bg-[var(--color-bg-stage)] cursor-pointer group" onClick={() => setSelectedTask(task)}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{task.taskName}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-1">{task.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Tag color="gray">{task.projectId}</Tag>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={task.priority}>{task.priority}</StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={task.status}>{task.status}</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">
                    {teamMemberMap.get(task.ownerId || '')?.fullName || task.ownerName}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {task.dueDate || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-blue-500">
                    {task.effortHours}h
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </section>
      </div>

      {/* TASK DETAIL DRAWER */}
      <Drawer open={!!selectedTask} onClose={() => setSelectedTask(null)} width="500px" title="Tactical Intelligence">
        {selectedTask && (
          <div className="space-y-6">
            <div className="p-4 bg-[var(--color-bg-stage)] rounded-xl border border-[var(--color-border-primary)]">
              <h3 className="text-xl font-black text-[var(--color-text-primary)] uppercase">{selectedTask.taskName}</h3>
              <div className="flex gap-2 mt-3">
                <StatusPill status={selectedTask.status} />
                <StatusPill status={selectedTask.priority} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest mb-1">Description</h4>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{selectedTask.description || 'No detailed instructions provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-[var(--color-border-primary)] rounded-lg">
                  <h4 className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] mb-1">Contextual Project</h4>
                  <p className="text-xs font-bold">{selectedTask.projectId}</p>
                </div>
                <div className="p-3 border border-[var(--color-border-primary)] rounded-lg">
                  <h4 className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] mb-1">Expected Effort</h4>
                  <p className="text-xs font-bold">{selectedTask.effortHours} Hours</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--color-border-primary)] flex gap-2">
              <Button variant="primary" className="flex-1" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`, '_blank')}>✏️ Update in Sheet</Button>
              <Button variant="secondary" onClick={() => setSelectedTask(null)}>Close</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OperationsExecutionPage;
