
import React from 'react'
import Drawer from '../molecules/Drawer';
import Button from '../atoms/Button';
import StatusPill from '../atoms/StatusPill';
import {
  Program, Project, Task, Milestone, TeamMember,
  StrategicInitiative, StrategicObjective, Goal, QuarterlyInitiative, ResourceAllocationBudget,
} from '../../types'
import { PROGRAMS_SHEET_CONFIG } from '../../src/config/programSheetConfig'
import { PROJECTS_SHEET_CONFIG } from '../../src/config/projectSheetConfig'
import { TASKS_SHEET_CONFIG } from '../../src/config/taskSheetConfig'
import { MILESTONES_SHEET_CONFIG } from '../../src/config/milestoneSheetConfig'
import { STRATEGIC_INITIATIVE_SHEET_CONFIG } from '../../src/config/strategicInitiativeSheetConfig';
import { STRATEGIC_OBJECTIVE_SHEET_CONFIG } from '../../src/config/strategicObjectiveSheetConfig';
import { GOAL_SHEET_CONFIG } from '../../src/config/goalSheetConfig';
import { QUARTERLY_INITIATIVE_SHEET_CONFIG } from '../../src/config/quarterlyInitiativeSheetConfig';
import { RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG } from '../../src/config/resourceAllocationBudgetSheetConfig';
import { usePortfolio } from '../../contexts/PortfolioContext';

type ItemType = 'program' | 'project' | 'task' | 'milestone' | 'strategicInitiative' | 'strategicObjective' | 'goal' | 'quarterlyInitiative' | 'resourceAllocationBudget';
type Item = Program | Project | Task | Milestone | StrategicInitiative | StrategicObjective | Goal | QuarterlyInitiative | ResourceAllocationBudget;

interface PortfolioItemDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (type: ItemType, item: Item) => void
  onDelete: (type: ItemType, item: Item) => void
  data: { type: ItemType; item: Item } | null
  isMockMode: boolean
  teamMemberMap: Map<string, TeamMember>
  onViewTeamMemberDetails: (member: TeamMember) => void
}

const configMap = {
  program: PROGRAMS_SHEET_CONFIG,
  project: PROJECTS_SHEET_CONFIG,
  task: TASKS_SHEET_CONFIG,
  milestone: MILESTONES_SHEET_CONFIG,
  strategicInitiative: STRATEGIC_INITIATIVE_SHEET_CONFIG,
  strategicObjective: STRATEGIC_OBJECTIVE_SHEET_CONFIG,
  goal: GOAL_SHEET_CONFIG,
  quarterlyInitiative: QUARTERLY_INITIATIVE_SHEET_CONFIG,
  resourceAllocationBudget: RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG,
}

const getItemName = (item: Item, type: ItemType): string => {
    switch (type) {
        case 'program': return (item as Program).programName || '';
        case 'project': return (item as Project).projectName || '';
        case 'task': return (item as Task).taskName || '';
        case 'milestone': return (item as Milestone).milestoneName || '';
        case 'strategicInitiative': return (item as StrategicInitiative).strategicInitiativeName || '';
        case 'strategicObjective': return (item as StrategicObjective).objectiveName || '';
        case 'goal': return (item as Goal).goalName || '';
        case 'quarterlyInitiative': return (item as QuarterlyInitiative).initiativeName || '';
        case 'resourceAllocationBudget': return (item as ResourceAllocationBudget).budgetCategory || '';
        default: return '';
    }
};

const PortfolioItemDetailDrawer: React.FC<PortfolioItemDetailDrawerProps> = ({ isOpen, onClose, onEdit, onDelete, data, isMockMode, teamMemberMap, onViewTeamMemberDetails }) => {
  const portfolio = usePortfolio();
  
  if (!data) return null

  const { type, item } = data
  const config = configMap[type]

  // Single Source of Truth: Resolve which Sheet ID corresponds to this specific UI section
  const getSheetId = () => {
    switch(type) {
      case 'program': return portfolio.programSheetId;
      case 'project': return portfolio.projectSheetId;
      case 'task': return portfolio.taskSheetId;
      case 'milestone': return portfolio.milestoneSheetId;
      case 'strategicInitiative': return portfolio.strategicInitiativeSheetId;
      case 'strategicObjective': return portfolio.strategicObjectiveSheetId;
      case 'goal': return portfolio.goalSheetId;
      case 'quarterlyInitiative': return portfolio.quarterlyInitiativeSheetId;
      case 'resourceAllocationBudget': return portfolio.resourceAllocationBudgetSheetId;
      default: return null;
    }
  };

  const sheetId = getSheetId();
  const sourceUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${config.gid}` : null;

  const renderValue = (value: any, fieldName: string) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value === null || value === undefined || String(value).trim() === '') {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>
    }
    if (['status', 'priority', 'healthStatus', 'riskLevel', 'onTrackIndicator', 'healthScore', 'isOnTime', 'criticalityLevel'].includes(fieldName)) {
      return <StatusPill status={value}>{String(value)}</StatusPill>;
    }

    const ownerIdFields = ['ownerPersonId', 'ownerId', 'owner_person_id'];
    if (ownerIdFields.includes(fieldName)) {
      const ownerId = value as string;
      const owner = ownerId ? teamMemberMap.get(ownerId) : undefined;
      
      if (owner) {
        return (
          <span
            className="text-[var(--color-brand-primary)] hover:underline cursor-pointer font-medium"
            onClick={(e) => { e.stopPropagation(); onViewTeamMemberDetails(owner); }}
            aria-label={`View details for ${owner.fullName}`}
          >
            {owner.fullName}
          </span>
        );
      }
      return String(value) || <span className="text-[var(--color-text-secondary)] italic">Not set</span>;
    }

    return String(value)
  }

  // Visual appearance: Added a prominent source link icon to the title area
  const drawerTitle = (
    <div className="flex items-center justify-between w-full pr-8">
      <span className="truncate max-w-[280px]">{getItemName(item, type) || "Item Details"}</span>
      {sourceUrl && !isMockMode && (
        <a 
          href={sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--color-bg-stage)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] border border-[var(--color-border-primary)] rounded transition-all"
          title="Jump to Data Source in Google Sheets"
        >
          <span>Sheets</span>
          <span className="text-xs">📊</span>
        </a>
      )}
    </div>
  );

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={drawerTitle as any}
      width={450}
    >
      <div className="space-y-5">
        {Object.entries(config.fieldToHeaderMap)
          .map(([field, header]) => {
            return (
            <div key={field} className="border-b border-[var(--color-border-primary)]/30 pb-3 last:border-0">
              <h4 className="text-[10px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest mb-1">{String(header)}</h4>
              <div className="text-sm text-[var(--color-text-primary)] break-words whitespace-pre-wrap leading-relaxed">
                {renderValue((item as any)[field], field)}
              </div>
            </div>
          )})}
      </div>

      <div className="mt-10 pt-5 border-t border-[var(--color-border-primary)] flex gap-3">
        <Button variant="primary" className="flex-1" onClick={() => onEdit(type, item)}>
          <span className="mr-2">✏️</span> Edit Detail
        </Button>
        {!isMockMode && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(type, item)}>
            <span className="mr-2">🗑️</span> Clear
          </Button>
        )}
      </div>
    </Drawer>
  )
}

export default PortfolioItemDetailDrawer;
