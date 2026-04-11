import React from 'react'
import { Drawer, Button, StatusPill } from '../../ui'
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

// Helper to get the display name from any Item type safely
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
  if (!data) return null

  const { type, item } = data
  const config = configMap[type]

  const renderValue = (value: any, fieldName: string) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value === null || value === undefined || String(value).trim() === '') {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>
    }
    // Render StatusPill for known status/priority/health fields
    if (['status', 'priority', 'healthStatus', 'riskLevel', 'onTrackIndicator', 'healthScore', 'isOnTime', 'criticalityLevel'].includes(fieldName)) {
      return <StatusPill status={value}>{String(value)}</StatusPill>;
    }

    // Special handling for owner fields to display full name and make clickable
    const ownerIdFields = ['ownerPersonId', 'ownerId', 'owner_person_id'];
    if (ownerIdFields.includes(fieldName)) {
      const ownerId = value as string;
      const owner = ownerId ? teamMemberMap.get(ownerId) : undefined;
      
      if (owner) {
        return (
          <span
            className="text-[var(--color-brand-primary)] hover:underline cursor-pointer"
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

  const drawerTitle = getItemName(item, type) ? `Details: ${getItemName(item, type)}` : "Item Details"

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={drawerTitle}
      width={450}
    >
      <div className="space-y-4">
        {Object.entries(config.fieldToHeaderMap)
          .map(([field, header]) => {
            return (
            <div key={field}>
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{String(header)}</h4>
              <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                {renderValue((item as any)[field], field)}
              </p>
            </div>
          )})}
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--color-border-primary)] flex space-x-3">
        <Button variant="primary" onClick={() => onEdit(type, item)}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit
        </Button>
        {!isMockMode && (
          <Button variant="destructive" onClick={() => onDelete(type, item)}>
            <span role="img" aria-label="trash" className="mr-2">🗑️</span> Delete
          </Button>
        )}
      </div>
    </Drawer>
  )
}

export default PortfolioItemDetailDrawer;