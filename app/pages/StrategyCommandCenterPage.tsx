
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
  Textarea
} from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import { fetchValues } from '../lib/sheets';
import { 
  StrategicInitiative, 
  StrategicObjective, 
  Goal, 
  QuarterlyInitiative,
  Program,
  TeamMember,
  Hub
} from '../types';
import { GlobalFilterState, ActivityItem } from '../types/strategy';

const MASTER_SHEET_ID = '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA';

const StrategyCommandCenterPage: React.FC = () => {
  const { isSignedIn, signIn, isMockMode } = useAuth();
  const { 
    strategicInitiatives, strategicObjectives, goals, quarterlyInitiatives, 
    programs, team, hubs, teamMemberMap, loading: portfolioLoading, loadPortfolioData,
    saveItem
  } = usePortfolio();

  // Unified Filter State
  const [filters, setFilters] = useState<GlobalFilterState & { 
    program_id: string | null,
    objective_id: string | null,
    initiative_id: string | null,
    goal_id: string | null
  }>({
    segment_id: null,
    owner_person_id: null,
    hub_id: null,
    quarter: null,
    status: null,
    program_id: null,
    objective_id: null,
    initiative_id: null,
    goal_id: null
  });

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [editingItem, setEditingItem] = useState<{type: string, item: any} | null>(null);

  // Helper to update a single filter dimension
  const toggleFilter = (key: keyof typeof filters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value
    }));
  };

  const clearFilters = () => setFilters({
    segment_id: null, owner_person_id: null, hub_id: null, 
    quarter: null, status: null, program_id: null,
    objective_id: null, initiative_id: null, goal_id: null
  });

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

  // MULTI-DIMENSIONAL FILTERING ENGINE
  const filteredData = useMemo(() => {
    let ini = strategicInitiatives;
    let obj = strategicObjectives;
    let gls = goals;
    let tct = quarterlyInitiatives;

    // 1. Filter by Primary Dimensions (Owner, Hub, Segment, Status)
    if (filters.owner_person_id) {
      ini = ini.filter(i => i.ownerPersonId === filters.owner_person_id);
      obj = obj.filter(o => o.ownerPersonId === filters.owner_person_id);
      gls = gls.filter(g => g.ownerPersonId === filters.owner_person_id);
      tct = tct.filter(t => t.ownerPersonId === filters.owner_person_id);
    }

    if (filters.hub_id) {
      obj = obj.filter(o => o.ownerHubId === filters.hub_id);
      gls = gls.filter(g => g.hubId === filters.hub_id);
      tct = tct.filter(t => t.hubId === filters.hub_id);
    }

    if (filters.status) {
      ini = ini.filter(i => i.status === filters.status);
      obj = obj.filter(o => o.status === filters.status);
      gls = gls.filter(g => g.status === filters.status);
      tct = tct.filter(t => t.status === filters.status);
    }

    if (filters.quarter) {
      tct = tct.filter(t => t.quarter === filters.quarter);
    }

    // 2. Cascade Logic (Downstream filtering)
    if (filters.initiative_id) {
      const parent = strategicInitiatives.find(i => i.strategicInitiativeId === filters.initiative_id);
      const childObjIds = parent?.objectiveIds?.split('|') || [];
      obj = obj.filter(o => childObjIds.includes(o.objectiveId));
      gls = gls.filter(g => childObjIds.includes(g.parentObjectiveId || ''));
    }

    if (filters.objective_id) {
      obj = obj.filter(o => o.objectiveId === filters.objective_id);
      gls = gls.filter(g => g.parentObjectiveId === filters.objective_id);
    }

    if (filters.goal_id) {
      gls = gls.filter(g => g.goalId === filters.goal_id);
      tct = tct.filter(t => t.parentGoalIds?.includes(filters.goal_id!));
    }

    // 3. Upstream Sync: If results are narrowed, prune the other lists to show relations
    if (filters.goal_id || filters.objective_id || filters.initiative_id || filters.owner_person_id) {
        const activeObjIds = new Set(obj.map(o => o.objectiveId));
        const activeGoalIds = new Set(gls.map(g => g.goalId));
        
        // Only show tactics linked to active goals
        tct = tct.filter(t => {
            const parents = t.parentGoalIds?.split('|') || [];
            return parents.some(pid => activeGoalIds.has(pid));
        });
    }

    return { initiatives: ini, objectives: obj, goals: gls, tactics: tct };
  }, [filters, strategicInitiatives, strategicObjectives, goals, quarterlyInitiatives]);

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await saveItem(editingItem.type as any, editingItem.item, null);
    setEditingItem(null);
    loadPortfolioData(true);
  };

  const isAnyFilterActive = Object.values(filters).some(v => v !== null);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategy Cockpit">
        <EmptyState title="Executive Access Required" description="Sync the corporate strategy matrix." action={<Button variant="accent" onClick={signIn}>Authorize 🚀</Button>} />
      </ManagerEditorLayout>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-canvas)] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-border-primary)]">
          <span className="text-xl">🛡️</span>
          <h2 className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Cockpit</h2>
        </div>
        
        <Select 
          options={[{value: 'all', label: 'All Owners'}, ...team.map(t => ({value: t.id, label: t.fullName}))]} 
          value={filters.owner_person_id || 'all'}
          onChange={v => toggleFilter('owner_person_id', v === 'all' ? null : v)}
          className="w-48"
        />

        <Select 
          options={[{value: 'all', label: 'All Hubs'}, ...hubs.map(h => ({value: h.id, label: h.name}))]} 
          value={filters.hub_id || 'all'}
          onChange={v => toggleFilter('hub_id', v === 'all' ? null : v)}
          className="w-48"
        />

        {isAnyFilterActive && (
          <Button variant="secondary" size="sm" onClick={clearFilters} className="text-red-500">
            Clear Matrix 🧹
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-[var(--color-text-secondary)]">Sync Pulse:</span>
          <Button variant="secondary" size="sm" onClick={() => loadPortfolioData(true)} disabled={portfolioLoading}>
            {portfolioLoading ? '...' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Level 1: Strategy Cascade */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Strategic Cascade</h3>
            <span className="text-[10px] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border-primary)]">
              {filteredData.initiatives.length} Root Initiatives
            </span>
          </div>
          <div className="space-y-2">
            {filteredData.initiatives.map(ini => (
              <div 
                key={ini.strategicInitiativeId} 
                className={`border rounded-lg overflow-hidden transition-all shadow-sm ${filters.initiative_id === ini.strategicInitiativeId ? 'border-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)] bg-blue-900/5' : 'border-[var(--color-border-primary)] bg-[var(--color-bg-surface)]'}`}
              >
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer group hover:bg-[var(--color-bg-stage)]/30"
                  onClick={() => toggleFilter('initiative_id', ini.strategicInitiativeId)}
                >
                  <span onClick={(e) => toggleExpand(e, ini.strategicInitiativeId)} className="w-6 h-6 flex items-center justify-center hover:bg-black/5 rounded">
                    {expandedNodes.has(ini.strategicInitiativeId) ? '▼' : '▶'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] opacity-40">{ini.strategicInitiativeId}</span>
                      <h4 className="font-black text-sm uppercase tracking-tight text-[var(--color-text-primary)]">{ini.strategicInitiativeName}</h4>
                      <StatusPill status={ini.status}>{ini.status}</StatusPill>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFilter('owner_person_id', ini.ownerPersonId || null); }}
                      className="transition-transform hover:scale-105"
                    >
                      <Tag color="gray">{teamMemberMap.get(ini.ownerPersonId || '')?.fullName || ini.ownerPersonId}</Tag>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingItem({type: 'strategicInitiative', item: ini}); }} className="p-1.5 hover:bg-[var(--color-bg-stage)] rounded opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                  </div>
                </div>

                {expandedNodes.has(ini.strategicInitiativeId) && (
                  <div className="pl-12 pr-4 py-2 bg-[var(--color-bg-canvas)]/50 border-t border-[var(--color-border-primary)]/30 space-y-1">
                    {filteredData.objectives.filter(o => ini.objectiveIds?.includes(o.objectiveId)).map(obj => (
                      <div key={obj.objectiveId} className="group">
                        <div 
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-[var(--color-bg-surface)] ${filters.objective_id === obj.objectiveId ? 'bg-[var(--color-bg-surface)] border-l-4 border-[var(--color-brand-primary)]' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleFilter('objective_id', obj.objectiveId); }}
                        >
                          <div className="flex items-center gap-3">
                            <span onClick={(e) => toggleExpand(e, obj.objectiveId)} className="text-[10px] w-4 text-center">
                              {expandedNodes.has(obj.objectiveId) ? '▼' : '▶'}
                            </span>
                            <span className="text-xs font-bold uppercase">{obj.objectiveName}</span>
                            {/* FIX: Coerce unknown criticalityLevel to string for the cockpit filter dimension */}
                            <button onClick={(e) => { e.stopPropagation(); toggleFilter('status', String(obj.criticalityLevel || '')); }}>
                                <StatusPill status={obj.criticalityLevel}>{obj.criticalityLevel}</StatusPill>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={(e) => { e.stopPropagation(); toggleFilter('hub_id', obj.ownerHubId || null); }}>
                                <Tag color="blue">{hubs.find(h => h.id === obj.ownerHubId)?.name || 'No Hub'}</Tag>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); setEditingItem({type: 'strategicObjective', item: obj}); }} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                          </div>
                        </div>
                        
                        {expandedNodes.has(obj.objectiveId) && (
                          <div className="pl-8 py-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredData.goals.filter(g => g.parentObjectiveId === obj.objectiveId).map(goal => (
                              <div 
                                key={goal.goalId} 
                                className={`p-3 bg-[var(--color-bg-surface)] border rounded shadow-sm transition-all cursor-pointer ${filters.goal_id === goal.goalId ? 'border-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]' : 'border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)]'}`}
                                onClick={(e) => { e.stopPropagation(); toggleFilter('goal_id', goal.goalId); }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="text-[10px] font-black uppercase text-[var(--color-text-primary)] leading-tight">{goal.goalName}</h5>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingItem({type: 'goal', item: goal}); }} className="text-[10px] opacity-20 hover:opacity-100">✏️</button>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[9px] font-bold text-[var(--color-text-secondary)]">
                                        TARGET: <span className="text-[var(--color-brand-primary)]">{goal.targetMetricMar2026}</span>
                                    </div>
                                    {/* FIX: Coerce unknown status to string for the cockpit filter dimension */}
                                    <button onClick={(e) => { e.stopPropagation(); toggleFilter('status', String(goal.status || '')); }}>
                                        <StatusPill status={goal.status} />
                                    </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Execution Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card title="🗓️ Quarterly Execution Path" className="lg:col-span-8 h-[400px]" bodyClassName="overflow-x-auto p-0">
            <div className="min-w-[900px] flex divide-x divide-[var(--color-border-primary)] h-full">
              {Array.from(new Set(quarterlyInitiatives.map(q => q.quarter))).sort().map(q => (
                <div 
                    key={q} 
                    className={`flex-1 p-4 transition-colors ${filters.quarter === q ? 'bg-blue-500/5' : 'bg-[var(--color-bg-canvas)]/20'}`}
                    onClick={() => toggleFilter('quarter', q)}
                >
                  <h5 className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b pb-2 ${filters.quarter === q ? 'text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {q}
                  </h5>
                  <div className="space-y-3">
                    {filteredData.tactics.filter(t => t.quarter === q).map(t => (
                      <div 
                        key={t.initiativeId} 
                        className="p-3 bg-[var(--color-bg-surface)] rounded border-l-4 border-[var(--color-brand-primary)] shadow-sm group cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={(e) => { e.stopPropagation(); setEditingItem({type: 'quarterlyInitiative', item: t}); }}
                      >
                        <p className="text-[11px] font-black uppercase leading-tight group-hover:text-[var(--color-brand-primary)]">{t.initiativeName}</p>
                        <div className="flex justify-between items-center mt-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleFilter('owner_person_id', t.ownerPersonId || null); }}>
                            <span className="text-[9px] font-bold opacity-60 hover:underline">{t.ownerPersonId}</span>
                          </button>
                          <StatusPill status={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="⚡ Signal Stream" className="lg:col-span-4" bodyClassName="p-0 overflow-hidden">
            <div className="divide-y divide-[var(--color-border-primary)] max-h-[400px] overflow-y-auto custom-scrollbar">
              {loadingFeed ? (
                <div className="p-12 text-center text-xs font-bold uppercase animate-pulse">Splicing Signals...</div>
              ) : activityFeed.length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--color-text-secondary)]">No signals detected in current matrix.</div>
              ) : activityFeed.map(item => (
                <div key={item.id} className="p-4 hover:bg-[var(--color-bg-stage)]/50 cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <Tag color={item.type === 'update' ? 'blue' : 'green'}>{item.type.toUpperCase()}</Tag>
                    <span className="text-[9px] font-bold opacity-50">{item.date.toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xs font-black uppercase text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)]">{item.title}</h4>
                  <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 mt-1">{item.summary}</p>
                  <div className="flex justify-between items-center mt-2">
                    <button onClick={() => toggleFilter('owner_person_id', item.owner)}>
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[var(--color-bg-stage)] hover:bg-[var(--color-brand-primary)] hover:text-white transition-colors">{item.owner}</span>
                    </button>
                    {item.health && <StatusPill status={item.health} />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Pivot Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="🚢 Portfolio Pulse Heatmap">
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <Table headers={['Program', 'Status', 'Blockers']}>
                {programs.map(p => (
                    <tr 
                        key={p.programId} 
                        className={`hover:bg-[var(--color-bg-stage)] cursor-pointer ${filters.program_id === p.programId ? 'bg-blue-500/10' : ''}`}
                        onClick={() => toggleFilter('program_id', p.programId)}
                    >
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase">{p.programName}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={p.healthStatus} /></td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-text-secondary)] italic max-w-[200px] truncate">{p.blockers || 'Clear path.'}</td>
                    </tr>
                ))}
                </Table>
            </div>
          </Card>
          
          <Card title="👥 Velocity Distribution">
             <div className="space-y-4 p-2">
                {team.slice(0, 8).map(person => {
                   const count = quarterlyInitiatives.filter(t => t.ownerPersonId === person.id).length;
                   const activeCount = filteredData.tactics.filter(t => t.ownerPersonId === person.id).length;
                   const weight = Math.min(100, (count / 5) * 100);
                   const isActive = filters.owner_person_id === person.id;
                   
                   return (
                     <button 
                        key={person.id} 
                        className={`w-full text-left p-1 rounded transition-colors ${isActive ? 'bg-blue-500/10 ring-1 ring-blue-500' : 'hover:bg-gray-100/5'}`}
                        onClick={() => toggleFilter('owner_person_id', person.id)}
                     >
                        <div className="flex justify-between items-end mb-1">
                          <span className={`text-xs font-black uppercase ${isActive ? 'text-[var(--color-brand-primary)]' : ''}`}>{person.fullName}</span>
                          <span className="text-[9px] font-bold opacity-50">{activeCount} / {count} Sprints</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${isActive ? 'bg-[var(--color-brand-primary)]' : 'bg-gray-400'}`} style={{width: `${weight}%`}}></div>
                        </div>
                     </button>
                   )
                })}
             </div>
          </Card>
        </div>
      </div>

      {/* Edit Drawer */}
      <Drawer open={!!editingItem} onClose={() => setEditingItem(null)} width="500px" title={`Pivot Intelligence: ${editingItem?.type}`}>
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="space-y-6">
            <div className="p-4 bg-[var(--color-bg-stage)] rounded-lg border border-[var(--color-border-primary)] shadow-inner">
              <label className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest mb-1 block">Entity Name</label>
              <Input 
                value={editingItem.item.strategicInitiativeName || editingItem.item.objectiveName || editingItem.item.goalName || editingItem.item.initiativeName || ''} 
                onChange={e => {
                  const keyMap: Record<string, string> = {
                    strategicInitiative: 'strategicInitiativeName',
                    strategicObjective: 'objectiveName',
                    goal: 'goalName',
                    quarterlyInitiative: 'initiativeName'
                  };
                  const key = keyMap[editingItem.type];
                  setEditingItem({...editingItem, item: {...editingItem.item, [key]: e.target.value}});
                }}
              />
            </div>
            <div className="space-y-4">
               <div>
                  <label className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest mb-1 block">Lifecycle Status</label>
                  <Select 
                    options={[{value: 'Active', label: 'Active'}, {value: 'In Progress', label: 'In Progress'}, {value: 'On Hold', label: 'On Hold'}, {value: 'Completed', label: 'Completed'}]} 
                    value={editingItem.item.status || ''} 
                    onChange={v => setEditingItem({...editingItem, item: {...editingItem.item, status: v}})} 
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest mb-1 block">Contextual Rationale</label>
                  <Textarea rows={6} value={editingItem.item.notes || ''} onChange={e => setEditingItem({...editingItem, item: {...editingItem.item, notes: e.target.value}})} />
               </div>
            </div>
            <div className="pt-6 border-t border-[var(--color-border-primary)] flex gap-3">
              <Button type="submit" variant="primary" className="flex-1">Commit to Matrix 💾</Button>
              <Button variant="secondary" onClick={() => setEditingItem(null)}>Dismiss</Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default StrategyCommandCenterPage;
